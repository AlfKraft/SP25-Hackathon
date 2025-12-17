// src/pages/AnswersPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    Loader2,
    Search,
    User,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'
import { cn } from '@/lib/utils'

type AnswerSource = 'INTERNAL' | 'IMPORTED'

interface ParticipantAnswer {
    participantId: number
    email: string
    firstName: string
    lastName: string
    source: AnswerSource
    answers: AnswerItem[]
}

interface AnswerItem {
    key: string
    type?: string
    valueText?: string | null
    valueNumber?: number | null
    valueBoolean?: boolean | null
    valueOptionId?: string | null
    valueOptionIds?: string[] | null
    valueJson?: any
}

interface NumericFilter {
    min: number
    max: number
}

interface FieldMeta {
    key: string
    isNumeric: boolean
    minValue?: number
    maxValue?: number
    values?: Map<string, number> // value -> count
}

/**
 * Normalize imported answers (object) into AnswerItem[] so the UI can treat all answers the same.
 */
function normalizeImportedAnswers(obj: Record<string, any>): AnswerItem[] {
    const items: AnswerItem[] = []

    for (const [key, raw] of Object.entries(obj)) {
        if (raw == null) {
            items.push({ key, type: 'TEXT', valueText: null })
            continue
        }

        if (Array.isArray(raw)) {
            items.push({
                key,
                type: 'MULTI_CHOICE',
                valueOptionIds: raw.map(String),
            })
            continue
        }

        if (typeof raw === 'number') {
            items.push({
                key,
                type: 'NUMBER_INPUT',
                valueNumber: raw,
            })
            continue
        }

        if (typeof raw === 'boolean') {
            items.push({
                key,
                type: 'BOOLEAN',
                valueBoolean: raw,
            })
            continue
        }

        if (typeof raw === 'object') {
            items.push({
                key,
                type: 'JSON',
                valueJson: raw,
            })
            continue
        }

        items.push({
            key,
            type: 'TEXT',
            valueText: String(raw),
        })
    }

    return items
}

const prettyKey = (k: string) =>
    k
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim()

const isPlainObject = (v: any) =>
    v != null && typeof v === 'object' && !Array.isArray(v)

const getNumericValue = (item: AnswerItem): number | null => {
    if (item.valueNumber != null && !Number.isNaN(item.valueNumber)) return item.valueNumber

    if (item.valueText != null && item.valueText !== '') {
        const n = Number(item.valueText)
        if (!Number.isNaN(n)) return n
    }
    return null
}

const getCategoricalValues = (item: AnswerItem): string[] => {
    if (item.valueOptionIds && Array.isArray(item.valueOptionIds) && item.valueOptionIds.length > 0) {
        return item.valueOptionIds.map(String)
    }

    if (item.type === 'SINGLE_CHOICE') {
        if (item.valueText != null && item.valueText !== '') return [item.valueText]
        if (item.valueOptionId != null) return [String(item.valueOptionId)]
    }

    if (item.type === 'TEXT' || item.type === 'TEXTAREA' || item.type === 'EMAIL') {
        if (item.valueText != null && item.valueText !== '') return [item.valueText]
    }

    if (item.valueText != null && item.valueText !== '') return [item.valueText]

    if (item.valueBoolean != null) return [item.valueBoolean ? 'Yes' : 'No']

    return []
}

const sourceBadgeClass = (src: AnswerSource) => {
    if (src === 'INTERNAL') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'
    return 'border-amber-500/25 bg-amber-500/10 text-amber-200'
}

const Chips = ({ values }: { values: string[] }) => (
    <div className="flex flex-wrap gap-1.5">
        {values.map(v => (
            <span
                key={v}
                title={v}
                className="rounded-full border border-sky-500/20 bg-slate-950/40 px-2 py-0.5 text-xs text-sky-100"
            >
        {v}
      </span>
        ))}
    </div>
)

const MotivationMatrix = ({ value }: { value: Record<string, any> }) => {
    const entries = Object.entries(value ?? {})
    if (entries.length === 0) return <span className="text-sky-200/60">—</span>

    return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {entries.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-sky-200/70">{prettyKey(k)}</span>
                    <span className="font-semibold text-sky-50">{String(v)}</span>
                </div>
            ))}
        </div>
    )
}

const renderAnswerValue = (item: AnswerItem) => {
    if (item.valueOptionIds && item.valueOptionIds.length > 0) {
        return <Chips values={item.valueOptionIds.map(String)} />
    }

    if (item.type === 'MOTIVATION_MATRIX_SLIDER' && isPlainObject(item.valueJson)) {
        return <MotivationMatrix value={item.valueJson as Record<string, any>} />
    }

    if (item.valueBoolean != null) {
        const yes = item.valueBoolean === true
        return (
            <span
                className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                    yes
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                        : 'border-rose-500/25 bg-rose-500/10 text-rose-100',
                )}
            >
        {yes ? 'Yes' : 'No'}
      </span>
        )
    }

    if (item.valueNumber != null) {
        const invalid = Number.isNaN(item.valueNumber)
        return (
            <span className={cn('text-sky-50', invalid && 'text-rose-200')}>
        {invalid ? '—' : String(item.valueNumber)}
      </span>
        )
    }

    if (item.valueJson != null) {
        if (isPlainObject(item.valueJson)) {
            return (
                <pre className="max-h-48 overflow-auto rounded-md border border-slate-800 bg-slate-950/30 p-2 text-xs text-sky-50/90">
          {JSON.stringify(item.valueJson, null, 2)}
        </pre>
            )
        }
        return <span className="text-sky-50">{String(item.valueJson)}</span>
    }

    if (item.valueText != null && item.valueText !== '') return <span className="text-sky-50">{item.valueText}</span>
    if (item.valueOptionId != null) return <span className="text-sky-50">{String(item.valueOptionId)}</span>

    return <span className="text-sky-200/60">—</span>
}

export default function AnswersPage() {
    const { id } = useParams<{ id: string }>()
    const hackathonId = id ? Number(id) : NaN
    const navigate = useNavigate()

    const [answers, setAnswers] = useState<ParticipantAnswer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

    // Filters
    const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({})
    const [categoryFilters, setCategoryFilters] = useState<Record<string, Set<string>>>({})
    const [categoryValueSearch, setCategoryValueSearch] = useState<Record<string, string>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
    const [sourceFilter, setSourceFilter] = useState<'ALL' | AnswerSource>('ALL')

    useEffect(() => {
        if (!hackathonId || Number.isNaN(hackathonId)) return

        const fetchAnswers = async () => {
            setLoading(true)
            setError(null)

            try {
                const res = await fetch(
                    `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/answers`,
                    { credentials: 'include' },
                )

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to load answers')
                }

                const data = await res.json()

                const validated: ParticipantAnswer[] = Array.isArray(data)
                    ? data.map((item: any) => {
                        const rawAnswers = item?.answers
                        const isInternal = Array.isArray(rawAnswers)

                        const normalizedAnswers: AnswerItem[] = isInternal
                            ? rawAnswers
                            : rawAnswers && typeof rawAnswers === 'object'
                                ? normalizeImportedAnswers(rawAnswers)
                                : []

                        return {
                            participantId: item?.participantId ?? 0,
                            email: item?.email ?? '',
                            firstName: item?.firstName ?? '',
                            lastName: item?.lastName ?? '',
                            source: isInternal ? 'INTERNAL' : 'IMPORTED',
                            answers: normalizedAnswers,
                        }
                    })
                    : []

                setAnswers(validated)
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load answers')
            } finally {
                setLoading(false)
            }
        }

        fetchAnswers()
    }, [hackathonId])

    const fieldMeta = useMemo((): FieldMeta[] => {
        const fieldMap = new Map<
            string,
            { numericValues: number[]; categoricalCounts: Map<string, number> }
        >()

        for (const p of answers) {
            for (const a of p.answers) {
                if (!fieldMap.has(a.key)) {
                    fieldMap.set(a.key, { numericValues: [], categoricalCounts: new Map() })
                }
                const field = fieldMap.get(a.key)!

                const num = getNumericValue(a)
                if (num != null) field.numericValues.push(num)

                const cats = getCategoricalValues(a)
                for (const c of cats) {
                    if (!c || c.trim() === '') continue
                    field.categoricalCounts.set(c, (field.categoricalCounts.get(c) || 0) + 1)
                }
            }
        }

        const meta: FieldMeta[] = []

        for (const [key, data] of fieldMap.entries()) {
            const hasNumeric = data.numericValues.length > 0
            const hasCats = data.categoricalCounts.size > 0
            if (!hasNumeric && !hasCats) continue

            if (hasNumeric && !hasCats) {
                const minVal = Math.min(...data.numericValues)
                const maxVal = Math.max(...data.numericValues)
                meta.push({ key, isNumeric: true, minValue: minVal, maxValue: maxVal })
            } else {
                meta.push({ key, isNumeric: false, values: data.categoricalCounts })
            }
        }

        return meta.sort((a, b) => a.key.localeCompare(b.key))
    }, [answers])

    useEffect(() => {
        const toAdd: Record<string, NumericFilter> = {}

        for (const f of fieldMeta) {
            if (!f.isNumeric) continue
            if (f.minValue == null || f.maxValue == null) continue
            if (numericFilters[f.key]) continue
            toAdd[f.key] = { min: f.minValue, max: f.maxValue }
        }

        if (Object.keys(toAdd).length > 0) {
            setNumericFilters(prev => ({ ...prev, ...toAdd }))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldMeta])

    const filteredAnswers = useMemo(() => {
        const term = searchTerm.trim().toLowerCase()

        return answers.filter(p => {
            if (sourceFilter !== 'ALL' && p.source !== sourceFilter) return false

            if (term) {
                const hay =
                    `${p.firstName ?? ''} ${p.lastName ?? ''} ${p.email ?? ''}`.toLowerCase()
                if (!hay.includes(term)) return false
            }

            for (const [key, filter] of Object.entries(numericFilters)) {
                const meta = fieldMeta.find(f => f.key === key)
                if (!meta?.isNumeric) continue

                const ans = p.answers.find(a => a.key === key)
                if (!ans) continue

                const v = getNumericValue(ans)
                if (v == null) continue

                if (v < filter.min || v > filter.max) return false
            }

            for (const [key, selected] of Object.entries(categoryFilters)) {
                if (selected.size === 0) continue

                const ans = p.answers.find(a => a.key === key)
                if (!ans) return false

                const values = getCategoricalValues(ans)
                const ok = values.some(v => selected.has(v))
                if (!ok) return false
            }

            return true
        })
    }, [answers, sourceFilter, searchTerm, numericFilters, categoryFilters, fieldMeta])

    const hasActiveFilters = useMemo(() => {
        if (searchTerm.trim()) return true
        if (sourceFilter !== 'ALL') return true

        for (const v of Object.values(categoryFilters)) {
            if (v.size > 0) return true
        }

        for (const [key, filter] of Object.entries(numericFilters)) {
            const meta = fieldMeta.find(f => f.key === key)
            if (!meta?.isNumeric || meta.minValue == null || meta.maxValue == null) continue
            if (filter.min > meta.minValue || filter.max < meta.maxValue) return true
        }

        return false
    }, [searchTerm, sourceFilter, categoryFilters, numericFilters, fieldMeta])

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    const toggleExpanded = (participantId: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(participantId)) next.delete(participantId)
            else next.add(participantId)
            return next
        })
    }

    const expandAll = () => setExpandedIds(new Set(filteredAnswers.map(a => a.participantId)))
    const collapseAll = () => setExpandedIds(new Set())
    const allExpanded =
        filteredAnswers.length > 0 && filteredAnswers.every(a => expandedIds.has(a.participantId))

    const toggleCategory = (key: string, value: string) => {
        setCategoryFilters(prev => {
            const current = prev[key] ?? new Set<string>()
            const next = new Set(current)
            if (next.has(value)) next.delete(value)
            else next.add(value)
            return { ...prev, [key]: next }
        })
    }

    const updateNumericFilter = (key: string, part: 'min' | 'max', value: number) => {
        setNumericFilters(prev => {
            const current = prev[key]
            if (!current) return prev
            const next = { ...current, [part]: value }
            return { ...prev, [key]: next }
        })
    }

    const clearAllFilters = () => {
        setSearchTerm('')
        setSourceFilter('ALL')
        setCategoryFilters({})
        setCategoryValueSearch({})

        const reset: Record<string, NumericFilter> = {}
        for (const f of fieldMeta) {
            if (!f.isNumeric || f.minValue == null || f.maxValue == null) continue
            reset[f.key] = { min: f.minValue, max: f.maxValue }
        }
        setNumericFilters(reset)
    }

    const activeChips = useMemo(() => {
        const chips: { id: string; label: string; onRemove: () => void }[] = []

        if (sourceFilter !== 'ALL') {
            chips.push({
                id: 'src',
                label: `Source: ${sourceFilter}`,
                onRemove: () => setSourceFilter('ALL'),
            })
        }

        if (searchTerm.trim()) {
            chips.push({
                id: 'search',
                label: `Search: ${searchTerm.trim()}`,
                onRemove: () => setSearchTerm(''),
            })
        }

        for (const [k, setVals] of Object.entries(categoryFilters)) {
            for (const v of setVals) {
                chips.push({
                    id: `cat:${k}:${v}`,
                    label: `${prettyKey(k)}: ${v}`,
                    onRemove: () => toggleCategory(k, v),
                })
            }
        }

        for (const [k, f] of Object.entries(numericFilters)) {
            const meta = fieldMeta.find(m => m.key === k)
            if (!meta?.isNumeric || meta.minValue == null || meta.maxValue == null) continue
            if (f.min === meta.minValue && f.max === meta.maxValue) continue

            chips.push({
                id: `num:${k}`,
                label: `${prettyKey(k)}: ${f.min}–${f.max}`,
                onRemove: () =>
                    setNumericFilters(prev => ({
                        ...prev,
                        [k]: { min: meta.minValue!, max: meta.maxValue! },
                    })),
            })
        }

        return chips
    }, [sourceFilter, searchTerm, categoryFilters, numericFilters, fieldMeta])

    return (
        <div
            className={cn(
                'mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6',
                // kill the bright scrollbars on Windows
                // (Tailwind doesn't ship scrollbar utilities by default, so we do it inline)
            )}
            style={{
                scrollbarColor: 'rgba(148,163,184,0.35) rgba(2,6,23,0.25)', // thumb track
            }}
        >
            <style>{`
        /* Dark, subtle scrollbars (Chromium/WebKit) */
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: rgba(2,6,23,0.25); }
        ::-webkit-scrollbar-thumb {
          background: rgba(148,163,184,0.30);
          border-radius: 999px;
          border: 2px solid rgba(2,6,23,0.35);
        }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.45); }
      `}</style>

            {/* Header */}
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        type="button"
                        onClick={() => navigate(-1)}
                        className="border-sky-500/40 bg-slate-900/80 text-sky-100 hover:bg-slate-800/70"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>

                    <div>
                        <div className="text-lg font-semibold text-sky-50">Questionnaire answers</div>
                        <div className="text-xs text-sky-200/60">
                            {loading ? 'Loading…' : `${filteredAnswers.length}/${answers.length} participants shown`}
                        </div>
                    </div>
                </div>

                {!loading && !error && answers.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={allExpanded ? collapseAll : expandAll}
                            className="border-sky-500/25 bg-slate-900/70 text-sky-100 hover:bg-slate-800/60"
                        >
                            {allExpanded ? 'Collapse all' : 'Expand all'}
                        </Button>
                    </div>
                )}
            </header>

            {/* Loading */}
            {loading && (
                <Card className="border border-sky-500/20 bg-slate-900/70">
                    <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-sky-200/80">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading answers…
                    </CardContent>
                </Card>
            )}

            {/* Error */}
            {!loading && error && (
                <div className="rounded-lg border border-rose-500/25 bg-rose-950/20 p-4 text-sm text-rose-200">
                    {error}
                </div>
            )}

            {/* Empty */}
            {!loading && !error && answers.length === 0 && (
                <Card className="border border-sky-500/20 bg-slate-900/70">
                    <CardContent className="py-8 text-center text-sm text-sky-200/80">
                        No answers have been submitted yet.
                    </CardContent>
                </Card>
            )}

            {/* Content */}
            {!loading && !error && answers.length > 0 && (
                <div className="flex gap-5">
                    {/* Sidebar */}
                    <aside
                        className="sticky top-4 h-[calc(100vh-2rem)] w-64 flex-shrink-0 overflow-y-auto space-y-3 pr-2"
                        style={{
                            scrollbarColor: 'rgba(148,163,184,0.30) rgba(2,6,23,0.20)',
                            scrollbarWidth: 'thin',
                        }}
                    >
                        {/* Filters header */}
                        <div className="rounded-lg border border-sky-500/20 bg-slate-900/70 p-3">
                            <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold text-sky-50">Filters</div>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearAllFilters}
                                        className="text-xs text-sky-300 hover:text-sky-100"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {activeChips.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {activeChips.slice(0, 10).map(ch => (
                                        <button
                                            key={ch.id}
                                            type="button"
                                            onClick={ch.onRemove}
                                            className="group inline-flex items-center gap-1 rounded-full border border-sky-500/20 bg-slate-950/40 px-2 py-0.5 text-[11px] text-sky-100 hover:border-sky-500/35"
                                            title="Remove filter"
                                        >
                                            {ch.label}
                                            <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                    {activeChips.length > 10 && (
                                        <span className="text-[11px] text-sky-200/60">
                      +{activeChips.length - 10} more
                    </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Search */}
                        <div className="rounded-lg border border-sky-500/20 bg-slate-900/70 p-3">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
                                <Input
                                    type="text"
                                    placeholder="Search name/email"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="h-9 border-sky-500/40 bg-slate-900/80 pl-8 text-sm text-sky-50 placeholder:text-sky-200/40"
                                />
                            </div>
                        </div>

                        {/* Source */}
                        <div className="rounded-lg border border-sky-500/20 bg-slate-900/70 p-3">
                            <div className="mb-2 text-xs font-semibold text-sky-100/80">Source</div>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSourceFilter('ALL')}
                                    className={cn(
                                        'rounded-md border px-3 py-1.5 text-[11px] font-semibold',
                                        sourceFilter === 'ALL'
                                            ? 'border-sky-500/35 bg-sky-500/10 text-sky-100'
                                            : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-900/60',
                                    )}
                                >
                                    All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSourceFilter('INTERNAL')}
                                    className={cn(
                                        'rounded-md border px-3 py-1.5 text-[11px] font-semibold',
                                        sourceFilter === 'INTERNAL'
                                            ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-100'
                                            : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-900/60',
                                    )}
                                >
                                    Internal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSourceFilter('IMPORTED')}
                                    className={cn(
                                        'rounded-md border px-3 py-1.5 text-[11px] font-semibold',
                                        sourceFilter === 'IMPORTED'
                                            ? 'border-amber-500/35 bg-amber-500/10 text-amber-100'
                                            : 'border-slate-700 bg-slate-950/50 text-slate-300 hover:bg-slate-900/60',
                                    )}
                                >
                                    Imported
                                </button>
                            </div>
                        </div>

                        {/* Field Filters */}
                        {fieldMeta.map(field => {
                            const isCollapsed = collapsedSections.has(field.key)

                            return (
                                <div
                                    key={field.key}
                                    className="rounded-lg border border-sky-500/20 bg-slate-900/70 p-3"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleSection(field.key)}
                                        className="flex w-full items-center justify-between gap-2"
                                    >
                                        <div className="min-w-0 text-left">
                                            <div className="truncate text-xs font-semibold text-sky-100/85">
                                                {prettyKey(field.key)}
                                            </div>
                                            <div className="text-[11px] text-sky-200/50">
                                                {field.isNumeric ? 'Range' : 'Categories'}
                                            </div>
                                        </div>
                                        {isCollapsed ? (
                                            <ChevronDown className="h-4 w-4 text-sky-300" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4 text-sky-300" />
                                        )}
                                    </button>

                                    {!isCollapsed && (
                                        <div className="mt-3">
                                            {field.isNumeric ? (
                                                (() => {
                                                    const minVal = field.minValue ?? 0
                                                    const maxVal = field.maxValue ?? 0
                                                    const current = numericFilters[field.key] ?? { min: minVal, max: maxVal }
                                                    const currentMin = current.min
                                                    const currentMax = current.max

                                                    const safeRange = Math.max(1, maxVal - minVal)
                                                    const leftPercent = ((currentMin - minVal) / safeRange) * 100
                                                    const rightPercent = 100 - ((currentMax - minVal) / safeRange) * 100

                                                    return (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between text-[11px] text-sky-200/70">
                                                                <span>{currentMin}</span>
                                                                <span className="text-sky-200/40">to</span>
                                                                <span>{currentMax}</span>
                                                            </div>

                                                            <div className="relative h-5">
                                                                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-800" />
                                                                <div
                                                                    className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-sky-500/50"
                                                                    style={{ left: `${leftPercent}%`, right: `${rightPercent}%` }}
                                                                />

                                                                <input
                                                                    type="range"
                                                                    min={minVal}
                                                                    max={maxVal}
                                                                    value={currentMin}
                                                                    onChange={e => {
                                                                        const v = Number(e.target.value)
                                                                        if (Number.isNaN(v)) return
                                                                        if (v <= currentMax) updateNumericFilter(field.key, 'min', v)
                                                                    }}
                                                                    className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none
                                    [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-600
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-600
                                    [&::-moz-range-thumb]:cursor-pointer"
                                                                />

                                                                <input
                                                                    type="range"
                                                                    min={minVal}
                                                                    max={maxVal}
                                                                    value={currentMax}
                                                                    onChange={e => {
                                                                        const v = Number(e.target.value)
                                                                        if (Number.isNaN(v)) return
                                                                        if (v >= currentMin) updateNumericFilter(field.key, 'max', v)
                                                                    }}
                                                                    className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none
                                    [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
                                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full
                                    [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-600
                                    [&::-webkit-slider-thumb]:cursor-pointer
                                    [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4
                                    [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-600
                                    [&::-moz-range-thumb]:cursor-pointer"
                                                                />
                                                            </div>

                                                            <div className="flex items-center justify-between gap-2">
                                                                <Input
                                                                    type="number"
                                                                    value={currentMin}
                                                                    onChange={e => {
                                                                        const v = Number(e.target.value)
                                                                        if (Number.isNaN(v)) return
                                                                        updateNumericFilter(field.key, 'min', Math.min(v, currentMax))
                                                                    }}
                                                                    className="h-8 w-20 border-sky-500/40 bg-slate-900/80 px-2 text-center text-xs text-sky-50"
                                                                />
                                                                <span className="text-sky-200/60">–</span>
                                                                <Input
                                                                    type="number"
                                                                    value={currentMax}
                                                                    onChange={e => {
                                                                        const v = Number(e.target.value)
                                                                        if (Number.isNaN(v)) return
                                                                        updateNumericFilter(field.key, 'max', Math.max(v, currentMin))
                                                                    }}
                                                                    className="h-8 w-20 border-sky-500/40 bg-slate-900/80 px-2 text-center text-xs text-sky-50"
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })()
                                            ) : (
                                                (() => {
                                                    const allValues = Array.from(field.values?.entries() ?? [])
                                                        .sort((a, b) => b[1] - a[1])
                                                    const search = (categoryValueSearch[field.key] ?? '').trim().toLowerCase()
                                                    const shownValues = search
                                                        ? allValues.filter(([v]) => v.toLowerCase().includes(search))
                                                        : allValues

                                                    const showSearchBox = allValues.length >= 10

                                                    return (
                                                        <div className="space-y-2">
                                                            {showSearchBox && (
                                                                <Input
                                                                    value={categoryValueSearch[field.key] ?? ''}
                                                                    onChange={e =>
                                                                        setCategoryValueSearch(prev => ({
                                                                            ...prev,
                                                                            [field.key]: e.target.value,
                                                                        }))
                                                                    }
                                                                    placeholder="Search values…"
                                                                    className="h-8 border-sky-500/30 bg-slate-950/40 text-xs text-sky-50 placeholder:text-sky-200/40"
                                                                />
                                                            )}

                                                            <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                                                                {shownValues.map(([value, count]) => {
                                                                    const selected = categoryFilters[field.key]?.has(value) ?? false
                                                                    return (
                                                                        <label
                                                                            key={value}
                                                                            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-xs hover:bg-slate-950/30"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selected}
                                                                                onChange={() => toggleCategory(field.key, value)}
                                                                                className="h-3.5 w-3.5 rounded border-sky-500/40 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                                                                            />
                                                                            <span className="flex-1 truncate text-sky-100" title={value}>
                                        {value}
                                      </span>
                                                                            <span className="text-sky-200/50">{count}</span>
                                                                        </label>
                                                                    )
                                                                })}

                                                                {shownValues.length === 0 && (
                                                                    <div className="py-2 text-xs text-sky-200/60">
                                                                        No matching values.
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })()
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </aside>

                    {/* Main */}
                    <main
                        className="flex-1 space-y-3"
                        style={{
                            scrollbarColor: 'rgba(148,163,184,0.30) rgba(2,6,23,0.20)',
                            scrollbarWidth: 'thin',
                        }}
                    >
                        {filteredAnswers.length === 0 ? (
                            <Card className="border border-sky-500/20 bg-slate-900/70">
                                <CardContent className="py-6 text-center text-sm text-sky-200/80">
                                    No participants match the current filters.
                                </CardContent>
                            </Card>
                        ) : (
                            filteredAnswers.map(p => {
                                const isExpanded = expandedIds.has(p.participantId)
                                return (
                                    <Card
                                        key={p.participantId}
                                        className="overflow-hidden border border-sky-500/20 bg-slate-900/70"
                                    >
                                        <CardHeader className="py-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <CardTitle className="flex min-w-0 items-center gap-2 text-base text-sky-50">
                                                    <User className="h-4 w-4 flex-shrink-0 text-sky-400" />
                                                    <span className="truncate">
                            {p.firstName} {p.lastName}
                          </span>
                                                    <span className="ml-2 hidden truncate text-xs font-normal text-sky-200/60 md:inline">
                            {p.email}
                          </span>
                                                    <span
                                                        className={cn(
                                                            'ml-2 inline-flex flex-shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                                            sourceBadgeClass(p.source),
                                                        )}
                                                    >
                            {p.source}
                          </span>
                                                </CardTitle>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpanded(p.participantId)}
                                                    className="flex flex-shrink-0 items-center gap-1 text-xs text-sky-300 transition-colors hover:text-sky-100"
                                                >
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="mt-1 text-xs text-sky-200/60 md:hidden">{p.email}</div>
                                        </CardHeader>

                                        {isExpanded && (
                                            <CardContent className="pt-0">
                                                <div className="grid gap-3 text-sm md:grid-cols-2">
                                                    {p.answers.map((item, idx) => (
                                                        <div
                                                            key={`${item.key}-${idx}`}
                                                            className="rounded-md border border-slate-800 bg-slate-950/20 p-3"
                                                        >
                                                            <div className="mb-1 text-xs font-semibold text-sky-200/70">
                                                                {prettyKey(item.key)}
                                                            </div>
                                                            <div className="break-words">{renderAnswerValue(item)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        )}
                                    </Card>
                                )
                            })
                        )}
                    </main>
                </div>
            )}
        </div>
    )
}
