import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { API_URL } from '@/lib/config'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, ArrowLeft } from 'lucide-react'

// Keep statuses in sync with backend enum
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

type HackathonFormValues = {
    name: string
    description: string
    location: string
    startDate: string // datetime-local
    endDate: string   // datetime-local
    status?: HackathonStatus | string
}

type FieldErrors = Record<string, string>

export default function HackathonEditPage() {
    const { id } = useParams<{ id: string }>()
    const hackathonId = Number(id)

    const navigate = useNavigate()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [saveError, setSaveError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
    const [hackathon, setHackathon] = useState<AdminHackathon | null>(null)

    const [formValues, setFormValues] = useState<HackathonFormValues>({
        name: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        status: 'DRAFT',
    })

    const hasError = (field: keyof HackathonFormValues | string) => !!fieldErrors[field]

    const baseInputClasses =
        'border-sky-500/40 bg-slate-900/80 text-sky-50 placeholder:text-sky-200/40 focus-visible:ring-sky-400'
    const errorInputClasses =
        'border-red-500/70 focus-visible:ring-red-400'

    // Load single hackathon
    useEffect(() => {
        let isCancelled = false

        const load = async () => {
            setLoading(true)
            setLoadError(null)
            try {
                const res = await fetch(`${API_URL}/api/admin/hackathons/${hackathonId}`, {
                    method: 'GET',
                    credentials: 'include',
                })

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to load hackathon')
                }

                const data: AdminHackathon = await res.json()
                if (isCancelled) return

                setHackathon(data)
                setFormValues({
                    name: data.name ?? '',
                    description: data.description ?? '',
                    location: data.location ?? '',
                    // backend likely returns ISO/datetime string compatible with slice(0,16)
                    startDate: data.startDate?.slice(0, 16) ?? '',
                    endDate: data.endDate?.slice(0, 16) ?? '',
                    status: data.status ?? 'DRAFT',
                })
            } catch (e: any) {
                if (isCancelled) return
                console.error('Failed to load hackathon', e)
                setLoadError(e?.message ?? 'Failed to load hackathon')
            } finally {
                if (!isCancelled) setLoading(false)
            }
        }

        if (!Number.isNaN(hackathonId)) {
            void load()
        } else {
            setLoading(false)
            setLoadError('Invalid hackathon id')
        }

        return () => {
            isCancelled = true
        }
    }, [hackathonId])

    const handleInputChange = (
        field: keyof HackathonFormValues,
        value: string
    ) => {
        setFormValues(prev => ({
            ...prev,
            [field]: value,
        }))

        setFieldErrors(prev => {
            const next = { ...prev }
            delete next[field]
            return next
        })
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!hackathon) return

        setSaving(true)
        setSaveError(null)
        setFieldErrors({})

        try {
            const payload = {
                name: formValues.name,
                description: formValues.description,
                location: formValues.location,
                startDate: formValues.startDate,
                endDate: formValues.endDate,
                status: formValues.status,
            }

            const res = await fetch(`${API_URL}/api/admin/hackathons/${hackathon.id}`, {
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
            setHackathon(updated)

            // After successful save, go to dashboard for that hackathon
            navigate(`/admin/hackathons/${updated.id}`)
        } catch (e: any) {
            console.error('Failed to save hackathon', e)
            if (!e.__handledValidation) {
                setSaveError(e?.message ?? 'Failed to save hackathon')
            }
        } finally {
            setSaving(false)
        }
    }

    /**
     * Same validation handler logic as in AdminHackathonsPage.
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

                setSaveError(message)

                const err: any = new Error(message)
                err.__handledValidation = true
                throw err
            }

            if (data?.message) {
                message = data.message
            }
        } catch {
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

    const handleBack = () => {
        // back to dashboard if we know id, otherwise list
        if (hackathon) {
            navigate(`/admin/hackathons/${hackathon.id}`)
        } else {
            navigate('/admin/hackathons')
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <header className="flex items-center justify-between gap-4">
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
                            Edit hackathon
                        </h1>
                        <p className="mt-1 text-xs text-sky-100/70">
                            Update details, dates and status for this hackathon.
                        </p>
                    </div>
                </div>

                {hackathon && (
                    <span className="rounded-full border border-sky-400/40 bg-sky-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-100">
            {hackathon.status}
          </span>
                )}
            </header>

            {/* Load error */}
            {loadError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100 shadow-sm shadow-red-500/20">
                    {loadError}
                </div>
            )}

            {/* Loading state */}
            {loading && (
                <div className="flex items-center gap-2 text-sm text-sky-100/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading hackathon details…
                </div>
            )}

            {!loading && !loadError && (
                <Card className="border border-sky-500/20 bg-slate-950/80 shadow-[0_20px_60px_rgba(15,23,42,0.95)] backdrop-blur-xl">
                    <CardContent className="p-4 md:p-6">
                        <form onSubmit={handleSubmit} className="space-y-5">
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

                                {hackathon && (
                                    <div className="space-y-1 text-xs text-sky-100/70">
                                        <p>
                                            <span className="font-medium text-sky-50">Requires approval: </span>
                                            {hackathon.requireApproval ? 'Yes' : 'No'}
                                        </p>
                                        <p>
                                            <span className="font-medium text-sky-50">Teams allowed: </span>
                                            {hackathon.allowTeamCreation ? 'Yes' : 'No'}
                                        </p>
                                    </div>
                                )}
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

                            {saveError && (
                                <div className="rounded-md border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                                    {saveError}
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-sky-100 hover:bg-slate-800/80 hover:text-sky-50"
                                    onClick={handleBack}
                                    disabled={saving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={saving}
                                    className="rounded-full bg-sky-500/90 px-4 text-sky-950 shadow-lg shadow-sky-500/40 hover:bg-sky-400"
                                >
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save changes
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
