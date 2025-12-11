// src/pages/admin/HackathonAdminLayout.tsx
import { useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '@/lib/config'
import { Card } from '@/components/ui/card'
import { Loader2, LayoutDashboard, Users, FileText, Network } from 'lucide-react'

type HackathonStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string

type HackathonAdmin = {
    id: number
    name: string
    slug: string
    description: string
    location: string
    startDate: string
    endDate: string
    status: HackathonStatus
    requireApproval: boolean
    allowTeamCreation: boolean
    bannerUrl?: string | null
    createdAt: string
    updatedAt: string
}

// 👇 children is OPTIONAL via PropsWithChildren
export function HackathonAdminLayout({ children }: PropsWithChildren) {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()
    const [hackathon, setHackathon] = useState<HackathonAdmin | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return

        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(`${API_URL}/api/admin/hackathons/${id}`, {
                    method: 'GET',
                    credentials: 'include',
                })

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to load hackathon')
                }

                const data: HackathonAdmin = await res.json()
                setHackathon(data)
            } catch (e: any) {
                console.error('Failed to load hackathon', e)
                setError(e?.message ?? 'Failed to load hackathon')
            } finally {
                setLoading(false)
            }
        }

        void load()
    }, [id])

    const activePath = location.pathname
    const isActive = (path: string) => activePath === path

    const tabClasses = (active: boolean) =>
        `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            active
                ? 'bg-sky-500 text-sky-950 shadow-sm shadow-sky-500/40'
                : 'bg-slate-900/80 text-sky-100/80 hover:bg-slate-800/90 hover:text-sky-50'
        }`

    const go = (path: string) => navigate(path)

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            <header className="space-y-4 rounded-2xl border border-sky-500/20 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/admin")}
                        className="flex items-center gap-1 text-xs rounded-full px-2 py-1
               border border-sky-500/40 bg-slate-900/70 text-sky-100
               hover:bg-slate-800/90 hover:text-sky-50 hover:border-sky-400
               transition-all"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back
                    </button>
                </div>
                {loading && (
                    <div className="flex items-center gap-2 text-sm text-sky-100/80">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading hackathon…
                    </div>
                )}

                {error && !loading && <div className="text-sm text-red-300">{error}</div>}

                {hackathon && !loading && !error && (
                    <>
                        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                            <div className="space-y-1">
                                <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
                                    {hackathon.name}
                                </h1>
                                <p className="text-xs text-sky-100/70">{hackathon.description}</p>
                                <p className="text-[11px] text-sky-100/60">
                                    {hackathon.location || 'Location TBA'} •{' '}
                                    {new Date(hackathon.startDate).toLocaleString()} →{' '}
                                    {new Date(hackathon.endDate).toLocaleString()}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 font-semibold uppercase tracking-wide text-sky-100">
                  {hackathon.status}
                </span>
                                {hackathon.requireApproval && (
                                    <span className="rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-emerald-100">
                    Approval required
                  </span>
                                )}
                                {hackathon.allowTeamCreation && (
                                    <span className="rounded-full border border-indigo-400/50 bg-indigo-500/15 px-2 py-0.5 text-indigo-100">
                    Teams allowed
                  </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            <button
                                className={tabClasses(isActive(`/admin/hackathons/${id}`))}
                                onClick={() => go(`/admin/hackathons/${id}`)}
                            >
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Overview
                            </button>
                            <button
                                className={tabClasses(isActive(`/admin/hackathons/${id}/participants`))}
                                onClick={() => go(`/admin/hackathons/${id}/participants`)}
                            >
                                <Users className="h-3.5 w-3.5" />
                                Participants
                            </button>
                            <button
                                className={tabClasses(isActive(`/admin/hackathons/${id}/questionnaire`))}
                                onClick={() => go(`/admin/hackathons/${id}/questionnaire`)}
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Questionnaire
                            </button>
                            <button
                                className={tabClasses(isActive(`/admin/hackathons/${id}/teams`))}
                                onClick={() => go(`/admin/hackathons/${id}/teams`)}
                            >
                                <Network className="h-3.5 w-3.5" />
                                Teams
                            </button>
                        </div>
                    </>
                )}
            </header>

            <main className="space-y-4">
                <Card className="border border-sky-500/20 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
                    {children}
                </Card>
            </main>
        </div>
    )
}
