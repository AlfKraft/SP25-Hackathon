import { useNavigate } from 'react-router-dom'
import { useHackathon } from '@/contexts/HackathonContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users } from 'lucide-react'

export default function HackathonsPage() {
    const {
        hackathons,
        currentHackathon,
        setCurrentHackathon,
        loading,
        error,
    } = useHackathon()

    const navigate = useNavigate()

    const handleSignUp = (hackathonId: number) => {
        const selected = hackathons.find((h) => h.id === hackathonId)
        if (!selected) return

        // still useful to keep in context if your questionnaire or other pages need it
        setCurrentHackathon?.(selected)

        const hasOnsiteQuestionnaire =
            (selected as any).hasOnsiteQuestionnaire ||
            (selected as any).onsiteQuestionnaire

        if (hasOnsiteQuestionnaire) {
            // Adjust this route to whatever your questionnaire page actually is
            navigate(`/questionnaire?hackathonId=${hackathonId}`)
        } else {
            // Fallback: public hackathon page or details
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
                <p className="text-red-400 text-sm mb-2">
                    Failed to load hackathons
                </p>
                <p className="text-slate-400 text-xs">{error}</p>
            </div>
        )
    }

    if (hackathons.length === 0) {
        return (
            <div className="w-full flex flex-col items-center py-16">
                <h1 className="text-3xl font-bold mb-2">Hackathons</h1>
                <p className="text-slate-300 mb-4">
                    There are no open hackathons at the moment.
                </p>
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
                {hackathons.map((hackathon) => {
                    const hasOnsiteQuestionnaire =
                        (hackathon as any).hasOnsiteQuestionnaire ||
                        (hackathon as any).onsiteQuestionnaire

                    return (
                        <Card
                            key={hackathon.id}
                            className={`border-slate-800 bg-slate-950/60 ${
                                currentHackathon?.id === hackathon.id
                                    ? 'ring-2 ring-sky-500'
                                    : ''
                            }`}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xl">
                                        {hackathon.name}
                                    </CardTitle>

                                    {hackathon.status && (
                                        <Badge
                                            variant="outline"
                                            className="capitalize"
                                        >
                                            {hackathon.status}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                    {hackathon.description}
                                </p>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {hackathon.location}
                                    </span>

                                    {Array.isArray(hackathon.participants) && (
                                        <span className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            {hackathon.participants.length}
                                            {hackathon.maxParticipants
                                                ? ` / ${hackathon.maxParticipants}`
                                                : ''}{' '}
                                            participants
                                        </span>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            handleSignUp(hackathon.id)
                                        }
                                    >
                                        {hasOnsiteQuestionnaire
                                            ? 'Fill questionnaire'
                                            : 'View details'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
