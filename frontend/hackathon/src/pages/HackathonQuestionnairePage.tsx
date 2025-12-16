import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate  } from 'react-router-dom'
import { API_URL } from '@/lib/config'
import type { Question } from '@/types/questionnaire'
import { type AnswerRow, QuestionnaireAnswerForm } from '@/components/questionnaire/QuestionnaireAnswerForm'
import { Button } from '@/components/ui/button'
import { IntroCard } from '@/components/questionnaire/IntroCard'
import { ConsentCard, type ConsentValue } from '@/components/questionnaire/ConsentCard'
import {readApiError} from "@/types/apiError.ts";
import {ErrorAlert} from "@/components/common/ErrorAlert.tsx";

type LoadState = 'idle' | 'loading' | 'ready' | 'error'
type Step = 1 | 2 | 3

export default function HackathonQuestionnairePage() {
    const navigate = useNavigate()
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

    const [submitted, setSubmitted] = useState(false)

    // ✅ NEW stepper state
    const [step, setStep] = useState<Step>(1)
    const [consent, setConsent] = useState<ConsentValue | null>(null)

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
                    throw new Error(await readApiError(res))
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

    const handleBack = () => {
        // If user is in the internal flow, go back within the flow
        if (!submitted && state === 'ready') {
            if (step === 3) return setStep(2)
            if (step === 2) return setStep(1)
        }

        // Otherwise go back to previous page if possible
        if (window.history.length > 1) {
            navigate(-1)
        } else {
            navigate('/') // fallback (hackathons list)
        }
    }

    async function handleSubmit({ answers }: { answers: AnswerRow[] }) {
        if (!hackathonId) return
        setSubmitError(null)

        try {
            const res = await fetch(`${API_URL}/api/hackathons/${hackathonId}/questionnaire/submit`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers,
                    // Optional: include consent in payload if your backend wants it
                    consent: consent === 'YES' ? true : consent === 'NO' ? false : undefined
                }),
            })

            if (!res.ok) {
                throw new Error(await readApiError(res))
            }

            setSubmitted(true)
        } catch (e: any) {
            setSubmitError(e?.message ?? 'Failed to submit questionnaire.')
            throw e
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
                {loadError && <ErrorAlert message={loadError} />}
                <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link to="/">Back to hackathons</Link>
                    </Button>
                </div>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="mx-auto max-w-2xl">
                <div className="flex items-start justify-between gap-3 mb-4 md:mb-6">
                    <div className="space-y-1">
                        <h1 className="text-lg font-semibold text-slate-50">Hackathon questionnaire</h1>
                    </div>

                    <Button variant="outline" size="sm" className="shrink-0" onClick={handleBack}>
                        Back
                    </Button>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-emerald-100">
                    <div className="text-sm font-semibold">Submitted ✅</div>
                    <p className="mt-1 text-sm text-emerald-100/90">
                        Your questionnaire answers have been submitted. If you want to change your answers, please fill
                        the form again with the same email and submit one more time.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="text-lg font-semibold text-slate-50">Hackathon questionnaire</h1>
                    <p className="text-xs text-slate-300">Please answer the questions below. Required fields must be filled in.</p>
                </div>

                <Button variant="outline" size="sm" className="shrink-0" onClick={handleBack}>
                    Back
                </Button>
            </div>

            {/* STEP 1: FULL intro + Agree */}
            {step === 1 && (
                <IntroCard onAgree={() => setStep(2)} />
            )}

            {/* STEP 2: Consent Yes/No + Prev/Next */}
            {step === 2 && (
                <ConsentCard
                    value={consent}
                    onChange={setConsent}
                    onPrev={() => setStep(1)}
                    onNext={() => setStep(3)}
                />
            )}

            {/* STEP 3: Questionnaire */}
            {step === 3 && (
                <>
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

                            {/* Optional: allow going back to consent from step 3 */}
                            <div className="flex justify-start">
                                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                                    Previous
                                </Button>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
}
