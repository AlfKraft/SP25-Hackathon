import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, MapPin, Users, ArrowLeft, ClipboardList } from 'lucide-react'
import type { Hackathon } from '@/types/hackathon'

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

export default function HackathonDetailsPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const {
        hackathons,
        currentHackathon,
        selectHackathonById,
        loading,
        error,
    } = useHackathon()

    const hackathonId = Number(id)

    // Ensure the correct hackathon is selected in context when landing directly
    useEffect(() => {
        if (!Number.isNaN(hackathonId)) {
            selectHackathonById(hackathonId)
        }
    }, [hackathonId, selectHackathonById])

    const hackathon: Hackathon | null = useMemo(() => {
        if (currentHackathon && currentHackathon.id === hackathonId) {
            return currentHackathon
        }
        return hackathons.find(h => h.id === hackathonId) ?? null
    }, [currentHackathon, hackathons, hackathonId])

    const hasOnsiteQuestionnaire =
        hackathon &&
        ((hackathon as any).hasOnsiteQuestionnaire ||
            (hackathon as any).onsiteQuestionnaire)

    const participantCount = hackathon?.participants?.length ?? 0
    const maxParticipants = hackathon?.maxParticipants

    const handleBack = () => {
        navigate('/')
    }

    const handleSignUp = () => {
        if (!hackathon) return

        if (hasOnsiteQuestionnaire) {
            navigate(`/questionnaire?hackathonId=${hackathon.id}`)
        } else {
            // Fallback: could be a generic signup or info page
            // Adjust as your flows evolve
            navigate(`/questionnaire?hackathonId=${hackathon.id}`)
        }
    }

    if (loading && !hackathon) {
        return (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
                <p className="text-sm text-slate-300">Loading hackathon…</p>
            </div>
        )
    }

    if (error && !hackathon) {
        return (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-1 text-sky-100"
                    onClick={handleBack}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to hackathons
                </Button>
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    {error}
                </div>
            </div>
        )
    }

    if (!hackathon) {
        return (
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 md:p-8">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-1 text-sky-100"
                    onClick={handleBack}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to hackathons
                </Button>
                <p className="text-sm text-slate-300">Hackathon not found.</p>
            </div>
        )
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="h-8 w-8 rounded-full border border-sky-500/40 bg-slate-900/80 text-sky-100 hover:bg-slate-800/80 hover:text-sky-50"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
                            {hackathon.name}
                        </h1>
                        <p className="mt-1 text-xs text-sky-100/70">
                            {hackathon.theme || 'Hackathon event'}
                        </p>
                    </div>
                </div>

                <Badge
                    variant="outline"
                    className="h-7 rounded-full border-sky-400/50 bg-sky-500/15 text-[11px] font-semibold uppercase tracking-wide text-sky-100"
                >
                    {statusLabel(hackathon.status)}
                </Badge>
            </header>

            {/* Main card */}
            <Card className="border border-sky-500/20 bg-slate-950/80 shadow-[0_20px_60px_rgba(15,23,42,0.95)] backdrop-blur-xl">
                <CardContent className="space-y-6 p-4 md:p-6">
                    {/* Meta info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 text-sm text-sky-100/80">
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-sky-300" />
                                <span>{hackathon.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-sky-300" />
                                <div className="flex flex-col text-xs">
                                    <span>
                                        <span className="font-semibold text-sky-50">
                                            Starts:{' '}
                                        </span>
                                        {formatDateTime(hackathon.startDate)}
                                    </span>
                                    <span>
                                        <span className="font-semibold text-sky-50">
                                            Ends:{' '}
                                        </span>
                                        {formatDateTime(hackathon.endDate)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-sky-300" />
                                <span className="text-xs">
                                    {maxParticipants
                                        ? `${participantCount} / ${maxParticipants} participants`
                                        : `${participantCount} participants`}
                                </span>
                            </div>
                        </div>

                        {/* Sign up CTA */}
                        <div className="flex flex-col items-start justify-center gap-2 md:items-end">
                            <p className="text-[11px] text-sky-100/70">
                                Ready to join this hackathon?
                            </p>
                            <Button
                                size="sm"
                                className="flex items-center gap-2 rounded-full bg-sky-500/90 px-5 text-sky-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
                                onClick={handleSignUp}
                                disabled={hackathon.status === 'completed'}
                            >
                                <ClipboardList className="h-4 w-4" />
                                {hackathon.status === 'completed'
                                    ? 'Event finished'
                                    : hasOnsiteQuestionnaire
                                        ? 'Sign up / fill questionnaire'
                                        : 'Sign up'}
                            </Button>
                            {hackathon.status === 'completed' && (
                                <p className="text-[11px] text-sky-100/60">
                                    This hackathon has ended. Registration is closed.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <h2 className="text-sm font-semibold text-sky-50">
                            Description
                        </h2>
                        <p className="text-sm text-sky-100/80 whitespace-pre-line">
                            {hackathon.description}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
