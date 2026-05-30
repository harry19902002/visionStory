'use client'

import React, { useState } from 'react'
import { ARK_SYSTEM_VOICES } from '@/lib/constants/ark-voices'

export default function ArkTTSDebugPage() {
  const [apiKey, setApiKey] = useState('')
  const [resourceId, setResourceId] = useState('seed-tts-2.0')
  const [modelName, setModelName] = useState('seed-tts-2.0-expressive')
  const [speaker, setSpeaker] = useState('zh_female_shuangkuaisisi_moon_bigtts')
  const [emotion, setEmotion] = useState('')
  const [rate, setRate] = useState(1.0)
  const [vol, setVol] = useState(1.0)
  const [text, setText] = useState('测试火山引擎豆包语音合成效果')
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const handleTest = async () => {
    setLoading(true)
    setResult(null)
    setAudioUrl(null)
    
    try {
      const res = await fetch('/api/debug/ark-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey, resourceId, text, speaker, modelName, emotion, rate, vol }),
      })
      
      const rawText = await res.text()
      let data: Record<string, unknown>
      let allBase64 = ''
      
      try {
        data = JSON.parse(rawText)
      } catch {
        const parts = rawText.split(/\n|(?=\{"(?:code|reqid|header)":)/).filter(p => p.trim())
        const parsedParts = []
        for (const p of parts) {
          try {
            const parsed = JSON.parse(p)
            parsedParts.push(parsed)
            if (parsed.data) allBase64 += parsed.data
            if (parsed.audio) allBase64 += parsed.audio
            if (parsed.audio_content) allBase64 += parsed.audio_content
          } catch {
            // Ignore incomplete chunks in this simple debugger
          }
        }
        data = parsedParts.length > 0 ? parsedParts[parsedParts.length - 1] : { error: rawText }
        if (allBase64) {
          data.data = allBase64
        }
      }

      setResult(data)
      
      const code = data.code || data.status_code
      if (code && code !== 20000000 && code !== 0) {
        // Error case
      } else if (data.data || data.audio) {
        // Success case, extract base64 audio
        const base64Audio = data.data || data.audio || data.audio_content
        if (base64Audio) {
          const url = `data:audio/mpeg;base64,${base64Audio}`
          setAudioUrl(url)
        }
      }
    } catch (err: unknown) {
      setResult({ error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLoading(false)
    }
  }

  const PRESET_RESOURCE_IDS = [
    'seed-tts-2.0',
    'volc.tts_expressive.v1',
    'volce.tts.v1'
  ]
  
  const PRESET_SPEAKERS = [
    'Doubao-Voice-Pro',
    'Doubao-Voice-Expressive',
    'zh-female-warm',
    ...ARK_SYSTEM_VOICES.map((v: { id: string }) => v.id)
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">火山引擎 (Ark) TTS 调试工具</h1>
          <p className="text-gray-400">用于测试不同模型 ID (Resource ID) 与音色 ID (Speaker ID) 的连通性及兼容情况</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 space-y-4 shadow-xl border border-gray-700">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">API Key (Token)</label>
            <input 
              type="password"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="请输入您的火山引擎 API Key"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">模型 ID / Resource ID (X-Api-Resource-Id)</label>
            <div className="flex gap-2">
              <input 
                type="text"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={resourceId}
                onChange={e => setResourceId(e.target.value)}
                placeholder="例如 seed-tts-2.0 或 ep-xxxx"
              />
              <select 
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                onChange={e => setResourceId(e.target.value)}
                value={PRESET_RESOURCE_IDS.includes(resourceId) ? resourceId : ''}
              >
                <option value="" disabled>快速选择</option>
                {PRESET_RESOURCE_IDS.map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">控制台中的大模型资源名称或推理接入点ID</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">请求模型 (req_params.model)</label>
            <div className="flex gap-2">
              <input 
                type="text"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={modelName}
                onChange={e => setModelName(e.target.value)}
                placeholder="留空，或输入如 seed-tts-2.0-expressive"
              />
              <select 
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                onChange={e => setModelName(e.target.value)}
                value={['', 'seed-tts-2.0-standard', 'seed-tts-2.0-expressive'].includes(modelName) ? modelName : 'custom'}
              >
                <option value="custom" disabled>快速选择</option>
                <option value="">(空/默认)</option>
                <option value="seed-tts-2.0-standard">seed-tts-2.0-standard</option>
                <option value="seed-tts-2.0-expressive">seed-tts-2.0-expressive</option>
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">留空表示使用 Resource ID 对应的默认模型。如果报错 InvalidModel，尝试清空此项。</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">音色 ID (Speaker ID)</label>
            <div className="flex gap-2">
              <input 
                type="text"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                value={speaker}
                onChange={e => setSpeaker(e.target.value)}
                placeholder="例如 zh_female_shuangkuaisisi_moon_bigtts"
              />
              <select 
                className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white"
                onChange={e => setSpeaker(e.target.value)}
                value={PRESET_SPEAKERS.includes(speaker) ? speaker : ''}
              >
                <option value="" disabled>快速选择</option>
                {PRESET_SPEAKERS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mt-1">音色ID必须与您申请的Resource ID匹配，否则会报错 55000000</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">测试文本</label>
            <textarea 
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="请输入要合成的文本..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-300">语音指令 / 情绪 (emotion)</label>
            <input 
              type="text"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              value={emotion}
              onChange={e => setEmotion(e.target.value)}
              placeholder="例如：用悲伤的语气，带东北口音，语速较快"
            />
            <p className="text-xs text-gray-500 mt-1">仅在使用支持指令理解的模型 (如 seed-tts-2.0-expressive) 时生效。</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex justify-between">
                <span>语速 (rate)</span>
                <span className="text-blue-400">{rate.toFixed(1)}x</span>
              </label>
              <input 
                type="range" min="0.5" max="2.0" step="0.1" 
                value={rate} onChange={e => setRate(parseFloat(e.target.value))} 
                className="w-full accent-blue-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300 flex justify-between">
                <span>音量 (vol)</span>
                <span className="text-blue-400">{vol.toFixed(1)}x</span>
              </label>
              <input 
                type="range" min="0.1" max="10.0" step="0.1" 
                value={vol} onChange={e => setVol(parseFloat(e.target.value))} 
                className="w-full accent-blue-500" 
              />
            </div>
          </div>

          <div className="pt-2">
            <button 
              onClick={handleTest}
              disabled={loading || !apiKey || !resourceId || !text || !speaker}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? '正在合成...' : '生成并测试'}
            </button>
          </div>
        </div>

        {audioUrl && (
          <div className="bg-green-900/30 border border-green-800 rounded-xl p-6">
            <h3 className="text-lg font-medium text-green-400 mb-4">合成成功</h3>
            <audio controls src={audioUrl} className="w-full" autoPlay />
          </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 overflow-hidden">
            <h3 className="text-lg font-medium text-gray-300 mb-4">API 响应原始数据</h3>
            <pre className="text-sm text-gray-400 bg-gray-900 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(
                result, 
                (k, v) => (k === 'data' || k === 'audio' || k === 'audio_content') && typeof v === 'string' && v.length > 100 
                  ? `[Base64 Audio Data omitted for readability, length=${v.length}]` 
                  : v, 
                2
              )}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
