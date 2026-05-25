'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import EmotionSettingsPanel from './EmotionSettingsPanel'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState, type TaskPresentationState } from '@/lib/task/presentation'
import { AppIcon } from '@/components/ui/icons'

const SPEAKER_COLORS = [
    { bg: 'bg-[var(--glass-tone-info-bg)]/80', text: 'text-[var(--glass-tone-info-fg)]' },
    { bg: 'bg-purple-500/15', text: 'text-purple-600 dark:text-purple-400' },
    { bg: 'bg-teal-500/15', text: 'text-teal-600 dark:text-teal-400' },
    { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400' },
    { bg: 'bg-pink-500/15', text: 'text-pink-600 dark:text-pink-400' },
    { bg: 'bg-indigo-500/15', text: 'text-indigo-600 dark:text-indigo-400' },
    { bg: 'bg-cyan-500/15', text: 'text-cyan-600 dark:text-cyan-400' },
    { bg: 'bg-rose-500/15', text: 'text-rose-600 dark:text-rose-400' },
]

function getSpeakerColorClass(speaker: string) {
    if (!speaker) return SPEAKER_COLORS[0];
    let hash = 0;
    for (let i = 0; i < speaker.length; i++) {
        hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
    }
    return SPEAKER_COLORS[Math.abs(hash) % SPEAKER_COLORS.length] || SPEAKER_COLORS[0];
}

interface VoiceLine {
    id: string
    lineIndex: number
    speaker: string
    content: string
    emotionPrompt: string | null
    emotionStrength: number | null
    audioUrl: string | null
    updatedAt: string | null
    lineTaskRunning: boolean
    matchedPanelId?: string | null
    matchedStoryboardId?: string | null
    matchedPanelIndex?: number | null
}

interface VoiceLineCardProps {
    line: VoiceLine
    isVoiceTaskRunning: boolean
    statusState?: TaskPresentationState | null
    isPlaying: boolean
    hasVoice: boolean
    onTogglePlay: (lineId: string, audioUrl: string) => void
    onDownload: (audioUrl: string) => void
    onGenerate: (lineId: string) => void
    onEdit: (line: VoiceLine) => void
    onLocatePanel?: (line: VoiceLine) => void
    onDelete: (lineId: string) => void
    onDeleteAudio: (lineId: string) => void
    onSaveEmotionSettings: (lineId: string, emotionPrompt: string | null, emotionStrength: number) => void
}

export default function VoiceLineCard({
    line,
    isVoiceTaskRunning,
    statusState,
    isPlaying,
    hasVoice,
    onTogglePlay,
    onDownload,
    onGenerate,
    onEdit,
    onLocatePanel,
    onDelete,
    onDeleteAudio,
    onSaveEmotionSettings
}: VoiceLineCardProps) {
    const t = useTranslations('voice')
    const [isEmotionExpanded, setIsEmotionExpanded] = useState(false)
    const hasPanelBinding = !!onLocatePanel && !!line.matchedStoryboardId && line.matchedPanelIndex !== null && line.matchedPanelIndex !== undefined
    const locateTitle = t("lineCard.locateVideo")
    const inlineStatusState = isVoiceTaskRunning
        ? resolveTaskPresentationState({
            phase: 'processing',
            intent: 'generate',
            resource: 'audio',
            hasOutput: !!line.audioUrl,
        })
        : statusState ?? null

    const speakerColor = getSpeakerColorClass(line.speaker)

    return (
        <div
            className={`relative glass-surface-elevated overflow-hidden transition-all hover:shadow-[var(--glass-shadow-md)] flex flex-col ${line.audioUrl ? 'ring-1 ring-[var(--glass-focus-ring)]/60' : hasVoice ? '' : 'ring-1 ring-[var(--glass-stroke-warning)]/60'
                }`}
        >
            <div className="flex flex-col sm:flex-row items-stretch p-3 gap-4">
                {/* 左侧：序号与角色 */}
                <div className="flex flex-col sm:w-40 shrink-0 border-r border-[var(--glass-stroke-base)]/60 pr-4">
                    <div className="text-xs text-[var(--glass-text-tertiary)] mb-1 font-medium">#{line.lineIndex}</div>
                    <div className={`inline-flex items-center px-2 py-1 ${speakerColor.bg} ${speakerColor.text} text-xs rounded-md font-medium w-max max-w-full truncate`} title={line.speaker}>
                        {line.speaker}
                    </div>
                    <div className="mt-2 text-[10px]">
                        {hasVoice ? (
                            <span className="text-[var(--glass-tone-success-fg)] font-medium">{t("lineCard.voiceConfigured")}</span>
                        ) : (
                            <span className="text-[var(--glass-tone-warning-fg)] font-medium">{t("lineCard.needVoice")}</span>
                        )}
                    </div>
                </div>

                {/* 中间：台词内容及情绪设置触发器 */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-sm text-[var(--glass-text-secondary)] leading-relaxed" title={line.content}>
                        {line.content}
                    </p>
                    {hasVoice && (
                        <button
                            onClick={() => setIsEmotionExpanded(!isEmotionExpanded)}
                            className="w-max mt-2 px-2 py-1 text-xs text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)] rounded flex items-center gap-1 font-medium transition-colors"
                        >
                            <AppIcon name="chevronDown" className={`w-3.5 h-3.5 transition-transform ${isEmotionExpanded ? 'rotate-180' : ''}`} />
                            {line.emotionPrompt || (line.emotionStrength !== null && line.emotionStrength !== 0.4)
                                ? t("lineCard.emotionConfigured")
                                : t("lineCard.emotionSettings")}
                        </button>
                    )}
                </div>

                {/* 右侧：操作区 */}
                <div className="flex items-center gap-4 shrink-0 sm:pl-4 sm:border-l sm:border-[var(--glass-stroke-base)]/60">
                    <div className="flex flex-col gap-2 items-end">
                        {/* 辅助操作区 (编辑、删除、定位) */}
                        <div className="flex items-center gap-1">
                            {hasPanelBinding && (
                                <button onClick={() => onLocatePanel?.(line)} className="px-2 py-1 flex items-center justify-center text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)] rounded transition-colors" title={locateTitle}>
                                    <span className="text-[11px] leading-none">{t("lineCard.locateVideo")}</span>
                                </button>
                            )}
                            <button onClick={() => onEdit(line)} className="p-1.5 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)] rounded transition-colors" title={t("lineCard.editLine")}>
                                <AppIcon name="editSquare" className="w-4 h-4" />
                            </button>
                            <button onClick={() => onDelete(line.id)} className="p-1.5 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-danger-fg)] hover:bg-[var(--glass-tone-danger-bg)] rounded transition-colors" title={t("lineCard.deleteLine")}>
                                <AppIcon name="trash" className="w-4 h-4" />
                            </button>
                            {line.audioUrl && (
                                <button onClick={() => onDeleteAudio(line.id)} className="p-1.5 text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-warning-fg)] hover:bg-[var(--glass-tone-warning-bg)] rounded transition-colors" title={t("lineCard.deleteAudio")}>
                                    <AppIcon name="close" className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* 生成与播放区 */}
                        <div className="flex items-center gap-2">
                            {line.audioUrl ? (
                                <>
                                    <button onClick={() => onTogglePlay(line.id, line.audioUrl!)} className="w-9 h-9 flex items-center justify-center bg-[var(--glass-tone-success-fg)] text-white rounded-xl hover:bg-[var(--glass-tone-success-fg)] transition-all shadow-[var(--glass-shadow-sm)]">
                                        {isPlaying ? <AppIcon name="pauseSolid" className="w-4 h-4" /> : <AppIcon name="play" className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => onGenerate(line.id)} disabled={isVoiceTaskRunning} className="w-8 h-8 flex items-center justify-center text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)] rounded-xl transition-all">
                                        {isVoiceTaskRunning ? <TaskStatusInline state={inlineStatusState} className="[&_span]:sr-only" /> : <AppIcon name="refresh" className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => onDownload(line.audioUrl!)} className="w-8 h-8 flex items-center justify-center text-[var(--glass-text-tertiary)] hover:text-[var(--glass-tone-info-fg)] hover:bg-[var(--glass-tone-info-bg)] rounded-xl transition-all">
                                        <AppIcon name="download" className="w-4 h-4" />
                                    </button>
                                </>
                            ) : isVoiceTaskRunning ? (
                                <div className="px-4 py-2 bg-[var(--glass-accent-from)] text-white rounded-xl text-sm font-medium shadow-[var(--glass-shadow-sm)]">
                                    <TaskStatusInline state={inlineStatusState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                                </div>
                            ) : (
                                <button onClick={() => onGenerate(line.id)} disabled={!hasVoice} className="px-5 py-2 bg-[var(--glass-accent-from)] text-white rounded-xl text-sm font-medium hover:bg-[var(--glass-accent-to)] shadow-[var(--glass-shadow-sm)] disabled:opacity-50 flex items-center gap-2 transition-all">
                                    <AppIcon name="mic" className="w-4 h-4" />
                                    {t("common.generate")}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 展开的情绪面板 */}
            {isEmotionExpanded && hasVoice && (
                <div className="border-t border-[var(--glass-stroke-base)]/60 bg-[var(--glass-bg-muted)]/30">
                    <EmotionSettingsPanel
                        lineId={line.id}
                        emotionPrompt={line.emotionPrompt}
                        emotionStrength={line.emotionStrength ?? 0.4}
                        onSave={onSaveEmotionSettings}
                        onGenerate={onGenerate}
                        isVoiceGenerationRunning={isVoiceTaskRunning}
                    />
                </div>
            )}
        </div>
    )
}
