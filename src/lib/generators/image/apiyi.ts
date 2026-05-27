import { getProviderConfig } from '@/lib/api-config'
import { getInternalBaseUrl } from '@/lib/env'
import { getImageBase64Cached } from '@/lib/image-cache'
import { BaseImageGenerator, type GenerateResult, type ImageGenerateParams } from '../base'
import { setProxy } from '../../../../lib/prompts/proxy'

type ApiyiContentPart = { inlineData: { mimeType: string; data: string } } | { text: string }

type ApiyiOptions = {
  aspectRatio?: string
  resolution?: string
  provider?: string
  modelId?: string
  modelKey?: string
}

function toAbsoluteUrlIfNeeded(value: string): string {
  if (!value.startsWith('/')) return value
  const baseUrl = getInternalBaseUrl()
  return `${baseUrl}${value}`
}

function parseDataUrl(value: string): { mimeType: string; base64: string } | null {
  const marker = ';base64,'
  const markerIndex = value.indexOf(marker)
  if (!value.startsWith('data:') || markerIndex === -1) return null
  const mimeType = value.slice(5, markerIndex)
  const base64 = value.slice(markerIndex + marker.length)
  if (!mimeType || !base64) return null
  return { mimeType, base64 }
}

async function toInlineData(imageSource: string): Promise<{ mimeType: string; data: string } | null> {
  const parsedDataUrl = parseDataUrl(imageSource)
  if (parsedDataUrl) {
    return { mimeType: parsedDataUrl.mimeType, data: parsedDataUrl.base64 }
  }

  if (imageSource.startsWith('http://') || imageSource.startsWith('https://') || imageSource.startsWith('/')) {
    const cachedDataUrl = await getImageBase64Cached(toAbsoluteUrlIfNeeded(imageSource))
    const parsedCachedDataUrl = parseDataUrl(cachedDataUrl)
    if (!parsedCachedDataUrl) return null
    return { mimeType: parsedCachedDataUrl.mimeType, data: parsedCachedDataUrl.base64 }
  }

  return { mimeType: 'image/png', data: imageSource }
}

function assertAllowedOptions(options: Record<string, unknown>) {
  const allowedKeys = new Set([
    'provider',
    'modelId',
    'modelKey',
    'aspectRatio',
    'resolution',
  ])
  for (const [key, value] of Object.entries(options)) {
    if (value === undefined) continue
    if (!allowedKeys.has(key)) {
      throw new Error(`APIYI_IMAGE_OPTION_UNSUPPORTED: ${key}`)
    }
  }
}

export class ApiyiImageGenerator extends BaseImageGenerator {
  private readonly modelId?: string
  private readonly providerId?: string

  constructor(modelId?: string, providerId?: string) {
    super()
    this.modelId = modelId
    this.providerId = providerId
  }

  protected async doGenerate(params: ImageGenerateParams): Promise<GenerateResult> {
    const { userId, prompt, referenceImages = [], options = {} } = params
    assertAllowedOptions(options)

    const providerId = this.providerId || 'apiyi'
    const providerConfig = await getProviderConfig(userId, providerId)
    const apiKey = providerConfig.apiKey
    if (!apiKey) {
      throw new Error(`PROVIDER_API_KEY_MISSING: ${providerId}`)
    }

    const baseUrl = providerConfig.baseUrl || 'https://api.apiyi.com/v1'
    await setProxy()

    const normalizedOptions = options as ApiyiOptions
    const model = this.modelId || normalizedOptions.modelId || 'gemini-3.1-flash-image-preview'

    const parts: ApiyiContentPart[] = []

    // For image-to-image, prompt text block is passed in the parts array first, followed by reference image inlineData
    parts.push({ text: prompt })

    for (const referenceImage of referenceImages.slice(0, 14)) {
      const inlineData = await toInlineData(referenceImage)
      if (!inlineData) {
        throw new Error('APIYI_REFERENCE_INVALID: failed to parse reference image')
      }
      parts.push({ inlineData })
    }

    const requestUrl = `${baseUrl.replace(/\/$/, '')}/models/${model}:generateContent`
    
    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(normalizedOptions.aspectRatio || normalizedOptions.resolution
          ? {
              imageConfig: {
                ...(normalizedOptions.aspectRatio ? { aspectRatio: normalizedOptions.aspectRatio } : {}),
                ...(normalizedOptions.resolution ? { imageSize: normalizedOptions.resolution } : {}),
              },
            }
          : {}),
      },
    }

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`APIYI_IMAGE_GENERATION_FAILED (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const candidate = data?.candidates?.[0]
    const responseParts = candidate?.content?.parts || []

    for (const part of responseParts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || 'image/png'
        const imageBase64 = part.inlineData.data
        return {
          success: true,
          imageBase64,
          imageUrl: `data:${mimeType};base64,${imageBase64}`,
        }
      }
    }

    const finishReason = candidate?.finishReason
    if (finishReason === 'IMAGE_SAFETY' || finishReason === 'SAFETY') {
      throw new Error('内容因安全策略被过滤')
    }

    throw new Error('APIYI_IMAGE_EMPTY_RESPONSE: no image data returned')
  }
}
