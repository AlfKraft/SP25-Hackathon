// src/pages/admin/HackathonAdminLayout.tsx
import { useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '@/lib/config'
import { Card } from '@/components/ui/card'
import {Loader2, LayoutDashboard, Users, FileText, Network, Trash2, RefreshCw, ChevronDown, Edit} from 'lucide-react'
import {cn} from "@/lib/utils.ts";

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

type StatusOption = {
    value: HackathonStatus
    label: string
    hint: string
    badgeClass: string
}

const STATUS_OPTIONS: StatusOption[] = [
    {
        value: 'DRAFT',
        label: 'Draft',
        hint: 'Hidden from public. Safe for editing.',
        badgeClass: 'border-slate-500/40 bg-slate-500/10 text-slate-100',
    },
    {
        value: 'OPEN',
        label: 'Published',
        hint: 'Visible to public.',
        badgeClass: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
    },
    {
        value: 'ARCHIVED',
        label: 'Archived',
        hint: 'Read-only vibe. Not open for signups.',
        badgeClass: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
    },
]

function prettyStatus(status: HackathonStatus) {
    const found = STATUS_OPTIONS.find(s => s.value === status)
    return found?.label ?? String(status)
}

function statusBadgeClass(status: HackathonStatus) {
    const found = STATUS_OPTIONS.find(s => s.value === status)
    return found?.badgeClass ?? 'border-sky-400/40 bg-sky-500/15 text-sky-100'
}

// 👇 children is OPTIONAL via PropsWithChildren
export function HackathonAdminLayout({ children }: PropsWithChildren) {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const location = useLocation()

    const [hackathon, setHackathon] = useState<HackathonAdmin | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Delete state
    const [confirmingDelete, setConfirmingDelete] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    // Status state
    const [statusOpen, setStatusOpen] = useState(false)
    const [statusSaving, setStatusSaving] = useState(false)
    const [statusError, setStatusError] = useState<string | null>(null)

    const activePath = location.pathname
    const isActive = (path: string) => activePath === path

    const tabClasses = (active: boolean) =>
        `inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            active
                ? 'bg-sky-500 text-sky-950 shadow-sm shadow-sky-500/40'
                : 'bg-slate-900/80 text-sky-100/80 hover:bg-slate-800/90 hover:text-sky-50'
        }`

    const go = (path: string) => navigate(path)

    const fetchHackathon = useMemo(() => {
        return async () => {
            if (!id) return
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
    }, [id])

    useEffect(() => {
        void fetchHackathon()
    }, [fetchHackathon])

    const handleDelete = async () => {
        if (!id) return

        setDeleting(true)
        setDeleteError(null)
        setError(null)
        setStatusError(null)

        try {
            const res = await fetch(`${API_URL}/api/admin/hackathons/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || `Failed to delete (status ${res.status})`)
            }

            navigate('/admin', { replace: true })
        } catch (e: any) {
            console.error('Failed to delete hackathon', e)
            setDeleteError(e?.message ?? 'Failed to delete hackathon')
        } finally {
            setDeleting(false)
        }
    }

    /**
     * Status change feature (endpoint TBD)
     *
     * Suggested backend:
     *   PATCH /api/admin/hackathons/{id}/status
     *   body: { status: "PUBLISHED" }
     *   returns: updated HackathonAdmin (or at least { status })
     */
    const handleStatusChange = async (nextStatus: HackathonStatus) => {
        if (!id || !hackathon) return
        if (nextStatus === hackathon.status) {
            setStatusOpen(false)
            return
        }

        setStatusSaving(true)
        setStatusError(null)
        setError(null)
        setDeleteError(null)

        const prev = hackathon.status

        // optimistic UI
        setHackathon(h => (h ? { ...h, status: nextStatus } : h))
        setStatusOpen(false)

        try {
            const res = await fetch(`${API_URL}/api/admin/hackathons/${id}/status`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: nextStatus }),
            })

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || `Failed to change status (status ${res.status})`)
            }

            // Prefer updated object if backend returns it
            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
                const updated: Partial<HackathonAdmin> = await res.json()
                setHackathon(h => (h ? { ...h, ...updated } : h))
            }
        } catch (e: any) {
            console.error('Failed to change hackathon status', e)
            // rollback optimistic update
            setHackathon(h => (h ? { ...h, status: prev } : h))
            setStatusError(e?.message ?? 'Failed to change status')
        } finally {
            setStatusSaving(false)
        }
    }

    const isBusy = deleting || statusSaving

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            <header className="relative z-20 space-y-4 rounded-2xl border border-sky-500/20 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/admin')}
                        className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-slate-900/70 px-2 py-1 text-xs text-sky-100 transition-all hover:border-sky-400 hover:bg-slate-800/90 hover:text-sky-50 disabled:opacity-60"
                        disabled={isBusy}
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

                    <button
                        type="button"
                        onClick={() => void fetchHackathon()}
                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-900/40 px-2 py-1 text-xs text-slate-100 transition hover:bg-slate-900/60 disabled:opacity-60"
                        disabled={loading || isBusy}
                        title="Refresh"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', loading ? 'animate-spin' : '')} />
                        Refresh
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center gap-2 text-sm text-sky-100/80">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading hackathon…
                    </div>
                )}

                {(error || deleteError || statusError) && !loading && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-100">
                        {statusError ?? deleteError ?? error}
                    </div>
                )}

                {hackathon && !loading && !error && (
                    <>
                        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                            <div className="space-y-1">
                                <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent">
                                    {hackathon.name}
                                </h1>
                                <p className="text-[11px] text-sky-100/60">
                                    {hackathon.location || 'Location TBA'} • {new Date(hackathon.startDate).toLocaleString()} →{' '}
                                    {new Date(hackathon.endDate).toLocaleString()}
                                </p>
                            </div>

                            <div className="flex w-full flex-col items-start gap-2 md:w-auto md:items-end">
                                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                    {/* Status "chip" (clickable) */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setStatusOpen(o => !o)}
                                            disabled={isBusy}
                                            className={cn(
                                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide transition-all disabled:opacity-60',
                                                statusBadgeClass(hackathon.status),
                                                'hover:brightness-110'
                                            )}
                                            title="Change hackathon status"
                                        >
                                            {prettyStatus(hackathon.status)}
                                            <ChevronDown className={cn('h-3.5 w-3.5 opacity-80 transition', statusOpen && 'rotate-180')} />
                                            {statusSaving && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />}
                                        </button>

                                        {statusOpen && (
                                            <div className="absolute right-0 z-20 mt-2 w-[280px] overflow-hidden rounded-2xl border border-slate-700/60 bg-slate-950/95 p-2 shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur">
                                                <div className="px-2 pb-2 pt-1">
                                                    <p className="text-xs font-semibold text-slate-100">Change status</p>
                                                </div>

                                                <div className="space-y-1">
                                                    {STATUS_OPTIONS.map(opt => {
                                                        const active = opt.value === hackathon.status
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                onClick={() => void handleStatusChange(opt.value)}
                                                                disabled={isBusy}
                                                                className={cn(
                                                                    'w-full rounded-xl border px-2 py-2 text-left transition disabled:opacity-60',
                                                                    active
                                                                        ? 'border-sky-400/40 bg-sky-500/10'
                                                                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                                                                )}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="text-xs font-semibold text-slate-100">{opt.label}</span>
                                                                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', opt.badgeClass)}>
                                    {opt.value}
                                  </span>
                                                                </div>
                                                                <p className="mt-1 text-[11px] text-slate-300">{opt.hint}</p>
                                                            </button>
                                                        )
                                                    })}
                                                </div>

                                                <div className="mt-2 flex justify-end px-2 pb-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setStatusOpen(false)}
                                                        className="rounded-full border border-slate-600/60 bg-slate-900/40 px-3 py-1 text-xs font-semibold text-slate-100 hover:bg-slate-900/60"
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Delete */}
                                    {!confirmingDelete ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmingDelete(true)
                                                setDeleteError(null)
                                                setStatusError(null)
                                            }}
                                            disabled={isBusy}
                                            className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 font-semibold text-red-100 transition-all hover:bg-red-500/15 disabled:opacity-60"
                                            title="Delete hackathon"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setConfirmingDelete(false)
                                                setDeleteError(null)
                                            }}
                                            disabled={isBusy}
                                            className="inline-flex items-center gap-1 rounded-full border border-slate-600/60 bg-slate-900/40 px-2 py-0.5 font-semibold text-slate-100 transition-all hover:bg-slate-900/60 disabled:opacity-60"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                {confirmingDelete && (
                                    <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-slate-950/40 to-slate-950/20 p-3">
                                        <p className="text-xs font-semibold text-red-100">Danger zone</p>
                                        <p className="mt-1 text-[11px] text-red-100/70">
                                            This will permanently delete the hackathon (and may remove related data depending on backend rules).
                                        </p>

                                        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setConfirmingDelete(false)
                                                    setDeleteError(null)
                                                }}
                                                disabled={isBusy}
                                                className="rounded-full border border-slate-600/60 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-slate-900/60 disabled:opacity-60"
                                            >
                                                Keep it
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                disabled={isBusy}
                                                className="rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-red-950 shadow-sm shadow-red-500/30 transition hover:bg-red-400 disabled:opacity-60"
                                            >
                                                {deleting ? 'Deleting…' : 'Yes, delete'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                            <button className={tabClasses(isActive(`/admin/hackathons/${id}`))} onClick={() => go(`/admin/hackathons/${id}`)} disabled={isBusy}>
                                <LayoutDashboard className="h-3.5 w-3.5" />
                                Overview
                            </button>
                            <button
                                className={tabClasses(isActive(`/admin/hackathons/${id}/participants`))}
                                onClick={() => go(`/admin/hackathons/${id}/participants`)}
                                disabled={isBusy}
                            >
                                <Users className="h-3.5 w-3.5" />
                                Participants
                            </button>
                            <button
                                className={tabClasses(isActive(`/admin/hackathons/${id}/questionnaire`))}
                                onClick={() => go(`/admin/hackathons/${id}/questionnaire`)}
                                disabled={isBusy}
                            >
                                <FileText className="h-3.5 w-3.5" />
                                Questionnaire
                            </button>
                            <button className={tabClasses(isActive(`/admin/hackathons/${id}/teams`))} onClick={() => go(`/admin/hackathons/${id}/teams`)} disabled={isBusy}>
                                <Network className="h-3.5 w-3.5" />
                                Teams
                            </button>
                            <button className={tabClasses(isActive(`/admin/hackathons/${id}/edit`))} onClick={() => go(`/admin/hackathons/${id}/edit`)} disabled={isBusy}>
                                <Edit className="h-3.5 w-3.5" />
                                Edit
                            </button>
                        </div>
                    </>
                )}
            </header>

            <main className="space-y-4">
                <Card className="border border-sky-500/20 bg-slate-950/70 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.9)] backdrop-blur-2xl overflow-visible">
                    {children}
                </Card>
            </main>
        </div>
    )
}
