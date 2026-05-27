import type { LipSyncParams, LipSyncResult, LipSyncSubmitContext } from '@/lib/lipsync/types'
import { normalizeToBase64ForGeneration } from '@/lib/media/outbound-image'

export async function submitSeetaCloudLipSync(
  params: LipSyncParams,
  context: LipSyncSubmitContext,
): Promise<LipSyncResult> {
  const videoBase64 = params.videoUrl.startsWith('data:')
    ? params.videoUrl
    : await normalizeToBase64ForGeneration(params.videoUrl)

  const audioBase64 = params.audioUrl.startsWith('data:')
    ? params.audioUrl
    : await normalizeToBase64ForGeneration(params.audioUrl)

  const response = await fetch('https://uu316886-77936903aee0.westd.seetacloud.com:8443/api/workflow/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workflow_id: 'InfiniteTalk',
      input_values: {
        '34:video': videoBase64,
        '43:audio': audioBase64,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SEETACLOUD_LIPSYNC_SUBMIT_FAILED: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const promptId = data.prompt_id
  if (!promptId) {
    throw new Error('SEETACLOUD_LIPSYNC_PROMPT_ID_MISSING')
  }

  return {
    requestId: promptId,
    externalId: `SEETACLOUD:VIDEO:${promptId}`,
    async: true,
  }
}
