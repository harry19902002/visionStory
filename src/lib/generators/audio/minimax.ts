import { BaseAudioGenerator, type AudioGenerateParams, type GenerateResult } from '../base'
import { getProviderConfig } from '@/lib/api-config'

export class MinimaxTTSGenerator extends BaseAudioGenerator {
  protected async doGenerate(params: AudioGenerateParams): Promise<GenerateResult> {
    const { userId, text, voice = 'male-qn-qingse', rate = 1.0, options } = params
    const modelId = typeof options?.modelId === 'string' ? options.modelId : 'speech-01-hd'
    const { apiKey } = await getProviderConfig(userId, 'minimax')

    const body = {
      model: modelId,
      text,
      stream: false,
      output_format: 'url',
      "voice_setting": {
        "voice_id": voice,
        "speed": typeof options?.speed === 'number' ? options.speed : rate,
        "vol": typeof options?.vol === 'number' ? options.vol : 1.0,
        "pitch": typeof options?.pitch === 'number' ? options.pitch : 0
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: 'mp3',
        channel: 1
      }
    }

    const response = await fetch('https://api.minimaxi.com/v1/t2a_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Minimax TTS failed (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    
    // Check if the base_resp indicates success
    if (data.base_resp?.status_code !== 0) {
      throw new Error(`Minimax TTS error: ${data.base_resp?.status_msg || 'Unknown error'}`)
    }

    const audioUrl = data.data?.audio
    if (!audioUrl) {
      throw new Error('Minimax TTS returned no audio URL')
    }

    return {
      success: true,
      audioUrl,
    }
  }
}
