import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from 'react'
import type { ReactNode } from 'react'
import { API_URL } from '@/lib/config'
import type { Hackathon, Participant } from '@/types/hackathon'
import {readApiError} from "@/types/apiError.ts";

interface HackathonContextType {
    hackathons: Hackathon[]
    currentHackathon: Hackathon | null
    loading: boolean
    error: string | null

    refreshHackathons: () => Promise<void>
    setCurrentHackathon: (hackathon: Hackathon | null) => void
    selectHackathonById: (id: number) => void

    createHackathon: (payload: Partial<Hackathon>) => Promise<Hackathon | null>

    addParticipant: (participant: Participant) => Promise<void>
    updateParticipant: (
        participantId: string | number,
        patch: Partial<Participant>,
    ) => Promise<void>
    removeParticipant: (participantId: string | number) => Promise<void>

    /**
     * Used by the old CSV import flow on HomePage to overwrite participants
     * of the currently selected hackathon.
     */
    replaceCurrentHackathonParticipants: (participants: Participant[]) => void
    loadParticipantsForHackathon: (hackathonId: number) => Promise<Participant[]>
}

const HackathonContext = createContext<HackathonContextType | undefined>(
    undefined,
)

interface Props {
    children: ReactNode
}

export function HackathonProvider({ children }: Props) {
    const [hackathons, setHackathons] = useState<Hackathon[]>([])
    const [currentHackathon, setCurrentHackathon] = useState<Hackathon | null>(
        null,
    )
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const loadParticipantsForHackathon = useCallback(
        async (hackathonId: number): Promise<Participant[]> => {
            try {
                const res = await fetch(
                    `${API_URL}/api/${hackathonId}/participants/all`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    },
                )

                if (!res.ok) {
                    throw new Error(await readApiError(res))
                }

                const participants: Participant[] = await res.json()

                // Update hackathons list
                setHackathons(prev =>
                    prev.map(h =>
                        h.id === hackathonId ? { ...h, participants } : h,
                    ),
                )

                // Update currentHackathon if it matches
                setCurrentHackathon(prev =>
                    prev && prev.id === hackathonId
                        ? { ...prev, participants }
                        : prev,
                )

                return participants
            } catch (e) {
                console.error('Error loading participants for hackathon', e)
                throw e
            }
        },
        [],
    )

    // Helper: keep hackathons[] and currentHackathon in sync
    const updateHackathonInState = useCallback(
        (updated: Hackathon) => {
            setHackathons(prev =>
                prev.map(h => (h.id === updated.id ? updated : h)),
            )
            setCurrentHackathon(prev =>
                prev && prev.id === updated.id ? updated : prev,
            )
        },
        [setHackathons, setCurrentHackathon],
    )

    const refreshHackathons = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/api/hackathons`, {
                method: 'GET',
                credentials: 'include',
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Failed to load hackathons')
            }

            const data: Hackathon[] = await res.json()
            setHackathons(data)

            // Use functional update so we don't depend on currentHackathon in the hook
            setCurrentHackathon(prev => {
                if (!prev) return null
                const stillExists = data.find(h => h.id === prev.id) || null
                return stillExists
            })
        } catch (e: any) {
            console.error('Error loading hackathons', e)
            setError(e?.message ?? 'Failed to load hackathons')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refreshHackathons()
    }, [refreshHackathons])

    const selectHackathonById = useCallback(
        (id: number) => {
            setCurrentHackathon(prev => {
                if (prev?.id === id) return prev
                const found = hackathons.find(h => h.id === id) ?? null
                return found
            })
        },
        [hackathons],
    )

    const createHackathon = useCallback(
        async (payload: Partial<Hackathon>): Promise<Hackathon | null> => {
            setError(null)
            try {
                const res = await fetch(`${API_URL}/api/hackathons`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to create hackathon')
                }

                const created: Hackathon = await res.json()
                // ✅ fixed bug: no more ".prev"
                setHackathons(prev => [...prev, created])

                // Optionally auto-select newly created hackathon
                setCurrentHackathon(created)

                return created
            } catch (e: any) {
                console.error('Error creating hackathon', e)
                setError(e?.message ?? 'Failed to create hackathon')
                return null
            }
        },
        [],
    )

    const addParticipant = useCallback(
        async (participant: Participant): Promise<void> => {
            if (!currentHackathon) {
                console.warn('addParticipant called without a currentHackathon')
                return
            }

            try {
                const res = await fetch(
                    `${API_URL}/api/hackathons/${currentHackathon.id}/participants`,
                    {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(participant),
                    },
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to add participant')
                }

                const created: Participant = await res.json()

                const updated: Hackathon = {
                    ...currentHackathon,
                    participants: [
                        ...(currentHackathon.participants ?? []),
                        created,
                    ] as Participant[],
                }

                updateHackathonInState(updated)
            } catch (e: any) {
                console.error('Error adding participant', e)
                throw e
            }
        },
        [currentHackathon, updateHackathonInState],
    )

    const updateParticipant = useCallback(
        async (
            participantId: string | number,
            patch: Partial<Participant>,
        ): Promise<void> => {
            if (!currentHackathon) {
                console.warn('updateParticipant called without a currentHackathon')
                return
            }

            const pid = String(participantId)

            try {
                const res = await fetch(
                    `${API_URL}/api/hackathons/${currentHackathon.id}/participants/${pid}`,
                    {
                        method: 'PUT',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(patch),
                    },
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to update participant')
                }

                const updatedParticipant: Participant = await res.json()

                const updated: Hackathon = {
                    ...currentHackathon,
                    participants: (currentHackathon.participants ?? []).map(p =>
                        String(p.id) === pid ? updatedParticipant : p,
                    ),
                }

                updateHackathonInState(updated)
            } catch (e: any) {
                console.error('Error updating participant', e)
                throw e
            }
        },
        [currentHackathon, updateHackathonInState],
    )

    const removeParticipant = useCallback(
        async (participantId: string | number): Promise<void> => {
            if (!currentHackathon) {
                console.warn('removeParticipant called without a currentHackathon')
                return
            }

            const pid = String(participantId)

            try {
                const res = await fetch(
                    `${API_URL}/api/hackathons/${currentHackathon.id}/participants/${pid}`,
                    {
                        method: 'DELETE',
                        credentials: 'include',
                    },
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to delete participant')
                }

                const updated: Hackathon = {
                    ...currentHackathon,
                    participants: (currentHackathon.participants ?? []).filter(
                        p => String(p.id) !== pid,
                    ),
                }

                updateHackathonInState(updated)
            } catch (e: any) {
                console.error('Error deleting participant', e)
                throw e
            }
        },
        [currentHackathon, updateHackathonInState],
    )

    const replaceCurrentHackathonParticipants = useCallback(
        (participants: Participant[]) => {
            if (!currentHackathon) {
                console.warn(
                    'replaceCurrentHackathonParticipants called without a currentHackathon',
                )
                return
            }

            const updated: Hackathon = {
                ...currentHackathon,
                participants,
            }

            updateHackathonInState(updated)
        },
        [currentHackathon, updateHackathonInState],
    )

    const value: HackathonContextType = {
        hackathons,
        currentHackathon,
        loading,
        error,

        refreshHackathons,
        setCurrentHackathon,
        selectHackathonById,

        createHackathon,

        addParticipant,
        updateParticipant,
        removeParticipant,

        replaceCurrentHackathonParticipants,
        loadParticipantsForHackathon
    }

    return (
        <HackathonContext.Provider value={value}>
            {children}
        </HackathonContext.Provider>
    )
}

export function useHackathon(): HackathonContextType {
    const ctx = useContext(HackathonContext)
    if (!ctx) {
        throw new Error('useHackathon must be used within a HackathonProvider')
    }
    return ctx
}
