import { beforeEach, describe, expect, it, vi } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  novelPromotionProject: {
    findUnique: vi.fn(),
  },
  userPreference: {
    findUnique: vi.fn(),
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

import { getProjectModelConfig } from '@/lib/config-service'

describe('config-service getProjectModelConfig fallback logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('correctly falls back to user preferences for all model fields when project settings are null', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValueOnce({
      projectId: 'project-1',
      analysisModel: null,
      characterModel: null,
      locationModel: null,
      storyboardModel: null,
      editModel: null,
      videoModel: null,
      audioModel: null,
      videoRatio: '9:16',
      artStyle: 'realistic',
      capabilityOverrides: null,
    })

    prismaMock.userPreference.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      analysisModel: 'apiyi::gemini-3.1-flash-image-preview',
      characterModel: 'fal::sd-xl',
      locationModel: 'apiyi::gemini-3.1-flash-image-preview',
      storyboardModel: 'google::imagen-3',
      editModel: 'ark::flux-1',
      videoModel: 'fal::kling',
      audioModel: 'bailian::tts-1',
      capabilityDefaults: null,
    })

    const config = await getProjectModelConfig('project-1', 'user-1')

    expect(config.analysisModel).toBe('apiyi::gemini-3.1-flash-image-preview')
    expect(config.characterModel).toBe('fal::sd-xl')
    expect(config.locationModel).toBe('apiyi::gemini-3.1-flash-image-preview')
    expect(config.storyboardModel).toBe('google::imagen-3')
    expect(config.editModel).toBe('ark::flux-1')
    expect(config.videoModel).toBe('fal::kling')
    expect(config.audioModel).toBe('bailian::tts-1')
  })

  it('uses project settings over user preferences', async () => {
    prismaMock.novelPromotionProject.findUnique.mockResolvedValueOnce({
      projectId: 'project-1',
      analysisModel: 'google::gemini-2.0-flash',
      characterModel: 'google::imagen-3',
      locationModel: 'google::imagen-3',
      storyboardModel: 'google::imagen-3',
      editModel: 'google::imagen-3',
      videoModel: 'google::veo-2',
      audioModel: 'google::tts-2',
      videoRatio: '9:16',
      artStyle: 'realistic',
      capabilityOverrides: null,
    })

    prismaMock.userPreference.findUnique.mockResolvedValueOnce({
      userId: 'user-1',
      analysisModel: 'apiyi::gemini-3.1-flash-image-preview',
      characterModel: 'fal::sd-xl',
      locationModel: 'apiyi::gemini-3.1-flash-image-preview',
      storyboardModel: 'google::imagen-3',
      editModel: 'ark::flux-1',
      videoModel: 'fal::kling',
      audioModel: 'bailian::tts-1',
      capabilityDefaults: null,
    })

    const config = await getProjectModelConfig('project-1', 'user-1')

    expect(config.analysisModel).toBe('google::gemini-2.0-flash')
    expect(config.characterModel).toBe('google::imagen-3')
    expect(config.locationModel).toBe('google::imagen-3')
    expect(config.storyboardModel).toBe('google::imagen-3')
    expect(config.editModel).toBe('google::imagen-3')
    expect(config.videoModel).toBe('google::veo-2')
    expect(config.audioModel).toBe('google::tts-2')
  })
})
