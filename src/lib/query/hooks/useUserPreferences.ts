'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-fetch'

export function useUserPreferences() {
    return useQuery({
        queryKey: ['userPreferences'],
        queryFn: async () => {
            const response = await apiFetch('/api/user-preference')
            if (!response.ok) {
                throw new Error('Failed to fetch user preferences')
            }
            const data = await response.json()
            return data.preference
        },
    })
}
