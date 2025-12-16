import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Loader2, ChevronDown, ChevronUp, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/config'

interface ParticipantAnswer {
    participantId: number
    email: string
    firstName: string
    lastName: string
    answers: AnswerItem[]
}

interface AnswerItem {
    key: string
    type?: string
    valueText?: string
    valueNumber?: number
    valueBoolean?: boolean
    valueOptionId?: string
}

interface NumericFilter {
    min: number
    max: number
}

interface FieldMeta {
    key: string
    isNumeric: boolean
    // For numeric fields
    minValue?: number
    maxValue?: number
    // For categorical fields
    values?: Map<string, number> // value -> count
}

export default function AnswersPage() {
    const { id } = useParams<{ id: string }>()
    const hackathonId = id ? Number(id) : NaN
    const navigate = useNavigate()

    const [answers, setAnswers] = useState<ParticipantAnswer[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
    
    // Filter state
    const [numericFilters, setNumericFilters] = useState<Record<string, NumericFilter>>({})
    const [categoryFilters, setCategoryFilters] = useState<Record<string, Set<string>>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!hackathonId || Number.isNaN(hackathonId)) return

        const fetchAnswers = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(
                    `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/answers`,
                    { credentials: 'include' }
                )
                if (!res.ok) {
                    throw new Error('Failed to load answers')
                }
                const data = await res.json()
                // Validate and sanitize the response
                const validatedData: ParticipantAnswer[] = Array.isArray(data) 
                    ? data.map((item: any) => ({
                        participantId: item?.participantId ?? 0,
                        email: item?.email ?? '',
                        firstName: item?.firstName ?? '',
                        lastName: item?.lastName ?? '',
                        answers: Array.isArray(item?.answers) ? item.answers : []
                    }))
                    : []
                setAnswers(validatedData)
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load answers')
            } finally {
                setLoading(false)
            }
        }

        fetchAnswers()
    }, [hackathonId])

    const formatValue = (item: AnswerItem): string => {
        if (item.valueText != null && item.valueText !== '') return item.valueText
        if (item.valueNumber != null) return String(item.valueNumber)
        if (item.valueBoolean != null) return item.valueBoolean ? 'Yes' : 'No'
        if (item.valueOptionId != null) return item.valueOptionId
        return '—'
    }

    const getNumericValue = (item: AnswerItem): number | null => {
        if (item.valueNumber != null) return item.valueNumber
        // Try parsing text as number
        if (item.valueText != null) {
            const n = parseFloat(item.valueText)
            if (!isNaN(n)) return n
        }
        return null
    }

    // Analyze fields to determine type and gather metadata
    const fieldMeta = useMemo(() => {
        const meta: FieldMeta[] = []
        const fieldMap = new Map<string, { numericValues: number[], textValues: Map<string, number> }>()

        answers.forEach(p => {
            p.answers.forEach(a => {
                if (!fieldMap.has(a.key)) {
                    fieldMap.set(a.key, { numericValues: [], textValues: new Map() })
                }
                const field = fieldMap.get(a.key)!
                
                const numVal = getNumericValue(a)
                if (numVal !== null) {
                    field.numericValues.push(numVal)
                }
                
                const textVal = formatValue(a)
                if (textVal !== '—') {
                    field.textValues.set(textVal, (field.textValues.get(textVal) || 0) + 1)
                }
            })
        })

        fieldMap.forEach((data, key) => {
            const totalAnswers = data.textValues.size
            
            if (totalAnswers === 0) return
            


            const isNumeric = data.numericValues.length > 0;

            if (isNumeric) {
                const minVal = Math.min(...data.numericValues)
                const maxVal = Math.max(...data.numericValues)
                
                meta.push({
                    key,
                    isNumeric: true,
                    minValue: minVal,
                    maxValue: maxVal,
                })
            } else {
                meta.push({
                    key,
                    isNumeric: false,
                    values: data.textValues,
                })
            }
        })

        return meta.sort((a, b) => a.key.localeCompare(b.key))
    }, [answers])

    // Initialize numeric filters when fieldMeta changes
    useEffect(() => {
        const newFilters: Record<string, NumericFilter> = {}
        fieldMeta.forEach(f => {
            if (f.isNumeric && f.minValue !== undefined && f.maxValue !== undefined) {
                if (!numericFilters[f.key]) {
                    newFilters[f.key] = { min: f.minValue, max: f.maxValue }
                }
            }
        })
        if (Object.keys(newFilters).length > 0) {
            setNumericFilters(prev => ({ ...prev, ...newFilters }))
        }
    }, [fieldMeta])

    // Filter participants
    const filteredAnswers = useMemo(() => {
        return answers.filter(participant => {
            // Search filter (name/email) - with null safety
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase()
                const firstName = (participant.firstName ?? '').toLowerCase()
                const lastName = (participant.lastName ?? '').toLowerCase()
                const email = (participant.email ?? '').toLowerCase()
                const match = firstName.includes(term) || lastName.includes(term) || email.includes(term)
                if (!match) return false
            }

            // Numeric filters
            for (const [key, filter] of Object.entries(numericFilters)) {
                const meta = fieldMeta.find(f => f.key === key)
                if (!meta || !meta.isNumeric) continue
                
                const answer = participant.answers.find(a => a.key === key)
                if (!answer) continue
                
                const val = getNumericValue(answer)
                if (val === null) continue
                
                if (val < filter.min || val > filter.max) return false
            }

            // Category filters
            for (const [key, selectedValues] of Object.entries(categoryFilters)) {
                if (selectedValues.size === 0) continue
                
                const answer = participant.answers.find(a => a.key === key)
                if (!answer) return false
                
                const val = formatValue(answer)
                if (!selectedValues.has(val)) return false
            }

            return true
        })
    }, [answers, searchTerm, numericFilters, categoryFilters, fieldMeta])

    const toggleCategory = (key: string, value: string) => {
        setCategoryFilters(prev => {
            const current = prev[key] || new Set()
            const next = new Set(current)
            if (next.has(value)) {
                next.delete(value)
            } else {
                next.add(value)
            }
            return { ...prev, [key]: next }
        })
    }

    const updateNumericFilter = (key: string, filterField: 'min' | 'max', value: number) => {
        setNumericFilters(prev => {
            const current = prev[key]
            if (!current) return prev // Safety: don't update if filter doesn't exist yet
            return {
                ...prev,
                [key]: { ...current, [filterField]: value }
            }
        })
    }

    const clearAllFilters = () => {
        setSearchTerm('')
        setCategoryFilters({})
        // Reset numeric filters to full range
        const resetNumeric: Record<string, NumericFilter> = {}
        fieldMeta.forEach(f => {
            if (f.isNumeric && f.minValue !== undefined && f.maxValue !== undefined) {
                resetNumeric[f.key] = { min: f.minValue, max: f.maxValue }
            }
        })
        setNumericFilters(resetNumeric)
    }

    const hasActiveFilters = useMemo(() => {
        if (searchTerm.trim()) return true
        for (const selected of Object.values(categoryFilters)) {
            if (selected.size > 0) return true
        }
        for (const [key, filter] of Object.entries(numericFilters)) {
            const meta = fieldMeta.find(f => f.key === key)
            if (meta?.isNumeric && meta.minValue !== undefined && meta.maxValue !== undefined) {
                if (filter.min > meta.minValue || filter.max < meta.maxValue) return true
            }
        }
        return false
    }, [searchTerm, categoryFilters, numericFilters, fieldMeta])

    const toggleSection = (key: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    const toggleExpanded = (participantId: number) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(participantId)) {
                next.delete(participantId)
            } else {
                next.add(participantId)
            }
            return next
        })
    }

    const expandAll = () => {
        setExpandedIds(new Set(filteredAnswers.map(a => a.participantId)))
    }

    const collapseAll = () => {
        setExpandedIds(new Set())
    }

    const allExpanded = filteredAnswers.length > 0 && 
        filteredAnswers.every(a => expandedIds.has(a.participantId))

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
            {/* Header */}
            <header className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="border-sky-500/40 bg-slate-900/80 text-sky-100 hover:bg-slate-800/70"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold text-sky-50">
                            Submitted Answers
                        </h1>
                        <p className="text-sm text-sky-100/70">
                            {filteredAnswers.length} of {answers.length} participants
                        </p>
                    </div>
                </div>
                {answers.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={allExpanded ? collapseAll : expandAll}
                        className="border-sky-500/40 bg-slate-900/80 text-sky-100 hover:bg-slate-800/70"
                    >
                        {allExpanded ? (
                            <>
                                <ChevronUp className="h-4 w-4 mr-1" />
                                Collapse All
                            </>
                        ) : (
                            <>
                                <ChevronDown className="h-4 w-4 mr-1" />
                                Expand All
                            </>
                        )}
                    </Button>
                )}
            </header>

            {loading && (
                <div className="flex items-center gap-2 text-sky-100/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading answers…
                </div>
            )}

            {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 text-sm text-rose-200">
                    {error}
                </div>
            )}

            {!loading && !error && answers.length === 0 && (
                <Card className="border border-sky-500/20 bg-slate-900/70">
                    <CardContent className="py-8 text-center text-sm text-sky-200/80">
                        No answers have been submitted yet.
                    </CardContent>
                </Card>
            )}

            {!loading && !error && answers.length > 0 && (
                <div className="flex gap-5">
                    {/* Sidebar Filters */}
                    <aside className="w-56 flex-shrink-0 space-y-3">
                        {/* Search */}
                        <div className="rounded-lg border border-sky-500/20 bg-slate-900/70 p-2.5">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-400" />
                                <Input
                                    type="text"
                                    placeholder="Search name/email"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="h-8 pl-8 border-sky-500/40 bg-slate-900/80 text-sm text-sky-50 placeholder:text-sky-200/40"
                                />
                            </div>
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-100"
                            >
                                <X className="h-3 w-3" />
                                Clear all filters
                            </button>
                        )}

                        {/* Filter Sections */}
                        {fieldMeta.map(field => {
                            const isCollapsed = collapsedSections.has(field.key)
                            
                            return (
                                <div key={field.key} className="rounded-lg border border-sky-500/20 bg-slate-900/70 overflow-hidden">
                                    <button
                                        onClick={() => toggleSection(field.key)}
                                        className="flex w-full items-center justify-between p-3 text-left hover:bg-slate-800/30"
                                    >
                                        <span className="text-sm font-medium text-sky-100">{field.key}</span>
                                        {isCollapsed ? (
                                            <ChevronDown className="h-4 w-4 text-sky-400" />
                                        ) : (
                                            <ChevronUp className="h-4 w-4 text-sky-400" />
                                        )}
                                    </button>
                                    
                                    {!isCollapsed && (
                                        <div className="px-3 pb-3">
                                            {field.isNumeric && field.minValue !== undefined && field.maxValue !== undefined ? (
                                                // Numeric Range Filter with dual slider
                                                (() => {
                                                    const minVal = field.minValue
                                                    const maxVal = field.maxValue
                                                    const range = maxVal - minVal
                                                    const currentMin = numericFilters[field.key]?.min ?? minVal
                                                    const currentMax = numericFilters[field.key]?.max ?? maxVal
                                                    // Avoid division by zero
                                                    const leftPercent = range > 0 ? ((currentMin - minVal) / range) * 100 : 0
                                                    const rightPercent = range > 0 ? 100 - ((currentMax - minVal) / range) * 100 : 0

                                                    return (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    value={currentMin}
                                                                    onChange={(e) => updateNumericFilter(field.key, 'min', Number(e.target.value))}
                                                                    className="h-7 w-16 border-sky-500/40 bg-slate-900/80 text-xs text-sky-50 text-center px-1"
                                                                />
                                                                <span className="text-sky-200/60">–</span>
                                                                <Input
                                                                    type="number"
                                                                    value={currentMax}
                                                                    onChange={(e) => updateNumericFilter(field.key, 'max', Number(e.target.value))}
                                                                    className="h-7 w-16 border-sky-500/40 bg-slate-900/80 text-xs text-sky-50 text-center px-1"
                                                                />
                                                            </div>
                                                            {/* Dual Range Slider - only show if there's a range */}
                                                            {range > 0 && (
                                                                <div className="relative h-5">
                                                                    {/* Track background */}
                                                                    <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded bg-slate-700" />
                                                                    {/* Active range highlight */}
                                                                    <div 
                                                                        className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-sky-500"
                                                                        style={{ left: `${leftPercent}%`, right: `${rightPercent}%` }}
                                                                    />
                                                                    {/* Min slider */}
                                                                    <input
                                                                        type="range"
                                                                        min={minVal}
                                                                        max={maxVal}
                                                                        value={currentMin}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value)
                                                                            if (val <= currentMax) {
                                                                                updateNumericFilter(field.key, 'min', val)
                                                                            }
                                                                        }}
                                                                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-600 [&::-moz-range-thumb]:cursor-pointer"
                                                                    />
                                                                    {/* Max slider */}
                                                                    <input
                                                                        type="range"
                                                                        min={minVal}
                                                                        max={maxVal}
                                                                        value={currentMax}
                                                                        onChange={(e) => {
                                                                            const val = Number(e.target.value)
                                                                            if (val >= currentMin) {
                                                                                updateNumericFilter(field.key, 'max', val)
                                                                            }
                                                                        }}
                                                                        className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sky-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-sky-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-sky-400 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-sky-600 [&::-moz-range-thumb]:cursor-pointer"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })()
                                            ) : (
                                                // Categorical Checkbox Filter
                                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                                    {Array.from(field.values?.entries() || [])
                                                        .sort((a, b) => b[1] - a[1])
                                                        .map(([value, count]) => {
                                                            const isSelected = categoryFilters[field.key]?.has(value)
                                                            return (
                                                                <label
                                                                    key={value}
                                                                    className="flex items-center gap-2 cursor-pointer py-0.5 text-xs"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected || false}
                                                                        onChange={() => toggleCategory(field.key, value)}
                                                                        className="h-3.5 w-3.5 rounded border-sky-500/40 bg-slate-900 text-sky-500 focus:ring-sky-500/50"
                                                                    />
                                                                    <span className="flex-1 text-sky-100 truncate" title={value}>
                                                                        {value}
                                                                    </span>
                                                                    <span className="text-sky-200/50">{count}</span>
                                                                </label>
                                                            )
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 space-y-3">
                        {filteredAnswers.length === 0 ? (
                            <Card className="border border-sky-500/20 bg-slate-900/70">
                                <CardContent className="py-6 text-center text-sm text-sky-200/80">
                                    No participants match the current filters.
                                </CardContent>
                            </Card>
                        ) : (
                            filteredAnswers.map((participant) => {
                                const isExpanded = expandedIds.has(participant.participantId)
                                return (
                                    <Card
                                        key={participant.participantId}
                                        className="border border-sky-500/20 bg-slate-900/70 overflow-hidden"
                                    >
                                        <CardHeader className="py-3">
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="flex items-center gap-2 text-base text-sky-50">
                                                    <User className="h-4 w-4 text-sky-400" />
                                                    {participant.firstName} {participant.lastName}
                                                    <span className="ml-2 text-xs font-normal text-sky-200/60">
                                                        {participant.email}
                                                    </span>
                                                </CardTitle>
                                                <button
                                                    onClick={() => toggleExpanded(participant.participantId)}
                                                    className="flex items-center gap-1 text-xs text-sky-300 hover:text-sky-100 transition-colors"
                                                >
                                                    {isExpanded ? 'Show less' : 'Show more'}
                                                    {isExpanded ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                        </CardHeader>
                                        {isExpanded && (
                                            <CardContent className="pt-0">
                                                <div className="grid gap-2 text-sm">
                                                    {participant.answers.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="border-b border-slate-800 py-1.5 last:border-0"
                                                        >
                                                            <div className="text-sky-200/70 text-xs mb-0.5">{item.key}</div>
                                                            <div className="text-sky-50 break-all">{formatValue(item)}</div>
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
