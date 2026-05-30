'use client'

import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { ARK_SYSTEM_VOICES, ArkVoice } from '@/lib/constants/ark-voices'

interface ArkVoicePickerDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (voiceId: string) => void
    currentVoiceId?: string
}

export default function ArkVoicePickerDialog({ isOpen, onClose, onSelect, currentVoiceId }: ArkVoicePickerDialogProps) {
    const t = useTranslations('assetHub')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedTag, setSelectedTag] = useState<string | null>(null)
    const [playingId, setPlayingId] = useState<string | null>(null)
    const [customVoiceId, setCustomVoiceId] = useState('')

    // 提取所有标签供过滤
    const allTags = useMemo(() => {
        const tags = new Set<string>()
        ARK_SYSTEM_VOICES.forEach(v => {
            v.tags.forEach(tag => tags.add(tag))
        })
        return Array.from(tags)
    }, [])

    // 过滤列表
    const filteredVoices = useMemo(() => {
        return ARK_SYSTEM_VOICES.filter(voice => {
            const matchesSearch = voice.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  voice.description.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesTag = selectedTag ? voice.tags.includes(selectedTag) : true
            return matchesSearch && matchesTag
        })
    }, [searchQuery, selectedTag])

    const handleSelect = (voiceId: string) => {
        onSelect(voiceId)
        onClose()
    }

    const handlePlay = (voice: ArkVoice, e: React.MouseEvent) => {
        e.stopPropagation()
        // 此处如果后续接入真实的 previewUrl，可以播放。当前使用占位交互
        if (playingId === voice.id) {
            setPlayingId(null)
        } else {
            setPlayingId(voice.id)
            // Mock auto stop
            setTimeout(() => setPlayingId(null), 3000)
        }
    }

    if (!isOpen) return null
    if (typeof document === 'undefined') return null

    const dialogContent = (
        <>
            <div className="fixed inset-0 z-[9999] glass-overlay" onClick={onClose} />
            <div className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-surface-modal w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)]">
                    <h2 className="text-xl font-semibold text-[var(--glass-text-primary)]">选择系统音色</h2>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--glass-bg-muted)] rounded-lg text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-primary)] transition-colors">
                        <AppIcon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {/* 过滤区 */}
                <div className="px-6 py-4 border-b border-[var(--glass-stroke-base)] flex flex-col gap-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--glass-text-tertiary)]">
                                <AppIcon name="search" className="w-4 h-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="搜索音色名称、描述..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-base)] rounded-xl text-sm text-[var(--glass-text-primary)] focus:outline-none focus:border-[var(--glass-stroke-focus)] focus:ring-1 focus:ring-[var(--glass-stroke-focus)]"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                        <span className="text-xs text-[var(--glass-text-secondary)] whitespace-nowrap">热门标签：</span>
                        <button
                            onClick={() => setSelectedTag(null)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${!selectedTag ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'border-dashed border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:border-[var(--glass-stroke-focus)] hover:text-[var(--glass-text-primary)]'}`}
                        >
                            全部
                        </button>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setSelectedTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${selectedTag === tag ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)]' : 'border-dashed border-[var(--glass-stroke-base)] text-[var(--glass-text-secondary)] hover:border-[var(--glass-stroke-focus)] hover:text-[var(--glass-text-primary)]'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 自定义 Voice ID 输入区 */}
                <div className="px-6 py-4 border-b border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface)]/50 flex items-end gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-[var(--glass-text-secondary)] block mb-1.5">未找到想要的音色？手动输入 Voice ID</label>
                        <input 
                            type="text" 
                            placeholder="例如：zh_female_shuangkuaisisi_moon_bigtts" 
                            value={customVoiceId}
                            onChange={e => setCustomVoiceId(e.target.value)}
                            className="w-full px-3 py-2 bg-[var(--glass-bg-surface)] border border-[var(--glass-stroke-base)] rounded-lg text-sm focus:border-[var(--glass-stroke-focus)] focus:ring-1 focus:ring-[var(--glass-stroke-focus)] outline-none transition-shadow"
                        />
                    </div>
                    <button 
                        disabled={!customVoiceId.trim()}
                        onClick={() => handleSelect(customVoiceId.trim())}
                        className="px-5 py-2 bg-[var(--glass-tone-info-fg)] text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-opacity hover:opacity-90"
                    >
                        直接使用
                    </button>
                </div>

                {/* 列表区 */}
                <div className="flex-1 overflow-y-auto p-6 bg-[var(--glass-bg-surface)]">
                    {filteredVoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--glass-text-tertiary)]">
                            <AppIcon name="search" className="w-12 h-12 mb-4 opacity-50" />
                            <p>没有找到匹配的音色</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredVoices.map(voice => {
                                const isSelected = currentVoiceId === voice.id
                                const isPlaying = playingId === voice.id
                                
                                return (
                                    <div 
                                        key={voice.id}
                                        onClick={() => handleSelect(voice.id)}
                                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                            isSelected 
                                            ? 'border-[var(--glass-stroke-focus)] bg-[var(--glass-tone-info-bg)]/20 shadow-[0_0_0_1px_var(--glass-stroke-focus)]' 
                                            : 'border-transparent bg-[var(--glass-bg-surface-strong)] hover:border-[var(--glass-stroke-base)] hover:bg-[var(--glass-bg-surface-hover)]'
                                        }`}
                                    >
                                        <div className="flex flex-1 items-center gap-4 overflow-hidden pr-4">
                                            <div className="relative w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 bg-gradient-to-br from-[var(--glass-tone-info-bg)] to-[var(--glass-tone-success-bg)] border border-[var(--glass-stroke-base)]">
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 z-10" onClick={(e) => handlePlay(voice, e)}>
                                                    <AppIcon name={isPlaying ? 'pause' : 'play'} className="w-6 h-6 text-white" />
                                                </div>
                                                {/* Generic avatar icon based on gender */}
                                                <AppIcon name={voice.gender === 'male' ? 'user' : 'user'} className="w-8 h-8 text-[var(--glass-text-secondary)] opacity-50 group-hover:blur-[2px] transition-all" />
                                            </div>
                                            <div className="flex flex-col gap-1.5 overflow-hidden">
                                                <h4 className="text-[15px] font-semibold text-[var(--glass-text-primary)] truncate">{voice.name}</h4>
                                                <p className="text-[13px] text-[var(--glass-text-secondary)] truncate">{voice.description}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] font-medium">{voice.language}</span>
                                                    {voice.accent && (
                                                        <span className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] font-medium">{voice.accent}</span>
                                                    )}
                                                    {voice.tags.slice(0, 2).map(tag => (
                                                        <span key={tag} className="px-2 py-0.5 rounded-md text-[11px] bg-[var(--glass-tone-info-bg)]/50 text-[var(--glass-tone-info-fg)] font-medium">#{tag}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 flex-shrink-0">
                                            {isSelected ? (
                                                <div className="px-4 py-2 rounded-full text-sm font-medium bg-[var(--glass-tone-info-fg)] text-white">
                                                    已选
                                                </div>
                                            ) : (
                                                <div className="px-4 py-2 rounded-full text-sm font-medium bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] group-hover:bg-[var(--glass-tone-info-fg)] group-hover:text-white transition-colors">
                                                    选择
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    )

    return createPortal(dialogContent, document.body)
}
