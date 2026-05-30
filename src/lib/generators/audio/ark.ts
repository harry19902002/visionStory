import { BaseAudioGenerator, type AudioGenerateParams, type GenerateResult } from '../base'
import { getProviderConfig } from '@/lib/api-config'
import { uploadObject, generateUniqueKey } from '@/lib/storage'
import { logInfo as _ulogInfo, logError as _ulogError } from '@/lib/logging/core'

export async function synthesizeWithArkTTS(params: {
  text: string
  modelId: string
  voiceId: string
  rate?: number
  pitch?: number
  vol?: number
  instruction?: string
  userId: string
  apiKey: string
  resourceId?: string
}): Promise<{ audioData: Buffer }> {
  const { userId, text, modelId, voiceId, rate = 1.0, pitch = 0, vol = 1.0, instruction, apiKey } = params

  let resourceId = params.resourceId || modelId
  let reqModelName: string | undefined = undefined
  if (modelId.includes('|')) {
    const parts = modelId.split('|')
    resourceId = parts[0]
    reqModelName = parts[1]
  }

  // Auto-map well-known models to their public resource IDs if no custom endpoint is provided
  if (!params.resourceId || params.resourceId === modelId) {
    if (resourceId === 'seed-tts-2.0-expressive' || resourceId === 'seed-tts-2.0-standard') {
      resourceId = 'seed-tts-2.0'
    }
  }

  const body = {
    user: {
      uid: userId,
    },
    req_params: {
      text,
      model: reqModelName || 'seed-tts-2.0-expressive',
      speaker: voiceId,
      ...(instruction ? { emotion: instruction } : {}),
      audio_params: {
        format: 'wav',
        sample_rate: 24000,
        speech_rate: rate === 1.0 ? 0 : Math.round((rate - 1.0) * 100),
        pitch_rate: pitch,
        loudness_rate: vol === 1.0 ? 0 : Math.max(-50, Math.min(100, Math.round((vol - 1.0) * 100))),
      }
    }
  }

  _ulogInfo(`[ARK Voice] Generating voice: resourceId=${resourceId}, model=${reqModelName || 'seed-tts-2.0-expressive'}, speaker=${voiceId}, instruction=${instruction}`)

  let response: Response | undefined
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
          'X-Api-Resource-Id': resourceId,
        },
        body: JSON.stringify(body),
      })
      
      if (response.ok) {
        break
      }
      
      const errorText = await response.text()
      _ulogError(`[ARK Voice] attempt ${attempt} failed (${response.status}):`, errorText)
      
      if ((response.status === 504 || response.status === 502 || response.status === 429) && attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 2000))
        continue
      }
      
      throw new Error(`ARK TTS failed (${response.status}): ${errorText}`)
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e))
      lastError = err
      if (attempt < 3 && (err.name === 'AbortError' || err.message?.includes('fetch failed') || err.message?.includes('socket'))) {
        _ulogError(`[ARK Voice] attempt ${attempt} network error:`, err.message)
        await new Promise(r => setTimeout(r, attempt * 2000))
        continue
      }
      throw e
    }
  }

  if (!response || !response.ok) {
    throw lastError || new Error('ARK TTS failed after retries')
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer())
  let audioBuffer: Buffer

  // If it starts with '{' or 'data:', it's likely JSON or SSE
  const isTextPayload = rawBuffer[0] === 123 /* { */ || rawBuffer.slice(0, 5).toString() === 'data:'
  
  if (isTextPayload) {
    const rawText = rawBuffer.toString('utf-8')
    let data: Record<string, unknown>
    const audioBuffers: Buffer[] = []

    try {
      data = JSON.parse(rawText)
      const base64Str = data.data || data.audio || data.audio_content
      if (base64Str && typeof base64Str === 'string') {
        audioBuffers.push(Buffer.from(base64Str, 'base64'))
      }
    } catch {
      const parts = rawText.split(/\n|(?=\{"(?:code|reqid|header)":)/).filter(p => p.trim())
      const parsedParts = []
      for (let p of parts) {
        if (p.startsWith('data:')) p = p.slice(5).trim()
        if (!p) continue
        try {
          const parsed = JSON.parse(p)
          parsedParts.push(parsed)
          const chunkBase64 = parsed.data || parsed.audio || parsed.audio_content
          if (chunkBase64 && typeof chunkBase64 === 'string') audioBuffers.push(Buffer.from(chunkBase64, 'base64'))
        } catch {}
      }
      if (parsedParts.length === 0) {
        throw new Error(`ARK TTS error: Failed to parse response: ${rawText.slice(0, 100)}`)
      }
      data = parsedParts[parsedParts.length - 1]
    }

    const code = data.code || data.status_code
    if (code && code !== 20000000 && code !== 0) {
       throw new Error(`ARK TTS error: ${data.message} (${code})`)
    }
    
    if (audioBuffers.length === 0) {
       throw new Error('ARK TTS returned JSON without audio data')
    }
    audioBuffer = Buffer.concat(audioBuffers)
  } else {
    // Direct binary stream
    audioBuffer = rawBuffer
  }

  if (!audioBuffer || audioBuffer.length === 0) {
    throw new Error('ARK TTS returned empty audio buffer')
  }

  return { audioData: audioBuffer }
}

export class ArkTTSGenerator extends BaseAudioGenerator {
  protected async doGenerate(params: AudioGenerateParams): Promise<GenerateResult> {
    const { userId, text, voice = 'seed-tts-2.0-expressive', rate = 1.0, options } = params
    
    const modelId = typeof options?.modelId === 'string' ? options.modelId : 'seed-tts-2.0-expressive'
    
    let apiKey, baseUrl;
    try {
      const conf = await getProviderConfig(userId, 'ark-speech')
      if (conf.apiKey) {
        apiKey = conf.apiKey
        baseUrl = conf.baseUrl
      }
    } catch {}

    if (!apiKey) {
      const conf = await getProviderConfig(userId, 'ark')
      apiKey = conf.apiKey
      baseUrl = conf.baseUrl
    }

    const result = await synthesizeWithArkTTS({
      text,
      modelId,
      voiceId: voice,
      rate,
      userId,
      apiKey,
      resourceId: baseUrl || undefined
    })

    const storageKey = generateUniqueKey('voice/ark', 'mp3')
    await uploadObject(result.audioData, storageKey, 3, 'audio/mpeg')
    _ulogInfo(`[ARK Voice] Uploaded voice to storage: ${storageKey}`)

    return {
      success: true,
      audioUrl: storageKey,
    }
  }
}
