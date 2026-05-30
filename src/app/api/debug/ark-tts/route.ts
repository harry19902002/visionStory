import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { apiKey, resourceId, text, speaker, modelName, emotion, rate = 1.0, vol = 1.0 } = body

    if (!apiKey || !resourceId || !text || !speaker) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const payload = {
      user: {
        uid: 'debugger_user',
      },
      req_params: {
        text,
        speaker,
        ...(modelName ? { model: modelName } : {}),
        ...(emotion ? { emotion } : {}),
        audio_params: {
          format: 'mp3',
          sample_rate: 24000,
          speech_rate: rate === 1.0 ? 0 : Math.round((rate - 1.0) * 100),
          loudness_rate: vol === 1.0 ? 0 : Math.max(-50, Math.min(100, Math.round((vol - 1.0) * 100))),
        }
      }
    }

    const response = await fetch('https://openspeech.bytedance.com/api/v3/tts/unidirectional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        'X-Api-Resource-Id': resourceId,
      },
      body: JSON.stringify(payload),
    })

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const rawText = await response.text()
      try {
        const data = JSON.parse(rawText)
        return NextResponse.json(data, { status: response.status })
      } catch {
        // If it failed to parse, it might be multiple concatenated JSON objects (chunked)
        return new NextResponse(rawText, {
          status: response.status,
          headers: { 'Content-Type': 'text/plain' }
        })
      }
    } else {
      // If it returns raw bytes (which it shouldn't for this endpoint, but just in case)
      const buffer = await response.arrayBuffer()
      return new NextResponse(buffer, {
        status: response.status,
        headers: {
          'Content-Type': contentType || 'audio/mpeg',
        }
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
