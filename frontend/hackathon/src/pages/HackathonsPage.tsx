import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'

function formatDateRange(start?: any, end?: any) {
    if (!start && !end) return null

    const fmt = new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    })

    const s = start ? fmt.format(new Date(start)) : null
    const e = end ? fmt.format(new Date(end)) : null

    if (s && e) return `${s} – ${e}`
    return s ?? e
}

export default function HackathonsPage() {
    const { hackathons, currentHackathon, setCurrentHackathon, loading, error } =
        useHackathon()

    const navigate = useNavigate()

    const openHackathons = useMemo(() => {
        // If your backend already sends only OPEN hackathons, this is still harmless.
        // If you *do* need filtering, do it here based on your real type values.
        return hackathons
    }, [hackathons])

    const handleSignUp = (hackathonId: number) => {
        const selected = openHackathons.find(h => h.id === hackathonId)
        if (!selected) return

        setCurrentHackathon?.(selected)

        const hasOnsiteQuestionnaire =
            (selected as any).hasOnsiteQuestionnaire || (selected as any).onsiteQuestionnaire

        if (hasOnsiteQuestionnaire) {
            navigate(`/questionnaire?hackathonId=${hackathonId}`)
        } else {
            navigate(`/hackathons/${hackathonId}`)
        }
    }

    if (loading) {
        return (
            <div className="w-full flex justify-center py-16">
                <p className="text-slate-300 text-sm">Loading hackathons…</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="w-full flex flex-col items-center py-16">
                <p className="text-red-400 text-sm mb-2">Failed to load hackathons</p>
                <p className="text-slate-400 text-xs">{error}</p>
            </div>
        )
    }

    if (openHackathons.length === 0) {
        return (
            <div className="w-full flex flex-col items-center py-16">
                <h1 className="text-3xl font-bold mb-2">Hackathons</h1>
                <p className="text-slate-300 mb-4">There are no open hackathons at the moment.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-4xl font-bold mb-2">Open hackathons</h1>
                <p className="text-lg text-muted-foreground">
                    Choose a hackathon and sign up to participate.
                </p>
            </div>

            <div className="space-y-3">
                {openHackathons.map(hackathon => {
                    const hasOnsiteQuestionnaire =
                        (hackathon as any).hasOnsiteQuestionnaire || (hackathon as any).onsiteQuestionnaire

                    const dateRange = formatDateRange(
                        (hackathon as any).startDate,
                        (hackathon as any).endDate,
                    )

                    const selected = currentHackathon?.id === hackathon.id

                    return (
                        <Card
                            key={hackathon.id}
                            className={[
                                'border-slate-800 bg-slate-950/60',
                                'rounded-2xl px-4 py-4',
                                'flex items-center justify-between gap-4',
                                selected ? 'ring-2 ring-sky-500' : '',
                            ].join(' ')}
                        >
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="text-base font-semibold text-slate-50 truncate">
                                                {hackathon.name}
                                            </div>

                                            {hackathon.status && (
                                                <Badge variant="outline" className="capitalize shrink-0">
                                                    {hackathon.status}
                                                </Badge>
                                            )}
                                        </div>

                                        {dateRange && (
                                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                                <Calendar className="h-3.5 w-3.5" />
                                                <span className="truncate">{dateRange}</span>
                                                {(hackathon as any).location && (
                                                    <>
                                                        <span className="text-slate-600">•</span>
                                                        <span className="truncate">{(hackathon as any).location}</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="shrink-0">
                                <Button size="sm" onClick={() => handleSignUp(hackathon.id)}>
                                    {hasOnsiteQuestionnaire ? 'Fill questionnaire' : 'View details'}
                                </Button>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
