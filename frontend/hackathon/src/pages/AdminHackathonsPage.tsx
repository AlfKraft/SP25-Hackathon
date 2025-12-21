import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
//import { Switch } from '@/components/ui/switch'
import {
    Loader2,
    Plus,
    Edit,
    MoreHorizontal,
    Users,
    FileText,
    Network,
    LayoutDashboard,
} from 'lucide-react'

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {readApiError} from "@/types/apiError.ts";

// TODO: adjust to your actual HackathonStatus enum values
const HACKATHON_STATUSES = ['DRAFT', 'OPEN', 'FINISHED', 'CLOSED'] as const
type HackathonStatus = (typeof HACKATHON_STATUSES)[number]

type AdminHackathon = {
    id: number
    name: string
    slug: string
    description: string
    location: string
    startDate: string
    endDate: string
    status: HackathonStatus | string
    requireApproval: boolean
    allowTeamCreation: boolean
    bannerUrl?: string | null
    createdAt: string
    updatedAt: string
}

type FormMode = 'create' | 'edit'

type HackathonFormValues = {
    name: string
    description: string
    location: string
    startDate: string // datetime-local
    endDate: string   // datetime-local
    requireApproval: boolean
    allowTeamCreation: boolean
    bannerUrl: string
    status?: HackathonStatus | string
}

type FieldErrors = Record<string, string>

export default function AdminHackathonsPage() {
    const [hackathons, setHackathons] = useState<AdminHackathon[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [formOpen, setFormOpen] = useState(false)
    const [formMode, setFormMode] = useState<FormMode>('create')
    const [formSubmitting, setFormSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [editingHackathon, setEditingHackathon] = useState<AdminHackathon | null>(null)
    const [formValues, setFormValues] = useState<HackathonFormValues>({
        name: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        requireApproval: true,
        allowTeamCreation: true,
        bannerUrl: '',
        status: 'DRAFT',
    })

    const navigate = useNavigate()   // ⬅️ NEW

    const goToDashboard = (id: number) => {
        navigate(`/admin/hackathons/${id}`)
    }

    const goToEditPage = (id: number) => {
        navigate(`/admin/hackathons/${id}/edit`)
    }

    const goToParticipants = (id: number) => {
        navigate(`/admin/hackathons/${id}/participants`)
    }

    const goToQuestionnaire = (id: number) => {
        navigate(`/admin/hackathons/${id}/questionnaire`)
    }

    const goToTeams = (id: number) => {
        navigate(`/admin/hackathons/${id}/teams`)
    }

    const loadHackathons = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_URL}/api/admin/hackathons`, {
                method: 'GET',
                credentials: 'include',
            })

            if (!res.ok) {
                throw new Error(await readApiError(res))
            }

            const data: AdminHackathon[] = await res.json()
            setHackathons(data)
        } catch (e: any) {
            console.error('Failed to load admin hackathons', e)
            setError(e?.message ?? 'Failed to load admin hackathons')
            setHackathons([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadHackathons()
    }, [])

    const openCreate = () => {
        setFormMode('create')
        setEditingHackathon(null)
        setFormError(null)
        setFieldErrors({})
        setFormValues({
            name: '',
            description: '',
            location: '',
            startDate: '',
            endDate: '',
            requireApproval: true,
            allowTeamCreation: true,
            bannerUrl: '',
            status: 'DRAFT',
        })
        setFormOpen(true)
    }

    /*
    const openEdit = (hackathon: AdminHackathon) => {
        setFormMode('edit')
        setEditingHackathon(hackathon)
        setFormError(null)
        setFieldErrors({})
        setFormValues({
            name: hackathon.name ?? '',
            description: hackathon.description ?? '',
            location: hackathon.location ?? '',
            startDate: hackathon.startDate?.slice(0, 16) ?? '',
            endDate: hackathon.endDate?.slice(0, 16) ?? '',
            requireApproval: hackathon.requireApproval ?? true,
            allowTeamCreation: hackathon.allowTeamCreation ?? true,
            bannerUrl: hackathon.bannerUrl ?? '',
            status: hackathon.status,
        })
        setFormOpen(true)
    }

     */

    const closeForm = () => {
        if (formSubmitting) return
        setFormOpen(false)
        setEditingHackathon(null)
        setFormError(null)
        setFieldErrors({})
    }

    const handleInputChange = (field: keyof HackathonFormValues, value: string | boolean) => {
        setFormValues(prev => ({
            ...prev,
            [field]: value,
        }))

        if (field === 'startDate' && typeof value === 'string' && value) {
            const startDate = new Date(value)
            const now = new Date()
            if (startDate < now) {
                setFieldErrors(prev => ({
                    ...prev,
                    startDate: 'Start date cannot be in the past',
                }))
                return
            }
        }

        if (field === 'endDate' && typeof value === 'string' && value) {
            const endDate = new Date(value)
            const now = new Date()
            if (endDate < now) {
                setFieldErrors(prev => ({
                    ...prev,
                    endDate: 'End date cannot be in the past',
                }))
                return
            }
            if (formValues.startDate) {
                const startDate = new Date(formValues.startDate)
                if (endDate < startDate) {
                    setFieldErrors(prev => ({
                        ...prev,
                        endDate: 'End date cannot be before start date',
                    }))
                    return
                }
            }
        }

        if (field === 'startDate' && typeof value === 'string' && value && formValues.endDate) {
            const startDate = new Date(value)
            const endDate = new Date(formValues.endDate)
            if (startDate > endDate) {
                setFieldErrors(prev => ({
                    ...prev,
                    startDate: 'Start date cannot be after end date',
                }))
                return
            }
        }

        // Clear field-level error as user edits
        setFieldErrors(prev => {
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setFormSubmitting(true)
        setFormError(null)
        setFieldErrors({})

        try {
            if (formMode === 'create') {
                const payload = {
                    name: formValues.name,
                    description: formValues.description,
                    location: formValues.location,
                    startDate: formValues.startDate,
                    endDate: formValues.endDate,
                    requireApproval: formValues.requireApproval,
                    allowTeamCreation: formValues.allowTeamCreation,
                    bannerUrl: formValues.bannerUrl || null,
                }

                const res = await fetch(`${API_URL}/api/admin/hackathons`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) {
                    await handleValidationErrorResponse(res)
                }

                const created: AdminHackathon = await res.json()
                setHackathons(prev => [created, ...prev])
            } else if (formMode === 'edit' && editingHackathon) {
                const payload = {
                    name: formValues.name,
                    description: formValues.description,
                    location: formValues.location,
                    startDate: formValues.startDate,
                    endDate: formValues.endDate,
                    status: formValues.status,
                }

                const res = await fetch(`${API_URL}/api/admin/hackathons/${editingHackathon.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                })

                if (!res.ok) {
                    await handleValidationErrorResponse(res)
                }

                const updated: AdminHackathon = await res.json()
                setHackathons(prev => prev.map(h => (h.id === updated.id ? updated : h)))
            }

            setFormOpen(false)
            setEditingHackathon(null)
        } catch (e: any) {
            console.error('Hackathon save failed', e)
            if (!e.__handledValidation) {
                setFormError(e?.message ?? 'Failed to save hackathon')
            }
        } finally {
            setFormSubmitting(false)
        }
    }

    /**
     * Handle 400 VALIDATION_ERROR responses and map them into fieldErrors + formError.
     * Throws an error with marker __handledValidation so outer catch doesn’t overwrite UI state.
     */
    const handleValidationErrorResponse = async (res: Response): Promise<never> => {
        let message = 'Validation failed'

        try {
            const data = await res.json()

            if (data?.error === 'VALIDATION_ERROR') {
                const byField: FieldErrors = {}

                if (Array.isArray(data.fieldErrors)) {
                    for (const fe of data.fieldErrors) {
                        const field = String(fe.field ?? '').trim()
                        const msg = String(fe.message ?? '').trim() || 'Invalid value'
                        if (field && !byField[field]) {
                            byField[field] = msg
                        }
                    }
                }

                setFieldErrors(byField)

                if (data.message) {
                    message = data.message
                } else if (Object.keys(byField).length > 0) {
                    message = 'Please fix the highlighted fields.'
                }

                setFormError(message)

                const err: any = new Error(message)
                err.__handledValidation = true
                throw err
            }

            // Non-validation JSON error
            if (data?.message) {
                message = data.message
            }
        } catch {
            // If JSON parse fails, try text
            try {
                const text = await res.text()
                if (text) message = text
            } catch {
                // ignore
            }
        }

        const err: any = new Error(message)
        err.__handledValidation = true
        throw err
    }

    const sortedHackathons = useMemo(
        () =>
            [...hackathons].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
        [hackathons]
    )

    // Helpers for field-level styles
    const hasError = (field: keyof HackathonFormValues | string) => !!fieldErrors[field]

    const baseInputClasses =
        'border-sky-500/40 bg-slate-900/80 text-sky-50 placeholder:text-sky-200/40 focus-visible:ring-sky-400'
    const errorInputClasses =
        'border-red-500/70 focus-visible:ring-red-400'

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                        Hackathon admin
                    </h1>
                    <p className="mt-1 text-sm text-sky-100/70">
                        Create, update and manage hackathons that you organize.
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="flex items-center gap-2 rounded-full bg-sky-500/90 px-4 shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5 hover:bg-sky-400"
                >
                    <Plus className="h-4 w-4" />
                    <span>New hackathon</span>
                </Button>
            </header>

            {/* Global error */}
            {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100 shadow-sm shadow-red-500/20">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-sky-100/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading hackathons…
                </div>
            )}

            {/* Empty state */}
            {!loading && sortedHackathons.length === 0 && !error && (
                <div className="rounded-2xl border border-sky-500/30 bg-slate-900/40 px-6 py-10 text-center text-sm text-sky-100/80 shadow-[0_20px_60px_rgba(15,23,42,0.8)] backdrop-blur-xl">
                    <p className="mb-2 text-base font-medium text-sky-50">
                        No hackathons yet
                    </p>
                    <p className="mb-5 text-sm text-sky-100/70">
                        Start by creating your first hackathon. You can configure dates, location and
                        registration settings.
                    </p>
                    <Button
                        size="sm"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-full bg-sky-500/90 px-4 shadow-lg shadow-sky-500/40 transition-all hover:-translate-y-0.5 hover:bg-sky-400"
                    >
                        <Plus className="h-4 w-4" />
                        New hackathon
                    </Button>
                </div>
            )}

            {/* Grid of hackathons */}
            <div className="grid gap-4 md:grid-cols-2">
                {sortedHackathons.map(h => (
                    <Card
                        key={h.id}
                        className="group flex flex-col border border-sky-500/10 bg-slate-900/60 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-[0_24px_70px_rgba(8,47,73,0.9)]"
                    >
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                    <span className="truncate text-base font-semibold text-sky-50">
                      {h.name}
                    </span>
                                        <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-100">
                      {h.status}
                    </span>
                                    </div>
                                </div>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-2 text-xs text-sky-100/80">
                            <p>
                                <span className="font-medium text-sky-50">Location: </span>
                                {h.location || 'TBA'}
                            </p>
                            <p>
                                <span className="font-medium text-sky-50">Start: </span>
                                {new Date(h.startDate).toLocaleString()}
                            </p>
                            <p>
                                <span className="font-medium text-sky-50">End: </span>
                                {new Date(h.endDate).toLocaleString()}
                            </p>
                        </CardContent>
                        <CardFooter className="flex items-center justify-between gap-3 pt-3">
                            {/* Left: primary action – open dashboard */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex flex-1 items-center justify-center gap-1 rounded-full border-sky-500/50 bg-slate-900/60 text-sky-100 hover:bg-slate-800/80 hover:text-sky-50"
                                onClick={() => goToDashboard(h.id)}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                Open
                            </Button>

                            {/* Right: dropdown with deep links */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-full text-sky-100 hover:bg-slate-800/80 hover:text-sky-50"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="min-w-[210px] border-sky-500/30 bg-slate-950/95 text-sky-50"
                                >
                                    <DropdownMenuItem
                                        className="flex items-center gap-2 text-xs focus:bg-slate-800/80"
                                        onClick={() => goToEditPage(h.id)}
                                    >
                                        <Edit className="h-4 w-4" />
                                        <span>Edit details</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="flex items-center gap-2 text-xs focus:bg-slate-800/80"
                                        onClick={() => goToParticipants(h.id)}
                                    >
                                        <Users className="h-4 w-4" />
                                        <span>Manage participants</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="flex items-center gap-2 text-xs focus:bg-slate-800/80"
                                        onClick={() => goToQuestionnaire(h.id)}
                                    >
                                        <FileText className="h-4 w-4" />
                                        <span>Edit questionnaire</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        className="flex items-center gap-2 text-xs focus:bg-slate-800/80"
                                        onClick={() => goToTeams(h.id)}
                                    >
                                        <Network className="h-4 w-4" />
                                        <span>Generate / manage teams</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardFooter>

                        <div className="pointer-events-none mx-4 mb-3 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </Card>
                ))}
            </div>

            {/* Create / Edit dialog */}
            <Dialog open={formOpen} onOpenChange={open => (open ? setFormOpen(true) : closeForm())}>
                <DialogContent className="max-w-lg border border-sky-500/30 bg-slate-950/90 text-sky-50 shadow-[0_24px_80px_rgba(15,23,42,0.95)] backdrop-blur-2xl">
                    <DialogHeader>
                        <DialogTitle className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-lg font-semibold text-transparent">
                            {formMode === 'create' ? 'Create new hackathon' : 'Edit hackathon'}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-sky-100/70">
                            Fill in the basic settings for your hackathon. You can adjust details later.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs text-sky-100">
                                Name
                            </Label>
                            <Input
                                id="name"
                                value={formValues.name}
                                onChange={e => handleInputChange('name', e.target.value)}
                                required
                                placeholder="Winter Hack 2026"
                                className={`${baseInputClasses} ${hasError('name') ? errorInputClasses : ''}`}
                            />
                            {hasError('name') && (
                                <p className="mt-1 text-xs text-red-300">{fieldErrors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-xs text-sky-100">
                                Description
                            </Label>
                            <Textarea
                                id="description"
                                value={formValues.description}
                                onChange={e => handleInputChange('description', e.target.value)}
                                required
                                rows={4}
                                placeholder="Short description of what this hackathon is about..."
                                className={`${baseInputClasses} ${hasError('description') ? errorInputClasses : ''}`}
                            />
                            {hasError('description') && (
                                <p className="mt-1 text-xs text-red-300">{fieldErrors.description}</p>
                            )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="location" className="text-xs text-sky-100">
                                    Location
                                </Label>
                                <Input
                                    id="location"
                                    value={formValues.location}
                                    onChange={e => handleInputChange('location', e.target.value)}
                                    required
                                    placeholder="Tartu, Estonia / Online"
                                    className={`${baseInputClasses} ${hasError('location') ? errorInputClasses : ''}`}
                                />
                                {hasError('location') && (
                                    <p className="mt-1 text-xs text-red-300">{fieldErrors.location}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="startDate" className="text-xs text-sky-100">
                                    Start date
                                </Label>
                                <Input
                                    id="startDate"
                                    type="datetime-local"
                                    value={formValues.startDate}
                                    onChange={e => handleInputChange('startDate', e.target.value)}
                                    required
                                    className={`${baseInputClasses} ${hasError('startDate') ? errorInputClasses : ''}`}
                                />
                                {hasError('startDate') && (
                                    <p className="mt-1 text-xs text-red-300">{fieldErrors.startDate}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate" className="text-xs text-sky-100">
                                    End date
                                </Label>
                                <Input
                                    id="endDate"
                                    type="datetime-local"
                                    value={formValues.endDate}
                                    onChange={e => handleInputChange('endDate', e.target.value)}
                                    required
                                    className={`${baseInputClasses} ${hasError('endDate') ? errorInputClasses : ''}`}
                                />
                                {hasError('endDate') && (
                                    <p className="mt-1 text-xs text-red-300">{fieldErrors.endDate}</p>
                                )}
                            </div>
                        </div>

                        {formMode === 'edit' && (
                            <div className="space-y-1">
                                <Label htmlFor="status" className="text-xs text-sky-100">
                                    Status
                                </Label>
                                <select
                                    id="status"
                                    className={`flex h-9 w-full rounded-md border px-3 py-1 text-sm text-sky-50 shadow-sm outline-none bg-slate-900/80 border-sky-500/40 focus-visible:ring-2 focus-visible:ring-sky-400 ${
                                        hasError('status') ? errorInputClasses : ''
                                    }`}
                                    value={formValues.status}
                                    onChange={e => handleInputChange('status', e.target.value)}
                                >
                                    {HACKATHON_STATUSES.map(status => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                                {hasError('status') && (
                                    <p className="mt-1 text-xs text-red-300">{fieldErrors.status}</p>
                                )}
                                <p className="text-[11px] text-sky-100/60">
                                    Control whether this hackathon is visible or open for registration.
                                </p>
                            </div>
                        )}

                        {formError && (
                            <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                                {formError}
                            </div>
                        )}

                        <DialogFooter className="mt-2 flex items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={closeForm}
                                disabled={formSubmitting}
                                className="text-sky-100 hover:bg-slate-800/80 hover:text-sky-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={formSubmitting}
                                className="rounded-full bg-sky-500/90 px-4 text-sky-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
                            >
                                {formSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {formMode === 'create' ? 'Create hackathon' : 'Save changes'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}