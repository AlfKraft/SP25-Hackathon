// src/pages/HackathonQuestionnairePage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { API_URL } from '@/lib/config'
import type { Question } from '@/types/questionnaire'
import { type AnswerRow, QuestionnaireAnswerForm } from '@/components/questionnaire/QuestionnaireAnswerForm'
import { Button } from '@/components/ui/button'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export default function HackathonQuestionnairePage() {
    const params = useParams()
    const hackathonId = useMemo(() => {
        const raw = params.hackathonId
        const n = raw ? Number(raw) : NaN
        return Number.isFinite(n) ? n : null
    }, [params.hackathonId])

    const [state, setState] = useState<LoadState>('idle')
    const [questions, setQuestions] = useState<Question[]>([])
    const [loadError, setLoadError] = useState<string | null>(null)
    const [submitError, setSubmitError] = useState<string | null>(null)

    // ✅ NEW
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        if (!hackathonId) {
            setState('error')
            setLoadError('Invalid hackathon id in URL.')
            return
        }

        let cancelled = false

        async function load() {
            setState('loading')
            setLoadError(null)

            try {
                const res = await fetch(`${API_URL}/api/hackathons/${hackathonId}/questionnaire`, {
                    method: 'GET',
                    credentials: 'include',
                })

                if (!res.ok) {
                    const text = await res.text().catch(() => '')
                    throw new Error(text || `Failed to load questionnaire (status ${res.status})`)
                }

                const data = await res.json()
                const qs: Question[] = Array.isArray(data) ? data : (data?.questions ?? [])

                if (!cancelled) {
                    setQuestions(qs)
                    setState('ready')
                }
            } catch (e: any) {
                if (!cancelled) {
                    setState('error')
                    setLoadError(e?.message ?? 'Failed to load questionnaire.')
                }
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [hackathonId])

    async function handleSubmit({ answers }: { answers: AnswerRow[] }) {
        if (!hackathonId) return
        setSubmitError(null)

        try {
            const res = await fetch(`${API_URL}/api/hackathons/${hackathonId}/questionnaire/submit`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers }),
            })

            if (!res.ok) {
                const text = await res.text().catch(() => '')
                throw new Error(text || `Submit failed (status ${res.status})`)
            }

            // ✅ NEW: hide everything else after success
            setSubmitted(true)
        } catch (e: any) {
            setSubmitError(e?.message ?? 'Failed to submit questionnaire.')
            throw e // keep form's internal error handling working
        }
    }

    if (state === 'loading' || state === 'idle') {
        return (
            <div className="mx-auto max-w-2xl space-y-3">
                <h1 className="text-lg font-semibold text-slate-50">Hackathon questionnaire</h1>
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                    Loading questionnaire…
                </div>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div className="mx-auto max-w-2xl space-y-3">
                <h1 className="text-lg font-semibold text-slate-50">Hackathon questionnaire</h1>
                <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-4 text-sm text-rose-200">
                    {loadError ?? 'Something went wrong.'}
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/">Back to hackathons</Link>
                    </Button>
                </div>
            </div>
        )
    }

    // ✅ NEW: after successful submit, show ONLY the green card
    if (submitted) {
        return (
            <div className="mx-auto max-w-2xl">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-100">
                    <div className="text-sm font-semibold">Submitted ✅</div>
                    <p className="mt-1 text-sm text-emerald-100/90">
                        Your questionnaire answers have been submitted. If you want to change your answers,
                        please fill the form again with the same email and submit one more time.
                    </p>
                </div>
            </div>
        )
    }

    // ready (normal form view)
    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-lg font-semibold text-slate-50">Hackathon questionnaire</h1>
                    <p className="text-xs text-slate-300">
                        Please answer the questions below. Required fields must be filled in.
                    </p>
                </div>

                <Button asChild variant="outline" size="sm" className="shrink-0">
                    <Link to="/">Back</Link>
                </Button>
            </div>

            {questions.length === 0 ? (
                <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                    No questionnaire has been published for this hackathon.
                </div>
            ) : (
                <>
                    <QuestionnaireAnswerForm questions={questions} onSubmit={handleSubmit} />

                    {submitError && (
                        <div className="rounded-lg border border-rose-500/20 bg-rose-950/20 p-3 text-xs text-rose-200">
                            {submitError}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
