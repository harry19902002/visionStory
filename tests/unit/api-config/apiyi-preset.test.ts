import { describe, expect, it } from 'vitest'
import { PRESET_MODELS, PRESET_PROVIDERS } from '@/app/[locale]/profile/components/api-config/types'

describe('api-config apiyi preset', () => {
  it('uses APIYI baseUrl in preset provider', () => {
    const apiyiProvider = PRESET_PROVIDERS.find((provider) => provider.id === 'apiyi')
    expect(apiyiProvider).toBeDefined()
    expect(apiyiProvider?.baseUrl).toBe('https://api.apiyi.com/v1')
  })

  it('includes all required apiyi preset models', () => {
    const apiyiImageModelIds = PRESET_MODELS
      .filter((model) => model.provider === 'apiyi' && model.type === 'image')
      .map((model) => model.modelId)

    expect(apiyiImageModelIds).toContain('gemini-3.1-flash-image-preview')
    expect(apiyiImageModelIds).toContain('gemini-3-pro-image-preview')

    const apiyiLlmModelIds = PRESET_MODELS
      .filter((model) => model.provider === 'apiyi' && model.type === 'llm')
      .map((model) => model.modelId)
    expect(apiyiLlmModelIds).toContain('gpt-4o')
  })
})
