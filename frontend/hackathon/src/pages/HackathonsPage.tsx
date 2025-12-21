import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function statusTone(status?: string) {
    const s = (status ?? '').toLowerCase()
    if (s === 'open' || s === 'active') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100'
    if (s === 'upcoming') return 'border-sky-400/30 bg-sky-500/10 text-sky-100'
    if (s === 'completed' || s === 'closed') return 'border-slate-400/30 bg-slate-500/10 text-slate-200'
    return 'border-slate-700 bg-slate-900/40 text-slate-200'
}

export default function HackathonsPage() {
    const { hackathons, currentHackathon, setCurrentHackathon, loading, error } = useHackathon()
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
            <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 backdrop-blur">
                    <div className="h-6 w-52 animate-pulse rounded bg-slate-800/60" />
                    <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-800/40" />
                    <div className="mt-6 space-y-3">
                        <div className="h-20 animate-pulse rounded-2xl bg-slate-900/50" />
                        <div className="h-20 animate-pulse rounded-2xl bg-slate-900/50" />
                        <div className="h-20 animate-pulse rounded-2xl bg-slate-900/50" />
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
                <div className="rounded-3xl border border-rose-500/30 bg-rose-950/20 p-6 text-rose-100 backdrop-blur">
                    <div className="text-sm font-semibold">Failed to load hackathons</div>
                    <div className="mt-1 text-xs text-rose-100/80">{error}</div>
                </div>
            </div>
        )
    }

    if (openHackathons.length === 0) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
                <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-8 text-center backdrop-blur">
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-50">Hackathons</h1>
                    <p className="mt-2 text-sm text-slate-300">There are no open hackathons at the moment.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8 md:py-10">
            {/* Header */}
            <header className="relative bg overflow-hidden rounded-3xl border border-sky-500/15 bg-slate-950/70 p-6 shadow-[0_20px_70px_rgba(2,6,23,0.6)] backdrop-blur">
                <div className="pointer-events-none absolute inset-0 opacity-80">
                    <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
                    <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
                </div>

                <div className="relative space-y-2">
                    <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent md:text-4xl">
                        Open hackathons
                    </h1>
                    <p className="text-sm text-slate-300">
                        Choose a hackathon and continue to registration.
                    </p>
                </div>
            </header>

            {/* List */}
            <div className="space-y-3">
                {openHackathons.map(hackathon => {
                    const hasOnsiteQuestionnaire =
                        (hackathon as any).hasOnsiteQuestionnaire || (hackathon as any).onsiteQuestionnaire

                    const dateRange = formatDateRange((hackathon as any).startDate, (hackathon as any).endDate)
                    const location = (hackathon as any).location as string | undefined

                    const selected = currentHackathon?.id === hackathon.id

                    return (
                        <Card
                            key={hackathon.id}
                            className={cn(
                                'rounded-2xl border bg-slate-950/60 px-4 py-4 backdrop-blur transition-all',
                                'border-slate-800 hover:border-slate-700 hover:bg-slate-950/75 hover:shadow-lg hover:shadow-slate-950/40',
                                selected && 'ring-2 ring-sky-500/70'
                            )}
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                {/* Left */}
                                <div className="min-w-0 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="min-w-0 text-base font-semibold text-slate-50">
                                            <span className="truncate">{hackathon.name}</span>
                                        </div>

                                        {hackathon.status && (
                                            <Badge
                                                variant="outline"
                                                className={cn('h-6 rounded-full px-2.5 text-[11px] font-semibold', statusTone(hackathon.status))}
                                            >
                                                {(hackathon.status as any).toString().toUpperCase()}
                                            </Badge>
                                        )}

                                        {hasOnsiteQuestionnaire && (
                                            <Badge
                                                variant="outline"
                                                className="h-6 rounded-full border-sky-500/25 bg-sky-500/10 px-2.5 text-[11px] font-semibold text-sky-100"
                                            >
                                                Questionnaire
                                            </Badge>
                                        )}
                                    </div>

                                    {(dateRange || location) && (
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                            {dateRange && (
                                                <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span className="whitespace-normal">{dateRange}</span>
                        </span>
                                            )}

                                            {location && (
                                                <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="whitespace-normal">{location}</span>
                        </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Right */}
                                <div className="shrink-0">
                                    <Button
                                        size="sm"
                                        className={cn(
                                            'rounded-full px-4',
                                            hasOnsiteQuestionnaire && 'bg-sky-500/90 text-sky-950 hover:bg-sky-400'
                                        )}
                                        onClick={() => handleSignUp(hackathon.id)}
                                    >
                                        {hasOnsiteQuestionnaire ? 'Questionnaire' : 'View details'}
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
