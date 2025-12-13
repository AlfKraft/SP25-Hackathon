// src/pages/HackathonsPage.tsx
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Calendar, Users, MapPin, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HackathonsPage() {
    const { hackathons, currentHackathon, setCurrentHackathon, loading, error } = useHackathon()
    const navigate = useNavigate()

    const openHackathons = useMemo(() => {
        // If your backend already filters to OPEN, keep as-is.
        // Otherwise you can filter here (depends on your status naming).
        return hackathons
    }, [hackathons])

    const handleSignUp = (hackathonId: number) => {
        const selected = hackathons.find(h => h.id === hackathonId)
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

    const formatDateRange = (start?: any, end?: any) => {
        // Your Hackathon type might be Date or string depending on backend mapping.
        const s = start ? new Date(start).toLocaleString() : 'TBA'
        const e = end ? new Date(end).toLocaleString() : 'TBA'
        return `${s} → ${e}`
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

            <div className="grid gap-4 md:grid-cols-2">
                {openHackathons.map(h => {
                    const hasOnsiteQuestionnaire =
                        (h as any).hasOnsiteQuestionnaire || (h as any).onsiteQuestionnaire

                    const isSelected = currentHackathon?.id === h.id

                    const participantsCount = Array.isArray((h as any).participants)
                        ? (h as any).participants.length
                        : undefined

                    return (
                        <Card
                            key={h.id}
                            className={cn(
                                // Admin card vibe
                                'group flex flex-col border border-sky-500/10 bg-slate-900/60',
                                'shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl transition-all',
                                'hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-[0_24px_70px_rgba(8,47,73,0.9)]',
                                // Selected ring (like your old page, but more subtle)
                                isSelected && 'ring-2 ring-sky-500/70'
                            )}
                        >
                            <CardHeader className="pb-2">
                                <CardTitle className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate text-base font-semibold text-sky-50">{h.name}</span>

                                            {h.status && (
                                                <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
                          {String(h.status)}
                        </span>
                                            )}

                                            {hasOnsiteQuestionnaire && (
                                                <span className="hidden sm:inline-flex rounded-full border border-indigo-400/50 bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-100">
                          Questionnaire
                        </span>
                                            )}
                                        </div>

                                        <p className="mt-1 line-clamp-2 text-xs text-sky-100/70">
                                            {h.description || '—'}
                                        </p>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-2 text-xs text-sky-100/80">
                                <p className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-sky-200/70" />
                                    <span className="font-medium text-sky-50">Location:</span>
                                    <span className="truncate">{h.location || 'TBA'}</span>
                                </p>

                                <p className="flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5 text-sky-200/70" />
                                    <span className="font-medium text-sky-50">Dates:</span>
                                    <span className="truncate">{formatDateRange((h as any).startDate, (h as any).endDate)}</span>
                                </p>

                                {typeof participantsCount === 'number' && (
                                    <p className="flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5 text-sky-200/70" />
                                        <span className="font-medium text-sky-50">Participants:</span>
                                        <span>
                      {participantsCount}
                                            {(h as any).maxParticipants ? ` / ${(h as any).maxParticipants}` : ''}
                    </span>
                                    </p>
                                )}
                            </CardContent>

                            <CardFooter className="flex items-center justify-between gap-3 pt-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                        'flex flex-1 items-center justify-center gap-2 rounded-full',
                                        'border-sky-500/50 bg-slate-900/60 text-sky-100',
                                        'hover:bg-slate-800/80 hover:text-sky-50'
                                    )}
                                    onClick={() => handleSignUp(h.id)}
                                >
                                    {hasOnsiteQuestionnaire ? (
                                        <>
                                            <ClipboardCheck className="h-4 w-4" />
                                            Fill questionnaire
                                        </>
                                    ) : (
                                        'View details'
                                    )}
                                </Button>
                            </CardFooter>

                            {/* little glow line like admin cards */}
                            <div className="pointer-events-none mx-4 mb-3 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
