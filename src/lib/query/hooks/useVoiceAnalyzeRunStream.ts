'use client'

import { useRunStreamState, type RunResult } from './useRunStreamState'
import { TASK_TYPE } from '@/lib/task/types'
import { apiFetch } from '@/lib/api-fetch'
import { selectRecoverableRun } from '@/lib/run-runtime/recovery'

export type VoiceAnalyzeRunParams = {
  episodeId: string
}

export type VoiceAnalyzeRunResult = RunResult

type UseVoiceAnalyzeRunStreamOptions = {
  projectId: string
  episodeId?: string | null
}

export function useVoiceAnalyzeRunStream({ projectId, episodeId }: UseVoiceAnalyzeRunStreamOptions) {
  return useRunStreamState<VoiceAnalyzeRunParams>({
    projectId,
    endpoint: (pid) => `/api/novel-promotion/${pid}/voice-analyze`,
    storageKeyPrefix: 'novel-promotion:voice-analyze',
    storageScopeKey: episodeId || undefined,
    resolveActiveRunId: async ({ projectId: pid, storageScopeKey }) => {
      if (!storageScopeKey) return null
      const search = new URLSearchParams({
        projectId: pid,
        workflowType: TASK_TYPE.VOICE_ANALYZE,
        targetType: 'NovelPromotionEpisode',
        targetId: storageScopeKey,
        limit: '20',
      })
      search.append('status', 'queued')
      search.append('status', 'running')
      search.append('status', 'canceling')
      search.set('_v', '2')
      const response = await apiFetch(`/api/runs?${search.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })
      if (!response.ok) return null
      const data = await response.json().catch(() => null)
      const runs = data && typeof data === 'object' && Array.isArray((data as { runs?: unknown[] }).runs)
        ? (data as {
          runs: Array<{
            id?: unknown
            status?: unknown
            createdAt?: unknown
            updatedAt?: unknown
            leaseExpiresAt?: unknown
            heartbeatAt?: unknown
          }>
        }).runs
        : []
      const decision = selectRecoverableRun(runs.map((run) => ({
        id: typeof run?.id === 'string' ? run.id : null,
        status: typeof run?.status === 'string' ? run.status : null,
        createdAt: typeof run?.createdAt === 'string' ? run.createdAt : null,
        updatedAt: typeof run?.updatedAt === 'string' ? run.updatedAt : null,
        leaseExpiresAt: typeof run?.leaseExpiresAt === 'string' ? run.leaseExpiresAt : null,
        heartbeatAt: typeof run?.heartbeatAt === 'string' ? run.heartbeatAt : null,
      })))
      return decision.runId
    },
    validateParams: (params) => {
      if (!params.episodeId) {
        throw new Error('episodeId is required')
      }
    },
    buildRequestBody: (params) => ({
      episodeId: params.episodeId,
      async: true,
      displayMode: 'detail',
    }),
  })
}
