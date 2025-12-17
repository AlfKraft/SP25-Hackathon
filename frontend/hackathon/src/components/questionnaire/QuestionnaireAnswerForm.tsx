import React, { useEffect, useMemo, useState } from 'react'
import type { Question } from '@/types/questionnaire'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react'

type QuestionType = Question['type']

export type AnswerRow = {
    questionId: string // UUID
    type: QuestionType
    key: string

    valueText?: string | null
    valueNumber?: number | null
    valueBoolean?: boolean | null
    valueOptionId?: string | null
    valueOptionIds?: string[] | null
    valueJson?: Record<string, number> | null
}

type AnswersById = Record<string, unknown>
type ErrorsById = Record<string, string>

interface Props {
    questions: Question[]
    onSubmit: (payload: { answers: AnswerRow[] }) => Promise<void> | void
}

type SubmitStatus = 'idle' | 'success' | 'error'

function isAnswered(q: Question, v: unknown): boolean {
    if (q.type === 'MULTI_CHOICE') return Array.isArray(v) && v.length > 0

    if (q.type === 'NUMBER_SLIDER') {
        return v !== null && v !== undefined && v !== ''
    }

    if (q.type === 'MOTIVATION_MATRIX_SLIDER') {
        const obj = (v ?? {}) as Record<string, number | null>
        return q.rows.every(r => typeof obj[r.key] === 'number')
    }

    return v !== null && v !== undefined && String(v).trim() !== ''
}

function buildAnswerRow(q: Question, raw: unknown): AnswerRow {
    const base: AnswerRow = { questionId: q.id, type: q.type, key: q.key }

    switch (q.type) {
        case 'TEXT':
            return { ...base, valueText: (raw ?? '').toString() }

        case 'LONG_TEXT':
            return { ...base, valueText: (raw ?? '').toString() }

        case 'NUMBER_INPUT': {
            const s = (raw ?? '').toString().trim()
            return { ...base, valueNumber: s ? Number(s) : null }
        }

        case 'NUMBER_SLIDER': {
            const n = typeof raw === 'number' ? raw : Number(raw)
            return { ...base, valueNumber: Number.isFinite(n) ? n : null }
        }

        case 'SINGLE_CHOICE': {
            const selectedOptionId = raw ? String(raw) : null
            const selectedOption = q.options.find(opt => opt.id === selectedOptionId)
            const labelText = selectedOption?.label ?? null

            let valueBoolean: boolean | null = null
            if (q.key === 'age_verification' && labelText) {
                valueBoolean = labelText.toLowerCase().startsWith('yes')
            }

            return {
                ...base,
                valueOptionId: selectedOptionId,
                valueText: labelText,
                valueBoolean,
            }
        }

        case 'MULTI_CHOICE':
            return { ...base, valueOptionIds: Array.isArray(raw) ? (raw as string[]) : [] }

        case 'MOTIVATION_MATRIX_SLIDER': {
            const map = (raw ?? {}) as Record<string, number | null>
            const cleaned: Record<string, number> = {}

            for (const [k, v] of Object.entries(map)) {
                if (typeof v === 'number') cleaned[k] = v
            }

            return { ...base, valueJson: cleaned, valueText: null }
        }

        default:
            return base
    }
}

function QuestionSideNav({
                             questions,
                             currentIndex,
                             answersById,
                             errors,
                             onJump,
                         }: {
    questions: Question[]
    currentIndex: number
    answersById: AnswersById
    errors: ErrorsById
    onJump: (index: number) => void
}) {
    return (
        <div className="sticky top-24 hidden w-56 shrink-0 lg:block">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-2 backdrop-blur">
                <div className="mb-2 px-2 text-[11px] font-semibold text-slate-300">Questions</div>
                <div className="space-y-1">
                    {questions.map((q, i) => {
                        const answered = isAnswered(q, answersById[q.id])
                        const hasError = !!errors[q.id]
                        const isActive = i === currentIndex

                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => onJump(i)}
                                className={cn(
                                    'w-full rounded-xl px-2 py-2 text-left text-xs transition',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25',
                                    isActive && 'border border-sky-500/25 bg-sky-500/10 text-sky-100',
                                    !isActive && 'border border-transparent hover:bg-slate-900/60',
                                    hasError && 'text-rose-300',
                                    answered && !hasError && !isActive && 'text-emerald-300',
                                    !answered && !hasError && !isActive && 'text-slate-300',
                                )}
                            >
                                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">
                    {i + 1}. {q.label || q.key}
                  </span>
                                    <span
                                        className={cn(
                                            'ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                            hasError && 'border-rose-500/25 bg-rose-500/10 text-rose-200',
                                            answered &&
                                            !hasError &&
                                            'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
                                            !answered && !hasError && 'border-slate-800 bg-slate-900/50 text-slate-400',
                                        )}
                                    >
                    {hasError ? '!' : answered ? '✓' : '•'}
                  </span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export function QuestionnaireAnswerForm({ questions, onSubmit }: Props) {
    const sortedQuestions = useMemo(() => {
        return [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }, [questions])

    const [answersById, setAnswersById] = useState<AnswersById>(() => {
        const initial: AnswersById = {}
        for (const q of sortedQuestions) {
            switch (q.type) {
                case 'TEXT':
                case 'LONG_TEXT':
                case 'NUMBER_INPUT':
                case 'SINGLE_CHOICE':
                    initial[q.id] = ''
                    break
                case 'NUMBER_SLIDER':
                    initial[q.id] = Math.round((q.min + q.max) / 2)
                    break
                case 'MULTI_CHOICE':
                    initial[q.id] = [] as string[]
                    break
                case 'MOTIVATION_MATRIX_SLIDER':
                    initial[q.id] = {}
                    break
            }
        }
        return initial
    })

    const [errors, setErrors] = useState<ErrorsById>({})
    const [submitting, setSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
    const [submitMsg, setSubmitMsg] = useState<string | null>(null)

    const [currentIndex, setCurrentIndex] = useState(0)

    const requiredQuestions = useMemo(() => sortedQuestions.filter(q => q.required), [sortedQuestions])

    const allRequiredAnswered = useMemo(() => {
        return requiredQuestions.every(q => isAnswered(q, answersById[q.id]))
    }, [answersById, requiredQuestions])

    const answeredCount = useMemo(() => {
        return sortedQuestions.reduce((acc, q) => acc + (isAnswered(q, answersById[q.id]) ? 1 : 0), 0)
    }, [answersById, sortedQuestions])

    const requiredAnsweredCount = useMemo(() => {
        return requiredQuestions.reduce(
            (acc, q) => acc + (isAnswered(q, answersById[q.id]) ? 1 : 0),
            0,
        )
    }, [answersById, requiredQuestions])

    const progressPct = useMemo(() => {
        const total = sortedQuestions.length || 1
        return Math.round((answeredCount / total) * 100)
    }, [answeredCount, sortedQuestions.length])

    const currentQuestion = sortedQuestions[currentIndex]
    const isFirst = currentIndex === 0
    const isLast = currentIndex === sortedQuestions.length - 1

    const showSubmit = allRequiredAnswered

    function setAnswer(questionId: string, value: unknown) {
        setAnswersById(prev => ({ ...prev, [questionId]: value }))

        setErrors(prev => {
            if (!prev[questionId]) return prev
            const copy = { ...prev }
            delete copy[questionId]
            return copy
        })

        setSubmitStatus('idle')
        setSubmitMsg(null)
    }

    function validate(current: AnswersById): ErrorsById {
        const newErrors: ErrorsById = {}

        for (const q of sortedQuestions) {
            const value = current[q.id]

            if (q.required) {
                if (q.type === 'TEXT' || q.type === 'LONG_TEXT' || q.type === 'NUMBER_INPUT') {
                    const str = (value ?? '').toString().trim()
                    if (!str) {
                        newErrors[q.id] = 'This field is required.'
                        continue
                    }
                } else if (q.type === 'NUMBER_SLIDER') {
                    if (value === null || value === undefined || value === '') {
                        newErrors[q.id] = 'This field is required.'
                        continue
                    }
                } else if (q.type === 'SINGLE_CHOICE') {
                    if (!value) {
                        newErrors[q.id] = 'Please choose one option.'
                        continue
                    }
                } else if (q.type === 'MULTI_CHOICE') {
                    const arr = Array.isArray(value) ? value : []
                    if (arr.length === 0) {
                        newErrors[q.id] = 'Please choose at least one option.'
                        continue
                    }
                } else if (q.type === 'MOTIVATION_MATRIX_SLIDER') {
                    const obj = (value ?? {}) as Record<string, number | null>
                    const missing = q.rows.filter(r => typeof obj[r.key] !== 'number')
                    if (missing.length > 0) {
                        newErrors[q.id] = 'Please answer all rows.'
                        continue
                    }
                }
            }

            if (q.type === 'NUMBER_INPUT') {
                const raw = (value ?? '').toString().trim()
                if (raw) {
                    const num = Number(raw)
                    if (Number.isNaN(num)) {
                        newErrors[q.id] = 'Please enter a valid number.'
                        continue
                    }
                    if (q.min != null && num < q.min) {
                        newErrors[q.id] = `Value must be at least ${q.min}.`
                        continue
                    }
                    if (q.max != null && num > q.max) {
                        newErrors[q.id] = `Value must be at most ${q.max}.`
                        continue
                    }
                }
            }

            if (q.type === 'MULTI_CHOICE' && q.maxSelections && Array.isArray(value)) {
                if (value.length > q.maxSelections) {
                    newErrors[q.id] = `You can select up to ${q.maxSelections} options.`
                    continue
                }
            }

            if ((q.type === 'TEXT' || q.type === 'LONG_TEXT') && q.maxLength != null) {
                const str = (value ?? '').toString()
                if (str.length > q.maxLength) {
                    newErrors[q.id] = `Max length is ${q.maxLength} characters.`
                    continue
                }
            }
        }

        return newErrors
    }

    function goToIndexSafe(idx: number) {
        setCurrentIndex(Math.max(0, Math.min(sortedQuestions.length - 1, idx)))
    }

    function handleNext(e?: React.MouseEvent) {
        e?.preventDefault()
        goToIndexSafe(currentIndex + 1)
    }

    function handlePrev(e?: React.MouseEvent) {
        e?.preventDefault()
        goToIndexSafe(currentIndex - 1)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        // 🔒 HARD GUARD: never submit unless we're on the last question AND submission is unlocked
        if (!isLast || !showSubmit) {
            return
        }

        const validationErrors = validate(answersById)
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            const firstBadIndex = sortedQuestions.findIndex(q => validationErrors[q.id])
            if (firstBadIndex >= 0) goToIndexSafe(firstBadIndex)
            setSubmitStatus('error')
            setSubmitMsg('Please fix the highlighted question(s).')
            return
        }

        const answerRows: AnswerRow[] = sortedQuestions.map(q => buildAnswerRow(q, answersById[q.id]))

        try {
            setSubmitting(true)
            setSubmitStatus('idle')
            setSubmitMsg(null)

            await onSubmit({ answers: answerRows })

            setSubmitStatus('success')
            setSubmitMsg('Saved! Your answers have been recorded.')
        } catch (err) {
            console.error('Questionnaire submit failed', err)
            setSubmitStatus('error')
            setSubmitMsg('Submission failed. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    useEffect(() => {
        if (submitStatus !== 'success') return
        const t = window.setTimeout(() => setSubmitMsg(null), 3500)
        return () => window.clearTimeout(t)
    }, [submitStatus])

    useEffect(() => {
        if (currentIndex > sortedQuestions.length - 1) {
            setCurrentIndex(Math.max(0, sortedQuestions.length - 1))
        }
    }, [currentIndex, sortedQuestions.length])

    if (!currentQuestion) return null

    const q = currentQuestion
    const error = errors[q.id]
    const value = answersById[q.id]
    const answered = isAnswered(q, value)

    const selectedArray = q.type === 'MULTI_CHOICE' && Array.isArray(value) ? (value as string[]) : []
    const maxedOut =
        q.type === 'MULTI_CHOICE' && q.maxSelections ? selectedArray.length >= q.maxSelections : false

    return (
        <form onSubmit={handleSubmit} className="flex gap-6">
            <QuestionSideNav
                questions={sortedQuestions}
                currentIndex={currentIndex}
                answersById={answersById}
                errors={errors}
                onJump={goToIndexSafe}
            />

            <div className="min-w-0 flex-1 space-y-10">
                {/* Sticky progress */}
                <div className="sticky top-0 z-10 space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/90 p-4 backdrop-blur">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                                    <Sparkles className="h-4 w-4 text-sky-300" />
                                    Progress
                                </div>
                                <div className="text-xs text-slate-300">
                                    Answered <span className="text-slate-100">{answeredCount}</span> /{' '}
                                    <span className="text-slate-100">{sortedQuestions.length}</span>
                                    {requiredQuestions.length > 0 && (
                                        <>
                                            {' '}
                                            · Required left:{' '}
                                            <span className="text-slate-100">
                        {Math.max(0, requiredQuestions.length - requiredAnsweredCount)}
                      </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="text-xs font-semibold text-sky-200">{progressPct}%</div>
                        </div>

                        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 transition-all"
                                style={{
                                    width: `${(answeredCount / Math.max(1, sortedQuestions.length)) * 100}%`,
                                }}
                            />
                        </div>
                    </div>

                    {!showSubmit && requiredQuestions.length > 0 && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
                            Answer all <span className="font-semibold text-slate-100">required</span> questions to
                            unlock submission.
                        </div>
                    )}


                    {submitMsg && (
                        <div
                            className={cn(
                                'rounded-xl border px-3 py-2 text-xs backdrop-blur',
                                submitStatus === 'success' &&
                                'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
                                submitStatus === 'error' &&
                                'border-rose-500/30 bg-rose-500/10 text-rose-200',
                                submitStatus === 'idle' && 'border-slate-800 bg-slate-950/80 text-slate-200',
                            )}
                        >
                            {submitMsg}
                        </div>
                    )}
                </div>

                {/* Single Question Card */}
                <div
                    className={cn(
                        'group relative overflow-hidden rounded-2xl border bg-slate-950/70 p-5 shadow-sm backdrop-blur transition-all',
                        'hover:-translate-y-0.5 hover:shadow-xl',
                        error
                            ? 'border-rose-500/40 ring-1 ring-rose-500/20'
                            : answered
                                ? 'border-sky-500/35 ring-1 ring-sky-500/10'
                                : 'border-slate-800 hover:border-slate-700',
                    )}
                >
                    <div
                        className={cn(
                            'pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100',
                            'bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10',
                        )}
                    />

                    <div className="relative mb-4 flex items-start gap-3">
                        <div
                            className={cn(
                                'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-1',
                                error
                                    ? 'bg-rose-500/15 text-rose-200 ring-rose-500/25'
                                    : answered
                                        ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/25'
                                        : 'bg-sky-500/15 text-sky-200 ring-sky-500/25',
                            )}
                            aria-hidden="true"
                        >
                            {answered ? <CheckCircle2 className="h-4 w-4" /> : currentIndex + 1}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Label className="text-sm font-semibold text-slate-50">{q.label || q.key}</Label>

                                {q.required && (
                                    <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200">
                    Required
                  </span>
                                )}
                            </div>

                            {q.description && <p className="text-xs leading-relaxed text-slate-300">{q.description}</p>}
                        </div>

                        {error && (
                            <div className="ml-auto mt-0.5 text-rose-300">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                        )}
                    </div>

                    {/* Controls (unchanged UI bits, but ensure buttons are type="button") */}
                    <div className="relative space-y-3">
                        {q.type === 'TEXT' && (
                            <div className="space-y-2">
                                <Input
                                    value={value as string}
                                    onChange={e => setAnswer(q.id, e.target.value)}
                                    className={cn('h-10 text-sm', error && 'border-rose-500/40 focus-visible:ring-rose-500/20')}
                                    placeholder="Type your answer…"
                                    maxLength={q.maxLength}
                                />
                            </div>
                        )}

                        {q.type === 'LONG_TEXT' && (
                            <div className="space-y-2">
                <textarea
                    value={value as string}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    className={cn(
                        'min-h-[110px] w-full rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-100 outline-none',
                        'focus-visible:ring-2 focus-visible:ring-sky-500/20',
                        error && 'border-rose-500/40 focus-visible:ring-rose-500/20',
                    )}
                    placeholder="Type your answer…"
                    maxLength={q.maxLength}
                />
                            </div>
                        )}

                        {q.type === 'NUMBER_INPUT' && (
                            <Input
                                type="number"
                                value={value as string}
                                onChange={e => setAnswer(q.id, e.target.value)}
                                className={cn('h-10 text-sm', error && 'border-rose-500/40 focus-visible:ring-rose-500/20')}
                                placeholder="Enter a number…"
                            />
                        )}

                        {q.type === 'NUMBER_SLIDER' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-[11px] text-slate-400">
                                    <span>{q.min}</span>
                                    <span>{q.max}</span>
                                </div>
                                <input
                                    type="range"
                                    min={q.min}
                                    max={q.max}
                                    step={q.step}
                                    value={value as number}
                                    onChange={e => setAnswer(q.id, Number(e.target.value))}
                                    className={cn('w-full accent-sky-500', error && 'accent-rose-500')}
                                />
                            </div>
                        )}

                        {q.type === 'SINGLE_CHOICE' && (
                            <div className="grid gap-2">
                                {q.options.map(opt => {
                                    const selected = value === opt.id
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => setAnswer(q.id, opt.id)}
                                            className={cn(
                                                'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition',
                                                'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30',
                                                selected
                                                    ? 'border-sky-500/40 bg-sky-500/10'
                                                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60',
                                            )}
                                        >
                                            <span className="text-slate-100">{opt.label}</span>
                                            <span
                                                className={cn(
                                                    'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold',
                                                    selected
                                                        ? 'border-sky-400/50 bg-sky-400/15 text-sky-100'
                                                        : 'border-slate-700 bg-slate-950 text-slate-400',
                                                )}
                                            >
                        {selected ? '✓' : ''}
                      </span>
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {q.type === 'MULTI_CHOICE' && (
                            <div className="space-y-2">
                                <div className="grid gap-2">
                                    {q.options.map(opt => {
                                        const checked = selectedArray.includes(opt.id)
                                        const disabled = !checked && maxedOut

                                        return (
                                            <button
                                                key={opt.id}
                                                type="button"
                                                onClick={() => {
                                                    if (disabled) return
                                                    const next = checked ? selectedArray.filter(v => v !== opt.id) : [...selectedArray, opt.id]
                                                    setAnswer(q.id, next)
                                                }}
                                                className={cn(
                                                    'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition',
                                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30',
                                                    checked
                                                        ? 'border-sky-500/40 bg-sky-500/10'
                                                        : disabled
                                                            ? 'cursor-not-allowed border-slate-800 bg-slate-950/40 opacity-60'
                                                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60',
                                                )}
                                            >
                                                <span className="text-slate-100">{opt.label}</span>
                                                <span
                                                    className={cn(
                                                        'flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-bold',
                                                        checked
                                                            ? 'border-sky-400/50 bg-sky-400/15 text-sky-100'
                                                            : 'border-slate-700 bg-slate-950 text-slate-400',
                                                    )}
                                                >
                          {checked ? '✓' : ''}
                        </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {q.type === 'MOTIVATION_MATRIX_SLIDER' &&
                            (() => {
                                const map = (value ?? {}) as Record<string, number | null>
                                const missingCount = q.rows.filter(r => typeof map[r.key] !== 'number').length

                                return (
                                    <div className="space-y-4">
                                        {missingCount > 0 && (
                                            <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-[11px] text-amber-100">
                                                Move each slider to confirm your answer. <span className="font-semibold">{missingCount}</span>{' '}
                                                remaining.
                                            </div>
                                        )}

                                        {q.rows.map(row => {
                                            const current = map[row.key]
                                            const displayValue =
                                                typeof current === 'number' ? current : Math.round((q.min + q.max) / 2)

                                            return (
                                                <div
                                                    key={row.key}
                                                    className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/30 p-3"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="text-xs font-medium text-slate-100">{row.label}</div>
                                                        <div className="shrink-0 rounded-full border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px] text-slate-200">
                                                            {typeof current === 'number' ? current : 'Required'}
                                                        </div>
                                                    </div>

                                                    <input
                                                        type="range"
                                                        min={q.min}
                                                        max={q.max}
                                                        step={q.step}
                                                        value={displayValue}
                                                        onChange={e =>
                                                            setAnswer(q.id, {
                                                                ...map,
                                                                [row.key]: Number(e.target.value),
                                                            })
                                                        }
                                                        className={cn('w-full accent-sky-500', error && 'accent-rose-500')}
                                                    />

                                                    <div className="flex justify-between text-[10px] text-slate-500">
                                                        {Array.from({ length: (q.max - q.min) / q.step + 1 }).map((_, i) => {
                                                            const v = q.min + i * q.step
                                                            if (v === q.min) return <span key={v}>{q.leftLabel ?? v}</span>
                                                            if (v === q.max) return <span key={v}>{q.rightLabel ?? v}</span>
                                                            return <span key={v}>{v}</span>
                                                        })}
                                                    </div>

                                                    {q.nullAllowed && (
                                                        <div className="flex justify-end">
                                                            <button
                                                                type="button"
                                                                className="text-[11px] text-slate-400 hover:text-slate-200"
                                                                onClick={() => setAnswer(q.id, { ...map, [row.key]: null })}
                                                            >
                                                                Clear
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })()}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between">
                    <Button key="prev" type="button" variant="outline" disabled={isFirst} onClick={handlePrev}>
                        Previous
                    </Button>

                    {!isLast ? (
                        <Button key="next" type="button" onClick={handleNext}>
                            Next
                        </Button>
                    ) : showSubmit ? (
                        <Button key="submit" type="submit" disabled={submitting}>
                            {submitting ? 'Submitting…' : 'Submit questionnaire'}
                        </Button>
                    ) : (
                        <Button key="locked" type="button" disabled className="cursor-not-allowed">
                            Answer required questions to submit
                        </Button>
                    )}
                </div>
            </div>
        </form>
    )
}
