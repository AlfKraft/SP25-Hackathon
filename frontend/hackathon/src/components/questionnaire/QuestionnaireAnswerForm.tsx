import React, { useEffect, useMemo, useRef, useState } from 'react'
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
    valueText?: string | null
    valueNumber?: number | null
    valueOptionId?: string | null
    valueOptionIds?: string[] | null
}

type AnswersById = Record<string, unknown> // questionId -> raw value
type ErrorsById = Record<string, string> // questionId -> error message

interface Props {
    questions: Question[]
    onSubmit: (payload: { answers: AnswerRow[] }) => Promise<void> | void
}

type SubmitStatus = 'idle' | 'success' | 'error'

function isAnswered(q: Question, v: unknown): boolean {
    if (q.type === 'MULTI_CHOICE') return Array.isArray(v) && v.length > 0
    if (q.type === 'NUMBER_SLIDER') return v !== null && v !== undefined && v !== ''
    return v !== null && v !== undefined && String(v).trim() !== ''
}

function buildAnswerRow(q: Question, raw: unknown): AnswerRow {
    const base: AnswerRow = { questionId: q.id, type: q.type }

    switch (q.type) {
        case 'TEXT':
            return { ...base, valueText: (raw ?? '').toString() }

        case 'NUMBER_INPUT': {
            const s = (raw ?? '').toString().trim()
            return { ...base, valueNumber: s ? Number(s) : null }
        }

        case 'NUMBER_SLIDER': {
            const n = typeof raw === 'number' ? raw : Number(raw)
            return { ...base, valueNumber: Number.isFinite(n) ? n : null }
        }

        case 'SINGLE_CHOICE':
            return { ...base, valueOptionId: raw ? String(raw) : null }

        case 'MULTI_CHOICE':
            return { ...base, valueOptionIds: Array.isArray(raw) ? (raw as string[]) : [] }

        default:
            return base
    }
}

export function QuestionnaireAnswerForm({ questions, onSubmit }: Props) {
    const sortedQuestions = useMemo(() => {
        return [...questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }, [questions])

    // key everything by UUID string
    const [answersById, setAnswersById] = useState<AnswersById>(() => {
        const initial: AnswersById = {}
        for (const q of sortedQuestions) {
            switch (q.type) {
                case 'TEXT':
                    initial[q.id] = ''
                    break
                case 'NUMBER_INPUT':
                    initial[q.id] = '' // string while typing
                    break
                case 'NUMBER_SLIDER':
                    initial[q.id] = Math.round((q.min + q.max) / 2)
                    break
                case 'SINGLE_CHOICE':
                    initial[q.id] = ''
                    break
                case 'MULTI_CHOICE':
                    initial[q.id] = [] as string[]
                    break
            }
        }
        return initial
    })

    const questionRefs = useRef<Record<string, HTMLDivElement | null>>({})

    const [errors, setErrors] = useState<ErrorsById>({})
    const [submitting, setSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
    const [submitMsg, setSubmitMsg] = useState<string | null>(null)

    const requiredQuestions = useMemo(
        () => sortedQuestions.filter(q => q.required),
        [sortedQuestions]
    )

    const answeredCount = useMemo(() => {
        return sortedQuestions.reduce((acc, q) => {
            return acc + (isAnswered(q, answersById[q.id]) ? 1 : 0)
        }, 0)
    }, [answersById, sortedQuestions])

    const requiredAnsweredCount = useMemo(() => {
        return requiredQuestions.reduce((acc, q) => {
            return acc + (isAnswered(q, answersById[q.id]) ? 1 : 0)
        }, 0)
    }, [answersById, requiredQuestions])

    const progressPct = useMemo(() => {
        const total = sortedQuestions.length || 1
        return Math.round((answeredCount / total) * 100)
    }, [answeredCount, sortedQuestions.length])

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

            // required
            if (q.required) {
                if (q.type === 'TEXT' || q.type === 'NUMBER_INPUT') {
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
                }
            }

            // number constraints
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

            // multi max
            if (q.type === 'MULTI_CHOICE' && q.maxSelections && Array.isArray(value)) {
                if (value.length > q.maxSelections) {
                    newErrors[q.id] = `You can select up to ${q.maxSelections} options.`
                    continue
                }
            }

            // text max length
            if (q.type === 'TEXT' && q.maxLength != null) {
                const str = (value ?? '').toString()
                if (str.length > q.maxLength) {
                    newErrors[q.id] = `Max length is ${q.maxLength} characters.`
                    continue
                }
            }
        }

        return newErrors
    }

    function scrollToQuestion(questionId: string) {
        const el = questionRefs.current[questionId]
        if (!el) return
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const focusable =
            el.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>(
                'input, textarea, button'
            )
        focusable?.focus?.()
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitStatus('idle')
        setSubmitMsg(null)

        const validationErrors = validate(answersById)
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            const firstQ = sortedQuestions.find(q => validationErrors[q.id])
            if (firstQ) scrollToQuestion(firstQ.id)
            setSubmitStatus('error')
            setSubmitMsg('Please fix the highlighted questions.')
            return
        }

        const answerRows: AnswerRow[] = sortedQuestions.map(q =>
            buildAnswerRow(q, answersById[q.id])
        )

        try {
            setSubmitting(true)
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

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
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

                {submitMsg && (
                    <div
                        className={cn(
                            'rounded-xl border px-3 py-2 text-xs backdrop-blur',
                            submitStatus === 'success' &&
                            'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
                            submitStatus === 'error' &&
                            'border-rose-500/30 bg-rose-500/10 text-rose-200',
                            submitStatus === 'idle' && 'border-slate-800 bg-slate-950/80 text-slate-200'
                        )}
                    >
                        {submitMsg}
                    </div>
                )}
            </div>

            {/* Questions */}
            <div className="space-y-6">
                {sortedQuestions.map((q, index) => {
                    const error = errors[q.id]
                    const value = answersById[q.id]
                    const answered = isAnswered(q, value)

                    const selectedArray =
                        q.type === 'MULTI_CHOICE' && Array.isArray(value) ? (value as string[]) : []
                    const maxedOut =
                        q.type === 'MULTI_CHOICE' && q.maxSelections
                            ? selectedArray.length >= q.maxSelections
                            : false

                    return (
                        <div
                            key={q.id}
                            ref={el => {
                                questionRefs.current[q.id] = el
                            }}
                            className={cn(
                                'group relative overflow-hidden rounded-2xl border bg-slate-950/70 p-5 shadow-sm backdrop-blur transition-all',
                                'hover:-translate-y-0.5 hover:shadow-xl',
                                error
                                    ? 'border-rose-500/40 ring-1 ring-rose-500/20'
                                    : answered
                                        ? 'border-sky-500/35 ring-1 ring-sky-500/10'
                                        : 'border-slate-800 hover:border-slate-700'
                            )}
                        >
                            <div
                                className={cn(
                                    'pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100',
                                    'bg-gradient-to-br from-sky-500/10 via-transparent to-indigo-500/10'
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
                                                : 'bg-sky-500/15 text-sky-200 ring-sky-500/25'
                                    )}
                                    aria-hidden="true"
                                    title={`Question UUID: ${q.id}`}
                                >
                                    {answered ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                                </div>

                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Label className="text-sm font-semibold text-slate-50">
                                            {q.label || q.key}
                                        </Label>

                                        <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      UUID
                    </span>

                                        {q.required && (
                                            <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200">
                        Required
                      </span>
                                        )}

                                        {answered && !error && (
                                            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                        Answered
                      </span>
                                        )}
                                    </div>

                                    {q.description && (
                                        <p className="text-xs leading-relaxed text-slate-300">{q.description}</p>
                                    )}
                                </div>

                                {error && (
                                    <div className="ml-auto mt-0.5 text-rose-300">
                                        <AlertTriangle className="h-4 w-4" />
                                    </div>
                                )}
                            </div>

                            {/* Controls */}
                            <div className="relative space-y-3">
                                {q.type === 'TEXT' && (
                                    <div className="space-y-2">
                                        <Input
                                            value={value as string}
                                            onChange={e => setAnswer(q.id, e.target.value)}
                                            className={cn(
                                                'h-10 text-sm',
                                                error && 'border-rose-500/40 focus-visible:ring-rose-500/20'
                                            )}
                                            placeholder="Type your answer…"
                                            maxLength={q.maxLength}
                                        />
                                        {q.maxLength != null && (
                                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          {String(value ?? '').length} / {q.maxLength}
                        </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {q.type === 'NUMBER_INPUT' && (
                                    <Input
                                        type="number"
                                        value={value as string}
                                        onChange={e => setAnswer(q.id, e.target.value)}
                                        className={cn(
                                            'h-10 text-sm',
                                            error && 'border-rose-500/40 focus-visible:ring-rose-500/20'
                                        )}
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
                                        {q.showValue && (
                                            <div className="flex justify-end">
                        <span className="rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs text-slate-100">
                          Current: <span className="font-semibold">{value as number}</span>
                        </span>
                                            </div>
                                        )}
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
                                                            : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                                                    )}
                                                >
                                                    <span className="text-slate-100">{opt.label}</span>
                                                    <span
                                                        className={cn(
                                                            'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold',
                                                            selected
                                                                ? 'border-sky-400/50 bg-sky-400/15 text-sky-100'
                                                                : 'border-slate-700 bg-slate-950 text-slate-400'
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
                                                            const next = checked
                                                                ? selectedArray.filter(v => v !== opt.id)
                                                                : [...selectedArray, opt.id]
                                                            setAnswer(q.id, next)
                                                        }}
                                                        className={cn(
                                                            'flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm transition',
                                                            'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30',
                                                            checked
                                                                ? 'border-sky-500/40 bg-sky-500/10'
                                                                : disabled
                                                                    ? 'cursor-not-allowed border-slate-800 bg-slate-950/40 opacity-60'
                                                                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                                                        )}
                                                    >
                                                        <span className="text-slate-100">{opt.label}</span>
                                                        <span
                                                            className={cn(
                                                                'flex h-5 w-5 items-center justify-center rounded-md border text-[10px] font-bold',
                                                                checked
                                                                    ? 'border-sky-400/50 bg-sky-400/15 text-sky-100'
                                                                    : 'border-slate-700 bg-slate-950 text-slate-400'
                                                            )}
                                                        >
                              {checked ? '✓' : ''}
                            </span>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {q.maxSelections && (
                                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>
                          Selected {selectedArray.length} / {q.maxSelections}
                        </span>
                                                {maxedOut && (
                                                    <span className="text-amber-300">
                            Max reached, unselect to choose others.
                          </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div
                                className={cn(
                                    'mt-3 overflow-hidden rounded-xl border px-3 py-2 text-xs transition-all',
                                    error
                                        ? 'max-h-20 border-rose-500/20 bg-rose-500/10 text-rose-200 opacity-100'
                                        : 'max-h-0 border-transparent bg-transparent p-0 opacity-0'
                                )}
                                aria-live="polite"
                            >
                                {error}
                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-slate-400">
                    Matching uses <span className="text-slate-200">questionId (UUID)</span>.
                </div>

                <Button type="submit" size="sm" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit questionnaire'}
                </Button>
            </div>
        </form>
    )
}
