'use client'

/**
 * 音色设置组件 - 从 CharacterCard 提取
 * 支持上传自定义音频和 AI 声音设计
 */

import { useRef, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { shouldShowError } from '@/lib/error-utils'
import { useUploadProjectCharacterVoice } from '@/lib/query/mutations'
import { useUserPreferences } from '@/lib/query/hooks/useUserPreferences'
import { AppIcon } from '@/components/ui/icons'
import { useProjectData } from '@/lib/query/hooks/useProjectData'
import MinimaxVoicePickerDialog from './MinimaxVoicePickerDialog'

interface VoiceSettingsProps {
    characterId: string
    characterName: string
    customVoiceUrl: string | null | undefined
    voiceId?: string | null | undefined
    projectId: string
    onVoiceChange?: (characterId: string, voiceType: string, voiceId: string, customVoiceUrl?: string) => void
    onVoiceDesign?: (characterId: string, characterName: string) => void
    onSelectFromHub?: (characterId: string) => void  // 从资产中心选择音色
    compact?: boolean  // 紧凑模式（单图卡片用）
}

function getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'object' && error !== null) {
        const message = (error as { message?: unknown }).message
        if (typeof message === 'string') return message
    }
    return fallback
}

export default function VoiceSettings({
    characterId,
    characterName,
    customVoiceUrl,
    voiceId,
    projectId,
    onVoiceChange,
    onVoiceDesign,
    onSelectFromHub,
    compact = false
}: VoiceSettingsProps) {
    const t = useTranslations('assets')
    // 🔥 使用 mutation
    const uploadVoice = useUploadProjectCharacterVoice(projectId)
    const voiceFileInputRef = useRef<HTMLInputElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [isPreviewingVoice, setIsPreviewingVoice] = useState(false)

    const { data: project } = useProjectData(projectId)
    const { data: userPref } = useUserPreferences()
    const audioModel = project?.novelPromotionData?.audioModel || userPref?.audioModel || ''
    const isMinimax = audioModel.toLowerCase().includes('minimax')

    // Parse minimax voice settings from voiceId
    const [minimaxVoiceId, setMinimaxVoiceId] = useState('male-qn-qingse')
    const [speed, setSpeed] = useState<number>(1.0)
    const [pitch, setPitch] = useState<number>(0)
    const [vol, setVol] = useState<number>(1.0)

    useEffect(() => {
        if (isMinimax && voiceId) {
            const parts = voiceId.split('|')
            if (parts[0]) setMinimaxVoiceId(parts[0])
            if (parts.length > 1 && parts[1]) setSpeed(parseFloat(parts[1]))
            if (parts.length > 2 && parts[2]) setPitch(parseInt(parts[2]))
            if (parts.length > 3 && parts[3]) setVol(parseFloat(parts[3]))
        }
    }, [isMinimax, voiceId])

    const handleMinimaxChange = (newVoiceId: string, newSpeed: number, newPitch: number, newVol: number) => {
        const combinedVoiceId = `${newVoiceId}|${newSpeed}|${newPitch}|${newVol}`
        onVoiceChange?.(characterId, 'preset', combinedVoiceId, '')
    }

    const hasCustomVoice = !!customVoiceUrl || (isMinimax && !!voiceId)

    const confirmUploadVoice = () => {
        return window.confirm(t('tts.uploadQwenHint'))
    }

    // 预览音色（播放/暂停自定义音频）
    const handlePreviewVoice = async () => {
        if (!customVoiceUrl) return

        // 如果正在播放，点击则暂停
        if (isPreviewingVoice && audioRef.current) {
            audioRef.current.pause()
            setIsPreviewingVoice(false)
            return
        }

        try {
            if (audioRef.current) {
                audioRef.current.pause()
            }
            const audio = new Audio(customVoiceUrl)
            audioRef.current = audio
            audio.play()
            audio.onended = () => setIsPreviewingVoice(false)
            audio.onerror = () => setIsPreviewingVoice(false)
            setIsPreviewingVoice(true)
        } catch (error: unknown) {
            if (shouldShowError(error)) {
                alert(t('tts.previewFailed', { error: getErrorMessage(error, t('common.unknownError')) }))
            }
            setIsPreviewingVoice(false)
        }
    }

    // 上传自定义音频
    const handleUploadVoice = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !projectId) return

        uploadVoice.mutate(
            { file, characterId },
            {
                onSuccess: (data) => {
                    const result = (data || {}) as UploadedVoiceResult
                    onVoiceChange?.(characterId, 'uploaded', '', result.audioUrl)
                },
                onError: (error) => {
                    if (shouldShowError(error)) {
                        alert(t('tts.uploadFailed', { error: error.message }))
                    }
                },
                onSettled: () => {
                    if (voiceFileInputRef.current) {
                        voiceFileInputRef.current.value = ''
                    }
                }
            }
        )
    }

    // 紧凑模式样式
    const containerClass = compact
        ? 'border border-[var(--glass-stroke-base)] rounded-xl p-3 bg-[var(--glass-bg-surface-strong)]'
        : 'mt-4 border border-[var(--glass-stroke-base)] rounded-xl p-4 bg-[var(--glass-bg-surface-strong)]'


    const iconSize = compact ? 'w-5 h-5' : 'w-6 h-6'
    const innerIconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5'

    const [isExpanded, setIsExpanded] = useState(false)
    const [isMinimaxDialogOpen, setIsMinimaxDialogOpen] = useState(false)

    return (
        <div className={containerClass}>
            {/* 折叠标题行 - 点击展开/收起 */}
            <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="w-full flex items-center justify-between cursor-pointer"
            >
                <div className="flex items-center gap-2">
                    <div className={`${iconSize} rounded-full flex items-center justify-center ${hasCustomVoice ? 'bg-[var(--glass-bg-muted)]' : 'bg-[var(--glass-tone-warning-bg)]'}`}>
                        <AppIcon name="mic" className={`${innerIconSize} ${hasCustomVoice ? 'text-[var(--glass-text-secondary)]' : 'text-[var(--glass-tone-warning-fg)]'}`} />
                    </div>
                    <span className={`text-${compact ? 'xs' : 'sm'} font-medium text-[var(--glass-text-secondary)]`}>
                        {t('tts.title')}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${hasCustomVoice ? 'bg-[var(--glass-tone-success-fg)]' : 'bg-[var(--glass-tone-warning-fg)]'}`} />
                </div>
                <AppIcon
                    name="chevronDown"
                    className={`w-4 h-4 text-[var(--glass-text-tertiary)] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* 展开内容 */}
            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-[var(--glass-stroke-base)]">
                    {isMinimax ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[var(--glass-text-secondary)] mb-1.5">系统音色</label>
                                <div className="flex gap-2 items-center">
                                    <button 
                                        type="button"
                                        onClick={() => setIsMinimaxDialogOpen(true)}
                                        className="flex-1 bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-base)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--glass-text-primary)] hover:border-[var(--glass-stroke-focus)] transition-colors text-left truncate flex justify-between items-center"
                                    >
                                        <span>{minimaxVoiceId || '选择系统音色'}</span>
                                        <AppIcon name="chevronDown" className="w-4 h-4 text-[var(--glass-text-secondary)] flex-shrink-0" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-[var(--glass-text-secondary)] mb-1 flex justify-between">
                                    <span>语速</span>
                                    <span className="text-[var(--glass-text-primary)] font-bold">{speed.toFixed(1)}x</span>
                                </label>
                                <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => {
                                    const val = parseFloat(e.target.value)
                                    setSpeed(val)
                                    handleMinimaxChange(minimaxVoiceId, val, pitch, vol)
                                }} className="w-full accent-[var(--glass-accent-from)]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-[var(--glass-text-secondary)] mb-1 flex justify-between">
                                    <span>音量</span>
                                    <span className="text-[var(--glass-text-primary)] font-bold">{vol.toFixed(1)}</span>
                                </label>
                                <input type="range" min="0.1" max="10.0" step="0.1" value={vol} onChange={e => {
                                    const val = parseFloat(e.target.value)
                                    setVol(val)
                                    handleMinimaxChange(minimaxVoiceId, speed, pitch, val)
                                }} className="w-full accent-[var(--glass-accent-from)]" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-[var(--glass-text-secondary)] mb-1 flex justify-between">
                                    <span>声调</span>
                                    <span className="text-[var(--glass-text-primary)] font-bold">{pitch > 0 ? `+${pitch}` : pitch}</span>
                                </label>
                                <input type="range" min="-12" max="12" step="1" value={pitch} onChange={e => {
                                    const val = parseInt(e.target.value)
                                    setPitch(val)
                                    handleMinimaxChange(minimaxVoiceId, speed, val, vol)
                                }} className="w-full accent-[var(--glass-accent-from)]" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 隐藏的音频文件输入 */}
                            <input
                                ref={voiceFileInputRef}
                                type="file"
                                accept="audio/*"
                                onChange={handleUploadVoice}
                                className="hidden"
                            />

                            <div className="flex flex-wrap gap-2 w-full justify-center">
                                {/* 上传音频按钮 */}
                                <button
                                    onClick={() => {
                                        if (!confirmUploadVoice()) return
                                        voiceFileInputRef.current?.click()
                                    }}
                                    disabled={uploadVoice.isPending}
                                    className="flex-1 min-w-[80px] px-2 py-1.5 bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-base)] rounded-lg text-xs text-[var(--glass-text-secondary)] font-medium hover:border-[var(--glass-stroke-success)] hover:bg-[var(--glass-tone-success-bg)] hover:text-[var(--glass-tone-success-fg)] transition-all relative group whitespace-nowrap"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        {hasCustomVoice && <div className="w-1.5 h-1.5 bg-[var(--glass-tone-success-fg)] rounded-full flex-shrink-0"></div>}
                                        <span>{uploadVoice.isPending ? t('tts.uploading') : hasCustomVoice ? t('tts.uploaded') : t('tts.uploadAudio')}</span>
                                    </div>
                                </button>

                                {/* 从资产中心选择按钮 */}
                                {onSelectFromHub && (
                                    <button
                                        onClick={() => onSelectFromHub(characterId)}
                                        className="flex-1 min-w-[80px] px-2 py-1.5 bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-focus)] rounded-lg text-xs text-[var(--glass-tone-info-fg)] font-medium hover:border-[var(--glass-stroke-focus)] hover:bg-[var(--glass-tone-info-bg)] transition-all whitespace-nowrap"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <AppIcon name="copy" className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>{t('assetLibrary.button')}</span>
                                        </div>
                                    </button>
                                )}

                                {/* AI设计按钮 */}
                                {onVoiceDesign && (
                                    <button
                                        onClick={() => onVoiceDesign(characterId, characterName)}
                                        className="glass-btn-base glass-btn-primary flex-1 min-w-[80px] px-2 py-1.5 text-xs font-medium whitespace-nowrap"
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <AppIcon name="bolt" className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>{t('modal.aiDesign')}</span>
                                        </div>
                                    </button>
                                )}
                            </div>

                            {/* 试听按钮 - 仅在有音频时显示 */}
                            {hasCustomVoice && !isMinimax && (
                                <button
                                    onClick={handlePreviewVoice}
                                    className={`w-full mt-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${isPreviewingVoice
                                        ? 'bg-[var(--glass-accent-from)] border-[var(--glass-stroke-focus)] text-white hover:bg-[var(--glass-accent-to)]'
                                        : 'bg-[var(--glass-tone-info-bg)] border-[var(--glass-stroke-focus)] text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)]'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {isPreviewingVoice ? (
                                            <AppIcon name="pause" className="w-4 h-4" />
                                        ) : (
                                            <AppIcon name="play" className="w-4 h-4" />
                                        )}
                                        {isPreviewingVoice ? t('tts.pause') : t('tts.preview')}
                                    </div>
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}

            <MinimaxVoicePickerDialog
                isOpen={isMinimaxDialogOpen}
                onClose={() => setIsMinimaxDialogOpen(false)}
                currentVoiceId={minimaxVoiceId}
                onSelect={(id) => {
                    setMinimaxVoiceId(id)
                    handleMinimaxChange(id, speed, pitch, vol)
                }}
            />
        </div>
    )
}

type UploadedVoiceResult = { audioUrl?: string }
