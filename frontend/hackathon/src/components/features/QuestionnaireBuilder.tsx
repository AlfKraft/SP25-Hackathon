// src/components/features/QuestionnaireBuilder.tsx
import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Edit3, List, ListChecks, SlidersHorizontal, Type } from 'lucide-react'
import { API_URL } from '@/lib/config'
import type {
    Question,
    QuestionKind,
    SingleChoiceQuestion,
    MultiChoiceQuestion,
    TextQuestion,
} from '@/types/questionnaire'
import { QuestionCardShell } from '@/components/questionnaire/QuestionCardShell'
import { TextQuestionEditor } from '@/components/questionnaire/TextQuestionEditor'
import { LongTextQuestionEditor } from "@/components/questionnaire/LongTextQuestionEditor";
import { SliderQuestionEditor } from '@/components/questionnaire/SliderQuestionEditor'
import { ChoiceQuestionEditor } from '@/components/questionnaire/ChoiceQuestionEditor'
import { NumberInputQuestionEditor } from '@/components/questionnaire/NumberInputQuestionEditor'
import { FloatingAddBar } from '@/components/questionnaire/FloatingAddBar'
import type {QuestionnaireStatus} from "@/pages/HackathonQuestionnaireAdminPage.tsx";

interface QuestionnaireMeta {
    id: number
    hackathonId: number
    title: string
    description: string
    sourceType: 'INTERNAL' | 'EXTERNAL_UPLOAD'
    isLocked: boolean
    questions?: Question[]
    status?: QuestionnaireStatus
}

interface Props {
    hackathonId: number
    meta: QuestionnaireMeta | null
    requiredFields: string[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function createId() {
    return crypto.randomUUID()
}

function createQuestion(kind: QuestionKind, index: number): Question {
    const base = {
        id: createId(),
        key: `q_${index + 1}`,
        label:
            kind === 'TEXT'
                ? 'Short text answer'
                    : kind === 'LONG_TEXT' ?
                        'Long text answer'
                            : kind === 'NUMBER_SLIDER'
                                ? 'Range from x to y'
                                : kind === 'NUMBER_INPUT'
                                    ? 'Numeric answer'
                                    : kind === 'SINGLE_CHOICE'
                                        ? 'Choose one option'
                                        : 'Choose one or more options',
        type: kind,
        required: false,
        description: '',
        systemRequired: false,
        order: index + 1,
    } as const

    switch (kind) {
        case 'TEXT':
            return { ...base, type: 'TEXT', maxLength: 255 }
        case 'LONG_TEXT':
            return { ...base, type: 'LONG_TEXT', maxLength: 500 }
        case 'NUMBER_SLIDER':
            return { ...base, type: 'NUMBER_SLIDER', min: 1, max: 10, step: 1, showValue: true }
        case 'NUMBER_INPUT':
            return { ...base, type: 'NUMBER_INPUT', min: 0, max: 120, step: 1 }
        case 'SINGLE_CHOICE':
            return {
                ...base,
                type: 'SINGLE_CHOICE',
                randomizeOptions: false,
                options: [
                    { id: createId(), label: 'Option 1' },
                    { id: createId(), label: 'Option 2' },
                ],
            } satisfies SingleChoiceQuestion
        case 'MULTI_CHOICE':
            return {
                ...base,
                type: 'MULTI_CHOICE',
                randomizeOptions: false,
                maxSelections: undefined,
                options: [
                    { id: createId(), label: 'Option 1' },
                    { id: createId(), label: 'Option 2' },
                ],
            } satisfies MultiChoiceQuestion
    }
}

function prettifyKey(key: string): string {
    // e.g. "first_name" -> "First name"
    const withSpaces = key.replace(/[_\-]+/g, ' ')
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export default function QuestionnaireBuilder({ hackathonId, meta, requiredFields }: Props) {
    const isImported = meta?.sourceType === 'EXTERNAL_UPLOAD'
    const isPublished = meta?.status === 'PUBLISHED'
    const isLocked = isImported || isPublished
    // Default: build required core fields + age verification question
    const [questions, setQuestions] = useState<Question[]>(() => {
        const coreQuestions = requiredFields.map((key, index) => {
            if (key === 'education') {
                return {
                    id: createId(),
                    key: 'education',
                    label: 'What is the highest level of formal education that you have completed until now?',
                    type: 'SINGLE_CHOICE',
                    required: true,
                    description: 'Choose one of the following answers',
                    systemRequired: true,
                    order: index + 1,
                    randomizeOptions: false,
                    options: [
                        { id: createId(), label: 'High school diploma' },
                        { id: createId(), label: 'Bachelor degree' },
                        { id: createId(), label: 'Master degree' },
                        { id: createId(), label: 'Doctorate' },
                        { id: createId(), label: 'Prefer not to say' },
                        { id: createId(), label: 'Other' },
                    ],
                } satisfies SingleChoiceQuestion
            }

            if (key === 'employment') {
                return {
                    id: createId(),
                    key: 'employment',
                    label: 'What is your current employment?',
                    type: 'SINGLE_CHOICE',
                    required: true,
                    description: 'Choose one of the following answers',
                    systemRequired: true,
                    order: index + 1,
                    randomizeOptions: false,
                    options: [
                        { id: createId(), label: 'Self-employed' },
                        { id: createId(), label: 'Employee at a company' },
                        { id: createId(), label: 'Unemployed' },
                        { id: createId(), label: 'Prefer not to say' },
                        { id: createId(), label: 'Other' },
                    ],
                } satisfies SingleChoiceQuestion
            }

            if (key === 'team_name') {
                return {
                    id: createId(),
                    key: 'team_name',
                    label: 'If you are already part of a team, please write the name of your team below.',
                    type: 'TEXT',
                    required: true,
                    description: 'Please make sure you and your team members use the same team name.',
                    systemRequired: true,
                    order: index + 1,
                    maxLength: 255,
                } satisfies TextQuestion
            }

            const numericKeys = new Set(['age', 'years_experience'])
            const kind: QuestionKind = numericKeys.has(key) ? 'NUMBER_INPUT' :  key === 'motivation' ? 'NUMBER_SLIDER' : 'TEXT'

            const base = createQuestion(kind, index)

            return {
                ...base,
                key,
                label: prettifyKey(key),
                required: true,
                systemRequired: true,
            }
        })

        const ageVerificationQuestion: SingleChoiceQuestion = {
            id: createId(),
            key: 'age_verification',
            label: 'Are you 18 years of age or older?',
            type: 'SINGLE_CHOICE',
            required: true,
            description: 'I am age 18 or older, I have read and understood the previous information and I wish to continue with the hackathon registration. Please only answer "yes" if you agree to all of the aforementioned purpose and use of your data. Answering "no" will still allow you to register for the hackathon, but we will not process your data to support team formation before the hackathon, nor to support entrepreneurial intention.',
            systemRequired: true,
            order: coreQuestions.length + 1,
            randomizeOptions: false,
            options: [
                { id: createId(), label: 'Yes, I am 18 or older' },
                { id: createId(), label: 'No, I am under 18' },
            ],
        }

        return [...coreQuestions, ageVerificationQuestion]
    })

    const [initializedFromMeta, setInitializedFromMeta] = useState(false)
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // 🔄 Hydrate from existing WEB questionnaire once meta arrives
    useEffect(() => {
        if (initializedFromMeta) return

        // meta === null → 404 case → no questionnaire yet; keep defaults
        if (!meta) {
            setInitializedFromMeta(true)
            return
        }

        if (meta.sourceType === 'INTERNAL' && Array.isArray(meta.questions) && meta.questions.length > 0) {
            setQuestions(meta.questions)
        }

        // For IMPORT we don't care; builder is locked anyway
        setInitializedFromMeta(true)
    }, [meta, initializedFromMeta])

    if (isLocked) {
        return (
            <Card className="border border-amber-500/30 bg-amber-950/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-amber-50">
                        <AlertCircle className="h-4 w-4" />
                        Questionnaire locked
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-100/90 space-y-2">
                    {isImported && (
                        <>
                            <p>
                                This hackathon uses an imported questionnaire. Its structure is locked and
                                cannot be edited in the web builder.
                            </p>
                            <p>
                                To change it, re-import a new file in the <strong>Import file</strong> tab.
                            </p>
                        </>
                    )}

                    {isPublished && (
                        <p>
                            This questionnaire has been <strong>published</strong>. Editing is disabled to
                            preserve data integrity.
                        </p>
                    )}
                </CardContent>
            </Card>
        )
    }

    const addQuestion = (kind: QuestionKind) => {
        setQuestions(prev => [...prev, createQuestion(kind, prev.length)])
    }

    const updateQuestion = (id: string, updated: Question) => {
        setQuestions(prev => prev.map(q => (q.id === id ? updated : q)))
    }

    const moveQuestion = (id: string, dir: 'up' | 'down') => {
        setQuestions(prev => {
            const idx = prev.findIndex(q => q.id === id)
            if (idx === -1) return prev
            const target = dir === 'up' ? idx - 1 : idx + 1
            if (target < 0 || target >= prev.length) return prev

            const copy = [...prev]
            const [item] = copy.splice(idx, 1)
            copy.splice(target, 0, item)

            return copy.map((q, i) => ({ ...q, order: i + 1 }))
        })
    }

    const removeQuestion = (id: string) => {
        setQuestions(prev => prev.filter(q => q.id !== id))
    }

    const hasRequiredFieldWarnings =
        requiredFields.length > 0 &&
        !requiredFields.every(reqKey => questions.some(q => q.key === reqKey && q.required))

        console.log(questions)
    const handleSave = async () => {
        setSaveStatus('saving')
        setErrorMsg(null)
        try {
            const res = await fetch(
                `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/internal`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questions }),
                },
            )
            if (!res.ok) throw new Error(`Status ${res.status}`)
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
        } catch (err: any) {
            setSaveStatus('error')
            setErrorMsg(err?.message ?? 'Unknown error')
        }
    }

    return (
        <>
            <Card className="border border-sky-500/20 bg-slate-900/70">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2 text-sky-50">
                        <Edit3 className="h-5 w-5" />
                        Web questionnaire builder
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => addQuestion('TEXT')}>
                            <Type className="mr-1 h-4 w-4" />
                            Text field
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addQuestion('LONG_TEXT')}>
                            <Type className="mr-1 h-4 w-4" />
                            Long text field
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addQuestion('NUMBER_INPUT')}>
                            <SlidersHorizontal className="mr-1 h-4 w-4" />
                            Numeric field
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addQuestion('NUMBER_SLIDER')}>
                            <SlidersHorizontal className="mr-1 h-4 w-4" />
                            Numeric slider
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addQuestion('SINGLE_CHOICE')}>
                            <List className="mr-1 h-4 w-4" />
                            One choice
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => addQuestion('MULTI_CHOICE')}>
                            <ListChecks className="mr-1 h-4 w-4" />
                            Multiple choice
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 text-sm text-sky-100/85">
                    {/* Required fields info */}
                    <div className="rounded-lg border border-sky-500/30 bg-slate-900/80 p-3 text-xs">
                        <p className="mb-2 text-sky-200/80">
                            These keys must exist and be marked as required:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {requiredFields.map(f => (
                                <span
                                    key={f}
                                    className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono"
                                >
                  {f}
                </span>
                            ))}
                        </div>
                        {hasRequiredFieldWarnings && (
                            <p className="mt-2 flex items-center gap-1 text-amber-300">
                                <AlertCircle className="h-3 w-3" />
                                Not all required fields are present and marked as required yet.
                            </p>
                        )}
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        {questions.length === 0 && (
                            <p className="text-xs text-sky-200/70">
                                No questions yet. Use the buttons above to add a block.
                            </p>
                        )}

                        {questions.map((q, idx) => (
                            <QuestionCardShell
                                key={q.id}
                                question={q}
                                index={idx}
                                total={questions.length}
                                onChange={updated => updateQuestion(q.id, updated)}
                                onMoveUp={() => moveQuestion(q.id, 'up')}
                                onMoveDown={() => moveQuestion(q.id, 'down')}
                                onDelete={() => removeQuestion(q.id)}
                            >
                                {q.type === 'TEXT' && (
                                    <TextQuestionEditor
                                        question={q}
                                        onChange={updated => updateQuestion(q.id, updated)}
                                    />
                                )}
                                {q.type === 'LONG_TEXT' && (
                                    <LongTextQuestionEditor
                                        question={q}
                                        onChange={updated => updateQuestion(q.id, updated)}
                                        />
                                )}
                                {q.type === 'NUMBER_SLIDER' && (
                                    <SliderQuestionEditor
                                        question={q}
                                        onChange={updated => updateQuestion(q.id, updated)}
                                    />
                                )}
                                {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') && (
                                    <ChoiceQuestionEditor
                                        question={q}
                                        onChange={updated =>
                                            updateQuestion(
                                                q.id,
                                                updated as SingleChoiceQuestion | MultiChoiceQuestion,
                                            )
                                        }
                                    />
                                )}
                                {q.type === 'NUMBER_INPUT' && (
                                    <NumberInputQuestionEditor
                                        question={q}
                                        onChange={updated => updateQuestion(q.id, updated)}
                                    />
                                )}
                            </QuestionCardShell>
                        ))}
                    </div>

                    {/* Bottom bar */}
                    <div className="mt-4 flex flex-col gap-4 border-t border-sky-500/20 pt-4 lg:flex-row">
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleSave} disabled={saveStatus === 'saving'}>
                                {saveStatus === 'saving' && 'Saving…'}
                                {saveStatus === 'idle' && 'Save questionnaire'}
                                {saveStatus === 'saved' && 'Saved'}
                                {saveStatus === 'error' && 'Retry save'}
                            </Button>
                            {saveStatus === 'saved' && (
                                <span className="text-xs text-emerald-300">Saved to server.</span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="text-xs text-rose-300">Error: {errorMsg}</span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <FloatingAddBar onAdd={addQuestion} />
        </>
    )
}
