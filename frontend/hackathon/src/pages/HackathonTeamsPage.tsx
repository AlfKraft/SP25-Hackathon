import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, Shuffle, Users, Info, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { TeamsBoard } from '@/components/features/TeamsBoard'
import { API_URL } from '@/lib/config'
import {readApiError} from "@/types/apiError.ts";

export interface TeamMember {
    participant: Participant
    role: string
    skills: string
    motivation: number
    yearsExperience: number
}

export interface Team {
    id: string
    name: string
    score: number
    generationId: string
    createdAt: string
    members: TeamMember[]
}

export interface Participant {
    id: number
    email: string
    firstName: string
    lastName: string
}

// payload shape for /move-member
type MoveMemberPayload = {
    fromTeamId: string
    toTeamId: string
    participantId: number
}

function clampInt(n: number, min: number, max: number) {
    if (Number.isNaN(n)) return min
    return Math.max(min, Math.min(max, Math.trunc(n)))
}

export default function HackathonTeamsPage() {
    // Be robust: accept either :hackathonId or :id from the route
    const params = useParams()
    const rawHackathonId = params.hackathonId ?? params.id
    const navigate = useNavigate()

    // Builder state (generated / working teams)
    const [teamSizeRaw, setTeamSizeRaw] = useState<string>('4')
    const [loadingGenerate, setLoadingGenerate] = useState(false)
    const [teams, setTeams] = useState<Team[]>([])

    // Compiled (already saved) teams
    const [compiledTeams, setCompiledTeams] = useState<Team[]>([])
    const [, setCompiledLoading] = useState(false)
    const [, setCompiledError] = useState<string | null>(null)

    const teamSize = useMemo(() => clampInt(Number(teamSizeRaw), 1, 20), [teamSizeRaw])

    // If route is wrong, complain loudly instead of silently breaking the button
    if (!rawHackathonId) {
        return (
            <div className="mx-auto max-w-4xl p-6">
                <h1 className="text-xl font-semibold text-rose-300">Missing hackathonId in route</h1>
                <p className="mt-2 text-sm text-slate-300">
                    This page expects a route like{' '}
                    <code className="rounded bg-slate-800 px-1 py-0.5 font-mono">
                        /admin/hackathons/:hackathonId/teams
                    </code>
                    . Current params: {JSON.stringify(params)}
                </p>
            </div>
        )
    }

    const hackathonId = rawHackathonId

    // ---------------------------------------------------------------------------
    // Load teams from backend
    // ---------------------------------------------------------------------------

    const fetchTeams = useCallback(async () => {
        setCompiledLoading(true)
        setCompiledError(null)

        try {
            const res = await fetch(`${API_URL}/api/${hackathonId}/teams`, {
                method: 'GET',
                credentials: 'include',
            })

            if (!res.ok) {
                throw new Error(await readApiError(res))
            }

            const data: Team[] = await res.json()
            setCompiledTeams(data)
            // Builder works on the same data snapshot
            setTeams(data)
        } catch (e: any) {
            console.error('Failed to load teams', e)
            setCompiledError(e?.message ?? 'Failed to load teams')
        } finally {
            setCompiledLoading(false)
        }
    }, [hackathonId])

    useEffect(() => {
        void fetchTeams()
    }, [fetchTeams])

    // ---------------------------------------------------------------------------
    // Generate teams: POST /api/{hackathonId}/teams/generate?teamSize=4
    // ---------------------------------------------------------------------------

    const handleGenerateTeams = async () => {
        const size = teamSize

        if (!size || size <= 0) {
            toast.error('Team size must be a positive number')
            return
        }

        setLoadingGenerate(true)

        try {
            const url = `${API_URL}/api/${hackathonId}/teams/generate?teamSize=${size}`
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include',
            })

            if (!response.ok) {
                throw new Error(await readApiError(response))
            }

            await fetchTeams()
            toast.success('Teams generated')
        } catch (e: any) {
            console.error('Failed to generate teams', e)
            toast.error(e?.message ?? 'Failed to generate teams')
        } finally {
            setLoadingGenerate(false)
        }
    }

    const handleMoveMember = async (payload: MoveMemberPayload) => {
        try {
            const res = await fetch(`${API_URL}/api/${hackathonId}/teams/move-member`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fromTeamId: payload.fromTeamId,
                    toTeamId: payload.toTeamId,
                    participantId: payload.participantId,
                }),
            })

            if (!res.ok) {
                const text = await res.text()
                console.error('Move-member failed', text)
                toast.error('Failed to move member')
            }

            await fetchTeams()
        } catch (e) {
            console.error('Move-member error', e)
            toast.error('Failed to move member')
            await fetchTeams()
        }
    }

    // PATCH /api/{hackathonId}/teams/{teamId}
    const handleRenameTeam = async (teamId: string, newName: string) => {
        if (!newName.trim()) return

        try {
            const res = await fetch(`${API_URL}/api/${hackathonId}/teams/${teamId}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName }),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Failed to rename team')
            }

            await fetchTeams()
            toast.success('Team renamed')
        } catch (e: any) {
            console.error('Rename team failed', e)
            toast.error(e?.message ?? 'Failed to rename team')
        }
    }

    // DELETE /api/{hackathonId}/teams/{teamId}/members/{participantId}
    const handleRemoveMember = async (teamId: string, participantId: number) => {
        try {
            const res = await fetch(
                `${API_URL}/api/${hackathonId}/teams/${teamId}/members/${participantId}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                },
            )

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Failed to remove member')
            }

            await fetchTeams()
            toast.success('Member removed from team')
        } catch (e: any) {
            console.error('Remove member failed', e)
            toast.error(e?.message ?? 'Failed to remove member')
        }
    }

    // DELETE /api/{hackathonId}/teams/{teamId}
    const handleDeleteTeam = async (teamId: string) => {
        try {
            const res = await fetch(`${API_URL}/api/${hackathonId}/teams/${teamId}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Failed to delete team')
            }

            await fetchTeams()
            toast.success('Team deleted')
        } catch (e: any) {
            console.error('Delete team failed', e)
            toast.error(e?.message ?? 'Failed to delete team')
        }
    }

    // ---------------------------------------------------------------------------

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <Button
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="border-sky-500/40 bg-slate-900/80 text-sky-100 hover:bg-slate-800/70"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>

                <div>
                    <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                        Teams
                    </h1>
                    <p className="mt-1 text-sm text-sky-100/70">
                        Generate a baseline, then fine-tune with drag &amp; drop.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-sky-100">
                    <span className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-slate-900/80 px-3 py-1">
                        <Users className="h-3 w-3" />
                        <span>{compiledTeams.length} compiled</span>
                    </span>
                    <span className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-slate-900/80 px-3 py-1">
                        <Users className="h-3 w-3" />
                        <span>{teams.length} in builder</span>
                    </span>
                </div>
            </header>

            {/* Builder controls */}
            <Card className="border border-sky-500/20 bg-slate-900/70 backdrop-blur-xl">
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <CardTitle className="text-sm text-sky-50">Team builder controls</CardTitle>

                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                            <Sparkles className="h-3.5 w-3.5" />
                            Power team first
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                    {/* Controls row */}
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-sky-100/80">Target team size</label>
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={teamSizeRaw}
                                onChange={e => setTeamSizeRaw(e.target.value)}
                                onBlur={() => setTeamSizeRaw(String(teamSize))}
                                className="w-24 border-sky-500/50 bg-slate-950/80 text-sky-50"
                            />
                            <span className="text-xs text-sky-100/55">Clamped to 1–20</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Button
                                onClick={handleGenerateTeams}
                                disabled={loadingGenerate}
                                className="bg-sky-600/90 text-sky-50 hover:bg-sky-500"
                            >
                                <Shuffle className="mr-2 h-4 w-4" />
                                {loadingGenerate ? 'Generating…' : 'Generate teams'}
                            </Button>
                        </div>
                    </div>

                    {/* Explanation callout */}
                    <div className="rounded-xl border border-sky-500/20 bg-slate-950/40 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg border border-sky-500/20 bg-slate-900/70 p-2">
                                <Info className="h-4 w-4 text-sky-200" />
                            </div>

                            <div className="flex-1">
                                <p className="text-sm font-medium text-sky-50">
                                    How generation works (simple version)
                                </p>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-sky-100/75">
                                    <li>
                                        Teams are generated by prioritizing participant motivation, grouping the most
                                        motivated people together first.
                                    </li>
                                    <li>
                                        Roles and commonly shared skills are then used as secondary factors to improve
                                        balance within each team.
                                    </li>
                                    <li>
                                        Team <span className="text-sky-100">score (0–5)</span> reflects overall cohesion
                                        and balance based on motivation, experience, role variety, and skill variety.
                                    </li>
                                    <li>
                                        You can manually adjust teams using <span className="text-sky-100">drag &amp; drop</span>{' '}
                                        after generation.
                                    </li>
                                </ul>
                                <p className="mt-2 text-xs text-sky-100/55">
                                    Tip: Generate first, then drag members between teams to fine-tune based on availability,
                                    communication style, or project ideas.
                                </p>
                            </div>


                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Builder board */}
            <Card className="border border-sky-500/20 bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-sm text-sky-50">
                        Builder teams overview (drag &amp; drop)
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {teams.length === 0 ? (
                        <div className="py-10 text-center">
                            <p className="text-sm text-sky-200/80">No teams yet.</p>
                            <p className="mt-1 text-xs text-sky-100/55">
                                Click “Generate teams” to create a starting layout.
                            </p>
                        </div>
                    ) : (
                        <ScrollArea className="w-full">
                            <TeamsBoard
                                teams={teams}
                                onTeamsChange={setTeams}
                                onMoveMember={handleMoveMember}
                                onRenameTeam={handleRenameTeam}
                                onDeleteTeam={handleDeleteTeam}
                                onRemoveMember={handleRemoveMember}
                            />
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
