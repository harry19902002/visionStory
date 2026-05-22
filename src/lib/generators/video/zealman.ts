import { BaseVideoGenerator, VideoGenerateParams, GenerateResult } from '../base'
import { getProviderConfig } from '@/lib/api-config'
import { normalizeToBase64ForGeneration } from '@/lib/media/outbound-image'

export class ZealmanVideoGenerator extends BaseVideoGenerator {
    private providerId: string

    constructor(providerId?: string) {
        super()
        this.providerId = providerId || 'zealman'
    }

    protected async doGenerate(params: VideoGenerateParams): Promise<GenerateResult> {
        const { userId, imageUrl, prompt = '', options = {} } = params
        const { baseUrl, apiKey } = await getProviderConfig(userId, this.providerId)

        if (!baseUrl) {
            throw new Error('ZEALMAN_BASE_URL_MISSING')
        }

        const modelId = options.modelId || 'H17-文图生视频-LTX2.3全面优化版'

        // 统一处理图片输入为 Base64 Data URL 或 HTTP URL
        let finalImageUrl = imageUrl
        if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
            finalImageUrl = await normalizeToBase64ForGeneration(imageUrl)
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        if (apiKey) {
            headers['Authorization'] = `Bearer ${apiKey}`
        }

        const url = baseUrl.replace(/\/+$/, '')
        
        // 构造 Zealman API (ComfyUI 镜像) 请求体
        const input_values: Record<string, unknown> = {
            "2004:image": finalImageUrl,
            "5013:text": prompt,
            "5018:value": 720,
            "5020:value": 1280
        }

        const requestBody = {
            workflow_id: modelId,
            input_values
        }

        const response = await fetch(`${url}/api/workflow/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        })

        if (!response.ok) {
            const errorText = await response.text().catch(() => '')
            throw new Error(`Zealman API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()
        const promptId = data.prompt_id
        
        if (!promptId) {
            throw new Error('No prompt_id returned from Zealman API')
        }

        return {
            success: true,
            async: true,
            requestId: promptId,
            externalId: `ZEALMAN:VIDEO:${promptId}`
        }
    }
}
