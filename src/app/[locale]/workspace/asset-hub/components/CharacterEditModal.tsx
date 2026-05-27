'use client'

/**
 * 资产中心 - 角色形象编辑弹窗
 * 现在作为共享 CharacterEditModal 的一个简单包装器以消除重复代码
 */

import { CharacterEditModal as SharedCharacterEditModal } from '@/components/shared/assets/CharacterEditModal'

interface CharacterEditModalProps {
    characterId: string
    characterName: string
    appearanceIndex: number
    changeReason: string
    description: string
    onClose: () => void
    onSave: () => void  // 触发生成图片
}

export function CharacterEditModal({
    characterId,
    characterName,
    appearanceIndex,
    changeReason,
    description,
    onClose,
    onSave
}: CharacterEditModalProps) {
    return (
        <SharedCharacterEditModal
            mode="asset-hub"
            characterId={characterId}
            characterName={characterName}
            appearanceIndex={appearanceIndex}
            changeReason={changeReason}
            description={description}
            onClose={onClose}
            onSave={() => onSave()}
        />
    )
}

export default CharacterEditModal
