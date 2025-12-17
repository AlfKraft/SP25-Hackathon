import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowLeft, ClipboardList, RefreshCw } from 'lucide-react'
import type { Hackathon } from '@/types/hackathon'
import { cn } from '@/lib/utils'

function formatDateTime(value: unknown): string {
    if (!value) return 'TBA'
    try {
        const d = value instanceof Date ? value : new Date(value as string)
        if (Number.isNaN(d.getTime())) return 'TBA'
        return d.toLocaleString()
    } catch {
        return 'TBA'
    }
}

function statusLabel(status: Hackathon['status']): string {
    switch (status) {
        case 'upcoming':
            return 'Upcoming'
        case 'active':
            return 'Active'
        case 'completed':
            return 'Completed'
        default:
            return String(status ?? '').toUpperCase()
    }
}

function statusStyles(status: Hackathon['status']) {
    switch (status) {
        case 'active':
            return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
        case 'upcoming':
            return 'border-sky-400/40 bg-sky-500/10 text-sky-100'
        case 'completed':
            return 'border-slate-400/30 bg-slate-500/10 text-slate-200'
        default:
            return 'border-sky-400/40 bg-sky-500/10 text-sky-100'
    }
}

function StatPill({
                      icon: Icon,
                      label,
                      value,
                      wrapValue = false,
                  }: {
    icon: React.ElementType
    label: string
    value: string
    wrapValue?: boolean
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-200">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-400">{label}</div>
                <div
                    className={cn(
                        'text-sm font-semibold text-slate-100',
                        wrapValue ? 'whitespace-normal break-words' : 'truncate'
                    )}
                >
                    {value}
                </div>
            </div>
        </div>
    )
}

function Shell({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8 md:py-10">{children}</div>
}

function BackButton({ onClick }: { onClick: () => void }) {
    return (
        <Button variant="ghost" size="sm" className="w-fit gap-2 text-sky-100 hover:bg-slate-900/60" onClick={onClick}>
            <ArrowLeft className="h-4 w-4" />
            Back
        </Button>
    )
}

export default function HackathonDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const { hackathons, currentHackathon, selectHackathonById, loading, error } = useHackathon()

    const hackathonId = Number(id)
    const invalidId = !id || Number.isNaN(hackathonId)

    useEffect(() => {
        if (!invalidId) {
            selectHackathonById(hackathonId)
        }
    }, [hackathonId, selectHackathonById, invalidId])

    const hackathon: Hackathon | null = useMemo(() => {
        if (invalidId) return null
        if (currentHackathon && currentHackathon.id === hackathonId) return currentHackathon
        return hackathons.find(h => h.id === hackathonId) ?? null
    }, [currentHackathon, hackathons, hackathonId, invalidId])


    const participantCount = hackathon?.participantCount ?? 0
    const maxParticipants = hackathon?.maxParticipants

    const handleBack = () => navigate(-1)
    const handleRetry = () => {
        if (!invalidId) selectHackathonById(hackathonId)
    }

    const canQuestionnaire = !!hackathon && hackathon.questionnaireSource === 'INTERNAL'
    const questionnaireDisabled = hackathon?.status === 'completed'

    const handleQuestionnaire = () => {
        if (!hackathon) return
        navigate(`/hackathons/${hackathon.id}/questionnaire`)
    }

    if (invalidId) {
        return (
            <Shell>
                <div className="space-y-4">
                    <BackButton onClick={handleBack} />
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
                        Invalid hackathon id in URL.
                    </div>
                </div>
            </Shell>
        )
    }

    if (loading && !hackathon) {
        return (
            <Shell>
                <div className="space-y-6">
                    <BackButton onClick={handleBack} />
                    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                        <div className="h-6 w-64 animate-pulse rounded bg-slate-800/60" />
                        <div className="mt-2 h-4 w-40 animate-pulse rounded bg-slate-800/40" />
                        <div className="mt-6 grid gap-3 md:grid-cols-3">
                            <div className="h-16 animate-pulse rounded-2xl bg-slate-900/50" />
                            <div className="h-16 animate-pulse rounded-2xl bg-slate-900/50" />
                            <div className="h-16 animate-pulse rounded-2xl bg-slate-900/50" />
                        </div>
                        <div className="mt-6 space-y-2">
                            <div className="h-4 w-28 animate-pulse rounded bg-slate-800/40" />
                            <div className="h-4 w-full animate-pulse rounded bg-slate-900/40" />
                            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-900/40" />
                        </div>
                    </div>
                </div>
            </Shell>
        )
    }

    if (error && !hackathon) {
        return (
            <Shell>
                <div className="space-y-4">
                    <BackButton onClick={handleBack} />
                    <div className="rounded-2xl border border-rose-500/35 bg-rose-950/25 p-4 text-sm text-rose-100">
                        {error}
                    </div>
                    <Button variant="outline" size="sm" className="w-fit gap-2" onClick={handleRetry}>
                        <RefreshCw className="h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </Shell>
        )
    }

    if (!hackathon) {
        return (
            <Shell>
                <div className="space-y-4">
                    <BackButton onClick={handleBack} />
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                        Hackathon not found.
                    </div>
                </div>
            </Shell>
        )
    }

    return (
        <Shell>
            <div className="space-y-6">
                {/* Header */}
                <header className="relative overflow-hidden rounded-3xl border border-sky-500/15 bg-slate-950/70 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.6)] backdrop-blur-xl md:p-7">
                    <div className="pointer-events-none absolute inset-0 opacity-80">
                        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
                        <div className="absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
                    </div>

                    <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                            <BackButton onClick={handleBack} />

                            <div className="space-y-1">
                                <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent md:text-3xl">
                                    {hackathon.name}
                                </h1>
                                <p className="text-xs text-slate-300">{hackathon.theme || 'Hackathon event'}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'h-7 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wide',
                                        statusStyles(hackathon.status)
                                    )}
                                >
                                    {statusLabel(hackathon.status)}
                                </Badge>

                                {hackathon.questionnaireSource === 'INTERNAL' && (
                                    <Badge
                                        variant="outline"
                                        className="h-7 rounded-full border-sky-500/25 bg-sky-500/10 px-3 text-[11px] font-semibold text-sky-100"
                                    >
                                        Questionnaire available
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Single CTA: Questionnaire */}
                        <div className="relative flex flex-col gap-2 md:items-end">
                            {canQuestionnaire ? (
                                <>

                                    {questionnaireDisabled && (
                                        <div className="text-[11px] text-slate-400">
                                            This hackathon has ended. Questionnaire is closed.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-[12px] text-slate-300 md:text-right">
                                    Questionnaire is not available for this event.
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Stats */}
                <div className="grid gap-3 md:grid-cols-3">
                    <StatPill icon={MapPin} label="Location" value={hackathon.location || 'TBA'} />
                    <StatPill
                        icon={Calendar}
                        label="Dates"
                        value={`${formatDateTime(hackathon.startDate)} → ${formatDateTime(hackathon.endDate)}`}
                        wrapValue
                    />
                    <StatPill
                        icon={Users}
                        label="Participants"
                        value={maxParticipants ? `${participantCount} / ${maxParticipants}` : `${participantCount}`}
                    />
                </div>

                {/* Description */}
                <Card className="border border-slate-800 bg-slate-950/70 shadow-[0_20px_60px_rgba(2,6,23,0.55)] backdrop-blur-xl">
                    <CardContent className="space-y-3 p-5 md:p-7">
                        <h2 className="text-sm font-semibold text-slate-50">Description</h2>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200/80">
                            {hackathon.description || 'No description provided.'}
                        </p>

                        {canQuestionnaire && !questionnaireDisabled && (
                            <div className="pt-2">
                                <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-sky-500/15 bg-sky-500/5 p-4 md:flex-row md:items-center">
                                    <div className="text-sm text-slate-200">
                                        <div className="font-semibold text-slate-50">Fill the questionnaire</div>
                                        <div className="text-xs text-slate-300">
                                            You’ll complete a short form to register for this hackathon.
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="rounded-full bg-sky-500/90 px-5 text-sky-950 shadow-lg shadow-sky-500/35 hover:bg-sky-400"
                                        onClick={handleQuestionnaire}
                                    >
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        Questionnaire
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Shell>
    )
}
