import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Hackathon, Participant } from '@/types/hackathon'
import { API_URL } from '@/lib/config'

interface HackathonContextType {
    hackathons: Hackathon[]
    currentHackathon: Hackathon | null
    setCurrentHackathon: (hackathon: Hackathon | null) => void
    loading: boolean
    error: string | null
    refreshHackathons: () => Promise<void>
    addParticipant: (participant: Omit<Participant, 'id'>) => Promise<void>
    removeParticipant: (participantId: string) => Promise<void>
    updateParticipant: (participantId: string, updates: Partial<Participant>) => Promise<void>
    createHackathon: (data: Omit<Hackathon, 'id' | 'participants'>) => Promise<void>
    replaceCurrentHackathonParticipants: (participants: Participant[]) => void
}

const HackathonContext = createContext<HackathonContextType | undefined>(undefined)

export const useHackathon = () => {
    const context = useContext(HackathonContext)
    if (!context) {
        throw new Error('useHackathon must be used within a HackathonProvider')
    }
    return context
}

interface HackathonProviderProps {
    children: ReactNode
}

export const HackathonProvider: React.FC<HackathonProviderProps> = ({ children }) => {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [currentHackathon, setCurrentHackathon] = useState<Hackathon | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const refreshHackathons = async () => {
        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_URL}/api/hackathons`, {
                method: 'GET',
                credentials: 'include'
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || 'Failed to load hackathons')
            }

            const data: Hackathon[] = await response.json()
            setHackathons(data)

            // keep current selected by id if still present
            setCurrentHackathon(prev => {
                if (!prev) return null
                const found = data.find(h => h.id === prev.id)
                return found ?? null
            })
        } catch (err: any) {
            console.error('Failed to fetch hackathons', err)
            setError(err?.message ?? 'Failed to load hackathons')
            setHackathons([])
            setCurrentHackathon(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void refreshHackathons()
    }, [])

    const createHackathon = async (hackathonData: Omit<Hackathon, 'id' | 'participants'>) => {
        setError(null)
        try {
            const response = await fetch(`${API_URL}/api/hackathons`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(hackathonData)
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || 'Failed to create hackathon')
            }

            const created: Hackathon = await response.json()
            setHackathons(prev => [...prev, created])
            setCurrentHackathon(created)
        } catch (err: any) {
            console.error('Failed to create hackathon', err)
            setError(err?.message ?? 'Failed to create hackathon')
        }
    }

    const addParticipant = async (participantData: Omit<Participant, 'id'>) => {
        if (!currentHackathon) return

        setError(null)

        try {
            const response = await fetch(`${API_URL}/api/hackathons/${currentHackathon.id}/participants`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(participantData)
            })

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || 'Failed to add participant')
            }

            const created: Participant = await response.json()

            setHackathons(prev =>
                prev.map(h =>
                    h.id === currentHackathon.id
                        ? { ...h, participants: [...h.participants, created] }
                        : h
                )
            )

            setCurrentHackathon(prev =>
                prev ? { ...prev, participants: [...prev.participants, created] } : null
            )
        } catch (err: any) {
            console.error('Failed to add participant', err)
            setError(err?.message ?? 'Failed to add participant')
        }
    }

    const removeParticipant = async (participantId: string) => {
        if (!currentHackathon) return

        setError(null)

        try {
            await fetch(
                `${API_URL}/api/hackathons/${currentHackathon.id}/participants/${participantId}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            )

            setHackathons(prev =>
                prev.map(h =>
                    h.id === currentHackathon.id
                        ? {
                            ...h,
                            participants: h.participants.filter(p => p.id !== participantId)
                        }
                        : h
                )
            )

            setCurrentHackathon(prev =>
                prev
                    ? {
                        ...prev,
                        participants: prev.participants.filter(p => p.id !== participantId)
                    }
                    : null
            )
        } catch (err: any) {
            console.error('Failed to remove participant', err)
            setError(err?.message ?? 'Failed to remove participant')
        }
    }

    const updateParticipant = async (participantId: string, updates: Partial<Participant>) => {
        if (!currentHackathon) return

        setError(null)

        try {
            const response = await fetch(
                `${API_URL}/api/hackathons/${currentHackathon.id}/participants/${participantId}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                }
            )

            if (!response.ok) {
                const text = await response.text()
                throw new Error(text || 'Failed to update participant')
            }

            const updated: Participant = await response.json()

            setHackathons(prev =>
                prev.map(h =>
                    h.id === currentHackathon.id
                        ? {
                            ...h,
                            participants: h.participants.map(p => (p.id === participantId ? updated : p))
                        }
                        : h
                )
            )

            setCurrentHackathon(prev =>
                prev
                    ? {
                        ...prev,
                        participants: prev.participants.map(p =>
                            p.id === participantId ? updated : p
                        )
                    }
                    : null
            )
        } catch (err: any) {
            console.error('Failed to update participant', err)
            setError(err?.message ?? 'Failed to update participant')
        }
    }

    const replaceCurrentHackathonParticipants = (participants: Participant[]) => {
        if (!currentHackathon) return

        setHackathons(prev =>
            prev.map(h =>
                h.id === currentHackathon.id ? { ...h, participants } : h
            )
        )

        setCurrentHackathon(prev => (prev ? { ...prev, participants } : null))
    }

    const value: HackathonContextType = {
        hackathons,
        currentHackathon,
        setCurrentHackathon,
        loading,
        error,
        refreshHackathons,
        addParticipant,
        removeParticipant,
        updateParticipant,
        createHackathon,
        replaceCurrentHackathonParticipants
    }

    return <HackathonContext.Provider value={value}>{children}</HackathonContext.Provider>
}
