'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import MinimaxVoicePickerDialog from '../assets/MinimaxVoicePickerDialog'
import VoicePickerDialog from '@/app/[locale]/workspace/asset-hub/components/VoicePickerDialog'
import VoiceCreationModal from '@/app/[locale]/workspace/asset-hub/components/VoiceCreationModal'
import { AppIcon } from '@/components/ui/icons'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { InlineSpeakerVoiceBinding } from '@/lib/novel-promotion/stages/voice-stage-runtime/types'
import { useProjectData } from '@/lib/query/hooks/useProjectData'
import { useUserPreferences } from '@/lib/query/hooks/useUserPreferences'

type BindingTab = 'select' | 'upload' | 'design'

interface SpeakerVoiceBindingDialogProps {
    isOpen: boolean
    speaker: string
    projectId: string
    episodeId: string
    initialSpeakerVoice?: any // using any or SpeakerVoiceEntry if imported
    onClose: () => void
    onBound: (speaker: string, binding: InlineSpeakerVoiceBinding) => void
}

/**
 * 内联音色绑定弹窗
 * 用于不在资产库中的角色/发言人在配音阶段直接绑定音色
 * 提供三种绑定方式：从音色库选择、上传音频、AI设计音色（Tab 切换）
 */
export default function SpeakerVoiceBindingDialog({
    isOpen,
    speaker,
    projectId,
    episodeId,
    initialSpeakerVoice,
    onClose,
    onBound,
}: SpeakerVoiceBindingDialogProps) {
    const t = useTranslations('voice.inlineBinding')
    const [activeTab, setActiveTab] = useState<BindingTab>('select')
    // 子弹窗打开标记
    const [subDialogOpen, setSubDialogOpen] = useState(false)

    const { data: project } = useProjectData(projectId)
    const { data: userPref } = useUserPreferences()
    const audioModel = project?.novelPromotionData?.audioModel || userPref?.audioModel || ''
    const isMinimax = audioModel.toLowerCase().includes('minimax')

    const [advancedVoice, setAdvancedVoice] = useState<{
        id: string
        customVoiceUrl: string | null
        voiceId: string | null
        voiceType: string
    } | null>(null)
    const [speed, setSpeed] = useState<number>(1.0)
    const [pitch, setPitch] = useState<number>(0)
    const [vol, setVol] = useState<number>(1.0)
    const [isMinimaxDialogOpen, setIsMinimaxDialogOpen] = useState(false)
    const [minimaxVoiceId, setMinimaxVoiceId] = useState('male-qn-qingse')

    useEffect(() => {
        if (isOpen) {
            if (initialSpeakerVoice?.provider === 'minimax') {
                setMinimaxVoiceId(initialSpeakerVoice.voiceId || 'male-qn-qingse')
                setSpeed(initialSpeakerVoice.speed ?? 1.0)
                setPitch(initialSpeakerVoice.pitch ?? 0)
                setVol(initialSpeakerVoice.vol ?? 1.0)
            } else {
                setMinimaxVoiceId('male-qn-qingse')
                setSpeed(1.0)
                setPitch(0)
                setVol(1.0)
            }
        }
    }, [isOpen, speaker, initialSpeakerVoice])

    const handleClose = useCallback(() => {
        setActiveTab('select')
        setSubDialogOpen(false)
        setAdvancedVoice(null)
        onClose()
    }, [onClose])

    const confirmUploadVoice = useCallback(() => {
        return window.confirm(t('uploadQwenHint'))
    }, [t])

    const handleVoiceSelected = useCallback((voice: {
        id: string
        customVoiceUrl: string | null
        voiceId: string | null
        voiceType: string
    }) => {
        if (isMinimax && voice.voiceId) {
            setAdvancedVoice(voice)
            setSubDialogOpen(false)
            return
        }

        if (voice.voiceId) {
            onBound(speaker, {
                provider: 'bailian',
                voiceType: voice.voiceType,
                voiceId: voice.voiceId,
                ...(voice.customVoiceUrl ? { previewAudioUrl: voice.customVoiceUrl } : {}),
            })
        } else if (voice.customVoiceUrl) {
            onBound(speaker, {
                provider: 'fal',
                voiceType: voice.voiceType,
                audioUrl: voice.customVoiceUrl,
            })
            alert(t('uploadQwenHint'))
        }
        setSubDialogOpen(false)
        onClose()
    }, [speaker, onBound, onClose, t, isMinimax])

    // AI 设计音色或上传音频后的回调
    const handleCreationSuccess = useCallback(() => {
        // 创建成功后切换到选择模式，让用户从音色库选取刚创建的音色
        setActiveTab('select')
        setSubDialogOpen(true)
    }, [])

    const handleTabClick = useCallback((tab: BindingTab) => {
        if (tab === 'upload' && !confirmUploadVoice()) {
            return
        }
        setActiveTab(tab)
        setSubDialogOpen(true)
    }, [confirmUploadVoice])

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    // For Minimax, completely replace the inline binding dialog with the native Minimax configuration
    if (isMinimax) {
        return createPortal(
            <>
                <div className="fixed inset-0 z-[9999] glass-overlay" onClick={handleClose} />
                <div className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-surface-modal w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]">
                        <div className="flex items-center gap-2 min-w-0">
                            <AppIcon name="mic" className="w-5 h-5 text-[var(--glass-tone-info-fg)] shrink-0" />
                            <h2 className="font-semibold text-[var(--glass-text-primary)] truncate">MiniMax 配音设置 - {speaker}</h2>
                        </div>
                        <button onClick={handleClose} className="glass-btn-base glass-btn-soft p-1 text-[var(--glass-text-tertiary)] shrink-0">
                            <AppIcon name="close" className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-5 space-y-5">
                        <div>
                            <label className="block text-xs font-medium text-[var(--glass-text-secondary)] mb-2">系统音色 (Voice)</label>
                            <div className="flex gap-2 items-center">
                                <button 
                                    type="button"
                                    onClick={() => setIsMinimaxDialogOpen(true)}
                                    className="flex-1 bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-base)] rounded-lg px-3 py-2 text-sm text-[var(--glass-text-primary)] hover:border-[var(--glass-stroke-focus)] transition-colors text-left truncate flex justify-between items-center"
                                >
                                    <span>{minimaxVoiceId || '选择系统音色'}</span>
                                    <AppIcon name="chevronDown" className="w-5 h-5 text-[var(--glass-text-secondary)] flex-shrink-0" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--glass-text-secondary)] mb-2 flex justify-between">
                                <span>语速 (Speed)</span>
                                <span className="text-[var(--glass-text-primary)] font-bold">{speed.toFixed(1)}x</span>
                            </label>
                            <input type="range" min="0.5" max="2.0" step="0.1" value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="w-full accent-[var(--glass-accent-from)]" />
                            <div className="flex justify-between text-[10px] text-[var(--glass-text-tertiary)] mt-1">
                                <span>0.5x (慢)</span>
                                <span>2.0x (快)</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--glass-text-secondary)] mb-2 flex justify-between">
                                <span>音量 (Volume)</span>
                                <span className="text-[var(--glass-text-primary)] font-bold">{vol.toFixed(1)}</span>
                            </label>
                            <input type="range" min="0.1" max="10.0" step="0.1" value={vol} onChange={e => setVol(parseFloat(e.target.value))} className="w-full accent-[var(--glass-accent-from)]" />
                            <div className="flex justify-between text-[10px] text-[var(--glass-text-tertiary)] mt-1">
                                <span>0.1 (低)</span>
                                <span>10.0 (高)</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--glass-text-secondary)] mb-2 flex justify-between">
                                <span>声调 (Pitch)</span>
                                <span className="text-[var(--glass-text-primary)] font-bold">{pitch > 0 ? `+${pitch}` : pitch}</span>
                            </label>
                            <input type="range" min="-12" max="12" step="1" value={pitch} onChange={e => setPitch(parseInt(e.target.value))} className="w-full accent-[var(--glass-accent-from)]" />
                            <div className="flex justify-between text-[10px] text-[var(--glass-text-tertiary)] mt-1">
                                <span>-12 (低沉)</span>
                                <span>+12 (尖锐)</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 p-4 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]">
                        <button onClick={handleClose} className="glass-btn-base glass-btn-secondary flex-1 py-2 rounded-lg text-sm">{t('cancel', { defaultValue: '取消' })}</button>
                        <button onClick={() => {
                            onBound(speaker, {
                                provider: 'minimax',
                                voiceType: 'preset',
                                voiceId: minimaxVoiceId,
                                speed,
                                pitch,
                                vol
                            })
                            onClose()
                        }} className="glass-btn-base glass-btn-primary flex-1 py-2 rounded-lg text-sm font-medium">{t('confirm', { defaultValue: '确认' })}</button>
                    </div>
                </div>

                <MinimaxVoicePickerDialog
                    isOpen={isMinimaxDialogOpen}
                    onClose={() => setIsMinimaxDialogOpen(false)}
                    currentVoiceId={minimaxVoiceId}
                    onSelect={(id) => {
                        setMinimaxVoiceId(id)
                    }}
                />
            </>,
            document.body
        )
    }

    // 音色库选择 — 直接渲染 VoicePickerDialog
    if (activeTab === 'select' && subDialogOpen) {
        return (
            <VoicePickerDialog
                isOpen
                onClose={handleClose}
                onSelect={handleVoiceSelected}
            />
        )
    }

    // 上传/AI设计 — 渲染 VoiceCreationModal
    if ((activeTab === 'upload' || activeTab === 'design') && subDialogOpen) {
        return (
            <VoiceCreationModal
                isOpen
                folderId={null}
                initialVoiceName={speaker}
                onClose={handleClose}
                onSuccess={handleCreationSuccess}
            />
        )
    }

    // 主弹窗：Tab 切换
    return createPortal(
        <>
            <div className="fixed inset-0 z-[9999] glass-overlay" onClick={handleClose} />
            <div
                className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-surface-modal w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]">
                    <div className="flex items-center gap-2 min-w-0">
                        <AppIcon name="mic" className="w-5 h-5 text-[var(--glass-tone-info-fg)] shrink-0" />
                        <h2 className="font-semibold text-[var(--glass-text-primary)] truncate">
                            {t('title', { speaker })}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="glass-btn-base glass-btn-soft p-1 text-[var(--glass-text-tertiary)] shrink-0">
                        <AppIcon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {/* 描述 */}
                <div className="px-5 pt-4 pb-2">
                    <p className="text-sm text-[var(--glass-text-secondary)]">
                        {t('description')}
                    </p>
                </div>

                <div className="px-5 py-3">
                    <SegmentedControl
                        options={[
                            { value: 'select' as const, label: t('selectFromLibrary') },
                            { value: 'upload' as const, label: t('uploadAudio') },
                            { value: 'design' as const, label: t('aiDesign') },
                        ]}
                        value={activeTab}
                        onChange={(val) => handleTabClick(val as BindingTab)}
                    />
                </div>

                {/* Tab 内容区 — 显示描述和进入按钮 */}
                <div className="p-5">
                    <div className="text-center py-6">
                        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3 ${activeTab === 'select' ? 'bg-[var(--glass-tone-info-bg)]'
                            : activeTab === 'upload' ? 'bg-[var(--glass-tone-success-bg)]'
                                : 'bg-[var(--glass-accent-bg,var(--glass-tone-info-bg))]'
                            }`}>
                            <AppIcon
                                name={activeTab === 'select' ? 'mic' : activeTab === 'upload' ? 'cloudUpload' : 'idea'}
                                className={`w-6 h-6 ${activeTab === 'select' ? 'text-[var(--glass-tone-info-fg)]'
                                    : activeTab === 'upload' ? 'text-[var(--glass-tone-success-fg)]'
                                        : 'text-[var(--glass-accent-from,var(--glass-tone-info-fg))]'
                                    }`}
                            />
                        </div>
                        <p className="text-sm text-[var(--glass-text-secondary)] mb-4">
                            {activeTab === 'select' && t('selectFromLibraryDesc')}
                            {activeTab === 'upload' && t('uploadAudioDesc')}
                            {activeTab === 'design' && t('aiDesignDesc')}
                        </p>
                        <button
                            onClick={() => {
                                if (activeTab === 'upload' && !confirmUploadVoice()) return
                                setSubDialogOpen(true)
                            }}
                            className="glass-btn-base glass-btn-primary px-8 py-2.5 rounded-lg text-sm font-medium"
                        >
                            {activeTab === 'select' && t('selectFromLibrary')}
                            {activeTab === 'upload' && t('uploadAudio')}
                            {activeTab === 'design' && t('aiDesign')}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body,
    )
}
