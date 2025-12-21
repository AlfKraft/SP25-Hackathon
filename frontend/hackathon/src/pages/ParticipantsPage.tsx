import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import {
    Search,
    Users,
    Edit,
    Save,
    X,
    Trash2,
    Filter,
    ChevronDown,
    AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { API_URL } from '@/lib/config'

// Shape from your response:
// id, email, firstName, lastName, data
interface ParticipantRow {
    id: number
    email: string
    firstName: string
    lastName: string
    data: unknown
}

export default function ParticipantsPage() {
    const { id } = useParams<{ id: string }>()
    const [hackathonName, setHackathonName] = useState<string>("")
    const hackathonId = id ? Number(id) : NaN
    const navigate = useNavigate()
    const [participants, setParticipants] = useState<ParticipantRow[]>([])
    const [participantsLoading, setParticipantsLoading] = useState(false)
    const [participantsError, setParticipantsError] = useState<string | null>(null)

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editData, setEditData] = useState<Partial<ParticipantRow>>({})
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<'email' | 'firstName' | 'lastName'>('email')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    // Fetch participants from /api/{hackathonId}/participants/all
    useEffect(() => {
        if (!hackathonId || Number.isNaN(hackathonId)) return

        let cancelled = false

        const load = async () => {
            setParticipantsLoading(true)
            setParticipantsError(null)
            try {
                const res = await fetch(
                    `${API_URL}/api/${hackathonId}/participants/all`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    },
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to load participants')
                }

                const data: ParticipantRow[] = await res.json()
                if (!cancelled) {
                    setParticipants(data)
                }
            } catch (e: any) {
                console.error('Failed to load participants', e)
                if (!cancelled) {
                    setParticipantsError(e?.message ?? 'Failed to load participants')
                }
            } finally {
                if (!cancelled) {
                    setParticipantsLoading(false)
                }
            }
            try {
                const res = await fetch(`${API_URL}/api/admin/hackathons/${hackathonId}`, {
                    method: 'GET',
                    credentials: 'include',
                })

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || "Failed to load hackathon metadata")
                }

                const hackathon = await res.json()

                if (!cancelled) {
                    setHackathonName(hackathon.name ?? "")
                }

            } catch (e) {
                console.error("Failed to load hackathon name", e)
                if (!cancelled) {
                    setHackathonName("")
                }
            }
        }

        void load()

        return () => {
            cancelled = true
        }
    }, [hackathonId])

    const handleEdit = (participant: ParticipantRow) => {
        setEditingId(participant.id)
        setEditData({
            id: participant.id,
            email: participant.email,
            firstName: participant.firstName,
            lastName: participant.lastName,
            // data remains untouched for now
        })
    }

    const handleFieldChange = (
        field: keyof ParticipantRow,
        value: unknown,
    ) => {
        setEditData(prev => ({
            ...prev,
            [field]: value as any,
        }))
    }

    const handleSave = async (participantId: number) => {
        if (!hackathonId || Number.isNaN(hackathonId)) return

        try {
            const res = await fetch(
                `${API_URL}/api/${hackathonId}/participants/${participantId}`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(editData),
                },
            )

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Failed to update participant')
            }

            const updated: ParticipantRow = await res.json()

            setParticipants(prev =>
                prev.map(p => (p.id === participantId ? updated : p)),
            )

            toast.success('Participant updated')
        } catch (e) {
            console.error(e)
            toast.error('Failed to update participant')
        } finally {
            setEditingId(null)
            setEditData({})
        }
    }

    const handleCancel = () => {
        setEditingId(null)
        setEditData({})
    }

    const handleDelete = async (participantId: number) => {
        if (!hackathonId || Number.isNaN(hackathonId)) return
        try {
            const res = await fetch(
                `${API_URL}/api/${hackathonId}/participants/${participantId}`,
                {
                    method: 'DELETE',
                    credentials: 'include',
                },
            )

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || 'Failed to delete participant')
            }

            setParticipants(prev => prev.filter(p => p.id !== participantId))
            toast.success('Participant deleted')
        } catch (e) {
            console.error(e)
            toast.error('Failed to delete participant')
        }
    }

    const filteredAndSorted = useMemo(() => {
        const term = search.trim().toLowerCase()

        let result = participants
        if (term) {
            result = result.filter(p => {
                const haystack = [
                    p.email,
                    p.firstName,
                    p.lastName,
                ]
                    .join(' ')
                    .toLowerCase()
                return haystack.includes(term)
            })
        }

        result = [...result].sort((a, b) => {
            const av = (a[sortKey] ?? '') as string
            const bv = (b[sortKey] ?? '') as string

            const as = av.toLowerCase()
            const bs = bv.toLowerCase()

            if (as < bs) return sortDir === 'asc' ? -1 : 1
            if (as > bs) return sortDir === 'asc' ? 1 : -1
            return 0
        })

        return result
    }, [participants, search, sortKey, sortDir])

    const toggleSort = (key: typeof sortKey) => {
        if (key === sortKey) {
            setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    const baseInput =
        'border-sky-500/40 bg-slate-900/80 text-sky-50 placeholder:text-sky-200/40 focus-visible:ring-sky-400'

    const isLoading = participantsLoading

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                    {/* Back Button */}
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="border-sky-500/40 bg-slate-900/80 text-sky-100 hover:bg-slate-800/70"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>

                    <div>
                        <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                            {hackathonName || "Loading..."} — Participants
                        </h1>
                        <p className="mt-1 text-sm text-sky-100/70">
                            View and manage all participants registered for this hackathon.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">

                    <div className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-slate-900/80 px-3 py-1 text-xs text-sky-100">
                        <Users className="h-4 w-4" />
                        <span>{participants.length} participants</span>
                    </div>

                    {id && (
                        <div className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-slate-900/80 px-3 py-1 text-xs text-sky-100">
                            <span className="font-mono text-sky-200/90">Hackathon #{id}</span>
                        </div>
                    )}
                </div>
            </header>


            {/* Errors & loading */}
            {participantsError && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <span>{participantsError}</span>
                </div>
            )}

            {isLoading && (
                <p className="text-sm text-sky-100/80">
                    Loading participants…
                </p>
            )}

            {!isLoading && participants.length === 0 && !participantsError && (
                <Card className="border border-sky-500/20 bg-slate-900/70 backdrop-blur-xl">
                    <CardContent className="py-8 text-center text-sm text-sky-200/80">
                        There are no participants yet for hackathon{' '}
                        <span className="font-mono">{hackathonId}</span>.
                    </CardContent>
                </Card>
            )}

            {/* Main content */}
            {!isLoading && participants.length > 0 && (
                <>
                    {/* Search + sort bar */}
                    <Card className="border border-sky-500/20 bg-slate-900/70 backdrop-blur-xl">
                        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
                            <div className="flex flex-1 items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-300/70" />
                                    <Input
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by email, first name, last name…"
                                        className={`${baseInput} pl-9`}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="border-sky-500/60 bg-slate-900/80 text-xs text-sky-100 hover:bg-slate-800/80"
                                        >
                                            <Filter className="mr-2 h-3 w-3" />
                                            Sort
                                            <ChevronDown className="ml-1 h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => toggleSort('email')}>
                                            Email
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleSort('firstName')}>
                                            First name
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => toggleSort('lastName')}>
                                            Last name
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <span className="hidden text-xs text-sky-200/70 md:inline">
                  {filteredAndSorted.length} shown
                </span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Table */}
                    <Card className="border border-sky-500/20 bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-3 text-sky-50">
                                <span className="text-sm">Participant list</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-800">
                                        <TableHead className="text-xs text-sky-200/80">
                                            Email
                                        </TableHead>
                                        <TableHead className="text-xs text-sky-200/80">
                                            First name
                                        </TableHead>
                                        <TableHead className="text-xs text-sky-200/80">
                                            Last name
                                        </TableHead>
                                        <TableHead className="w-24 text-xs text-sky-200/80">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSorted.map(participant => (
                                        <TableRow
                                            key={participant.id}
                                            className="border-slate-800 hover:bg-slate-900/70"
                                        >
                                            {/* Email */}
                                            <TableCell className="align-top text-xs text-sky-50">
                                                {editingId === participant.id ? (
                                                    <Input
                                                        type="email"
                                                        value={editData.email ?? participant.email ?? ''}
                                                        onChange={e =>
                                                            handleFieldChange('email', e.target.value)
                                                        }
                                                        className={`${baseInput} h-8 text-xs`}
                                                    />
                                                ) : (
                                                    participant.email
                                                )}
                                            </TableCell>

                                            {/* First name */}
                                            <TableCell className="align-top text-xs text-sky-100/90">
                                                {editingId === participant.id ? (
                                                    <Input
                                                        type="text"
                                                        value={
                                                            editData.firstName ?? participant.firstName ?? ''
                                                        }
                                                        onChange={e =>
                                                            handleFieldChange('firstName', e.target.value)
                                                        }
                                                        className={`${baseInput} h-8 text-xs`}
                                                    />
                                                ) : (
                                                    participant.firstName
                                                )}
                                            </TableCell>

                                            {/* Last name */}
                                            <TableCell className="align-top text-xs text-sky-100/90">
                                                {editingId === participant.id ? (
                                                    <Input
                                                        type="text"
                                                        value={
                                                            editData.lastName ?? participant.lastName ?? ''
                                                        }
                                                        onChange={e =>
                                                            handleFieldChange('lastName', e.target.value)
                                                        }
                                                        className={`${baseInput} h-8 text-xs`}
                                                    />
                                                ) : (
                                                    participant.lastName
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="align-top">
                                                {editingId === participant.id ? (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => handleSave(participant.id)}
                                                            className="h-8 w-8 border-emerald-500/50 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={handleCancel}
                                                            className="h-8 w-8 border-slate-500/60 bg-slate-900/80 text-sky-100 hover:bg-slate-800/80"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="outline"
                                                            onClick={() => handleEdit(participant)}
                                                            className="h-8 w-8 border-sky-500/60 bg-slate-900/80 text-sky-100 hover:bg-slate-800/80"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>

                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-8 w-8 border-rose-500/60 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent className="border border-rose-500/40 bg-slate-950">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="text-rose-100">
                                                                        Delete participant?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="text-sky-200/80">
                                                                        This will permanently remove{' '}
                                                                        <span className="font-semibold">
              {participant.firstName} {participant.lastName}
            </span>{' '}
                                                                        from this hackathon’s participant list. This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel className="border-slate-600 bg-slate-900 text-sky-100 hover:bg-slate-800">
                                                                        Cancel
                                                                    </AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        className="border border-rose-500/60 bg-rose-600/90 text-rose-50 hover:bg-rose-500"
                                                                        onClick={() => handleDelete(participant.id)}
                                                                    >
                                                                        Delete
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
