import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProviderConfigMock = vi.hoisted(() => vi.fn(async () => ({
  id: 'apiyi',
  apiKey: 'ap-key',
  baseUrl: 'https://api.apiyi.com/v1beta',
})))

const getImageBase64CachedMock = vi.hoisted(() => vi.fn(async () => 'data:image/png;base64,QQ=='))

vi.mock('@/lib/api-config', () => ({
  getProviderConfig: getProviderConfigMock,
}))

vi.mock('@/lib/image-cache', () => ({
  getImageBase64Cached: getImageBase64CachedMock,
}))

import { ApiyiImageGenerator } from '@/lib/generators/image/apiyi'

describe('ApiyiImageGenerator', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    getProviderConfigMock.mockResolvedValue({
      id: 'apiyi',
      apiKey: 'ap-key',
      baseUrl: 'https://api.apiyi.com/v1beta',
    })
  })

  it('generates text-to-image correctly with default model and headers', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'base64image'
            }
          }]
        }
      }]
    }), { status: 200 })))

    const generator = new ApiyiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'a futuristic city',
    })

    expect(result.success).toBe(true)
    expect(result.imageBase64).toBe('base64image')
    expect(result.imageUrl).toBe('data:image/png;base64,base64image')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs[0]).toBe('https://api.apiyi.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent')
    expect(callArgs[1].method).toBe('POST')
    expect(callArgs[1].headers).toEqual({
      'Authorization': 'Bearer ap-key',
      'Content-Type': 'application/json',
    })
    
    const body = JSON.parse(callArgs[1].body)
    expect(body).toEqual({
      contents: [{
        parts: [{ text: 'a futuristic city' }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
      }
    })
  })

  it('configures custom model, aspectRatio, and resolution correctly', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/jpeg',
              data: 'base64imageJpeg'
            }
          }]
        }
      }]
    }), { status: 200 })))

    const generator = new ApiyiImageGenerator('gemini-3-pro-image-preview', 'apiyi')
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'a dog in space',
      options: {
        aspectRatio: '16:9',
        resolution: '2K',
      }
    })

    expect(result.success).toBe(true)
    expect(result.imageBase64).toBe('base64imageJpeg')
    expect(result.imageUrl).toBe('data:image/jpeg;base64,base64imageJpeg')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const callArgs = fetchMock.mock.calls[0]
    expect(callArgs[0]).toBe('https://api.apiyi.com/v1beta/models/gemini-3-pro-image-preview:generateContent')
    
    const body = JSON.parse(callArgs[1].body)
    expect(body.generationConfig).toEqual({
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '2K',
      }
    })
  })

  it('generates image-to-image with reference images', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'refBase64'
            }
          }]
        }
      }]
    }), { status: 200 })))

    const generator = new ApiyiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'style transfer',
      referenceImages: ['data:image/png;base64,QQ==', 'https://example.com/test.jpg'],
    })

    expect(result.success).toBe(true)
    expect(result.imageBase64).toBe('refBase64')
    expect(getImageBase64CachedMock).toHaveBeenCalledWith('https://example.com/test.jpg')

    const callArgs = fetchMock.mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.contents[0].parts).toEqual([
      { text: 'style transfer' },
      { inlineData: { mimeType: 'image/png', data: 'QQ==' } },
      { inlineData: { mimeType: 'image/png', data: 'QQ==' } }, // mocked cached image returns QQ==
    ])
  })

  it('handles safety filter blocks correctly', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      candidates: [{
        finishReason: 'IMAGE_SAFETY',
        content: {
          parts: []
        }
      }]
    }), { status: 200 })))

    const generator = new ApiyiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'inappropriate content',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('内容因安全策略被过滤')
  })

  it('handles empty image response correctly', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      candidates: [{
        finishReason: 'MAX_TOKENS',
        content: {
          parts: []
        }
      }]
    }), { status: 200 })))

    const generator = new ApiyiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'some prompt',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('APIYI_IMAGE_EMPTY_RESPONSE')
  })

  it('handles non-200 response code correctly', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('Internal Server Error', { status: 500 })))

    const generator = new ApiyiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'some prompt',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('APIYI_IMAGE_GENERATION_FAILED (500)')
  })

  it('fails explicitly on unsupported options', async () => {
    const generator = new ApiyiImageGenerator()
    const result = await generator.generate({
      userId: 'user-1',
      prompt: 'some prompt',
      options: {
        unsupportedKey: 'value',
      }
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('APIYI_IMAGE_OPTION_UNSUPPORTED')
  })
})
