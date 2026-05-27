import { Buffer } from 'buffer'

export interface MinimaxVoiceParams {
    text: string
    model?: string // default speech-2.8-hd
    voiceId: string
    speed?: number
    vol?: number
    pitch?: number
    emotion?: string | null
    apiKey: string
}

export async function synthesizeWithMinimaxTTS(params: MinimaxVoiceParams): Promise<{ audioData: Buffer; audioDuration: number }> {
    const { text, model = 'speech-2.8-hd', voiceId, speed = 1.0, vol = 1.0, pitch = 0, emotion, apiKey } = params

    const url = 'https://api.minimaxi.com/v1/t2a_v2'

    const voice_setting: Record<string, unknown> = {
        voice_id: voiceId,
        speed,
        vol,
        pitch,
    }

    if (emotion) {
        voice_setting.emotion = emotion
    }

    const payload = {
        model,
        text,
        stream: false,
        voice_setting,
        audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
            channel: 1,
        },
        output_format: 'hex',
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
    })

    if (!response.ok) {
        const errText = await response.text()
        throw new Error(`MiniMax API Error (${response.status}): ${errText}`)
    }

    const data = await response.json()

    if (data.base_resp?.status_code !== 0) {
        throw new Error(`MiniMax TTS Error: [${data.base_resp?.status_code}] ${data.base_resp?.status_msg}`)
    }

    const hexAudio = data.data?.audio
    if (!hexAudio) {
        throw new Error('MiniMax API returned no audio data')
    }

    const audioData = Buffer.from(hexAudio, 'hex')
    const audioDuration = data.extra_info?.audio_length || 0 // duration in ms

    return {
        audioData,
        audioDuration: audioDuration / 1000, // convert to seconds
    }
}
