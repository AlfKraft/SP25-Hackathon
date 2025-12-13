// src/pages/HackathonAdminDashboard.tsx
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HackathonAdminLayout } from './HackathonAdminLayout'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { API_URL } from '@/lib/config'

type OverviewDto = {
    registeredParticipants: number
    teamsCreated: number
}

export default function HackathonAdminDashboard() {
    const { id } = useParams<{ id: string }>()
    const hackathonId = Number(id)

    const [overview, setOverview] = useState<OverviewDto | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!hackathonId || Number.isNaN(hackathonId)) {
            setError('Invalid hackathon id')
            return
        }

        const fetchOverview = async () => {
            setLoading(true)
            setError(null)

            try {
                const res = await fetch(
                    `${API_URL}/api/admin/hackathons/${hackathonId}/overview`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    },
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to load overview')
                }

                const data: OverviewDto = await res.json()
                setOverview(data)
            } catch (e: any) {
                console.error('Failed to load overview', e)
                setError(e?.message ?? 'Failed to load overview')
            } finally {
                setLoading(false)
            }
        }

        void fetchOverview()
    }, [hackathonId])

    const formatValue = (value?: number) =>
        typeof value === 'number' ? value.toString() : '–'

    return (
        <HackathonAdminLayout>
            <section className="space-y-6 text-sky-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Overview</h2>
                        <p className="text-xs text-sky-100/70">
                            Quick status of registrations, questionnaire and teams.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="rounded-full bg-sky-500/90 px-4 text-sky-950 shadow-sm shadow-sky-500/40 hover:bg-sky-400"
                    >
                        Go to public page
                        <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>

                {error && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-100">
                        {error}
                    </div>
                )}

                {/* stats */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-sky-500/25 bg-slate-900/60 p-3 text-xs">
                        <p className="text-sky-100/70">Registered participants</p>
                        <p className="mt-2 text-2xl font-semibold text-sky-50">
                            {loading ? '…' : formatValue(overview?.registeredParticipants)}
                        </p>
                    </div>
                    <div className="rounded-xl border border-sky-500/25 bg-slate-900/60 p-3 text-xs">
                        <p className="text-sky-100/70">Teams</p>
                        <p className="mt-2 text-2xl font-semibold text-sky-50">
                            {loading ? '…' : formatValue(overview?.teamsCreated)}
                        </p>
                    </div>
                </div>
            </section>
        </HackathonAdminLayout>
    )
}
