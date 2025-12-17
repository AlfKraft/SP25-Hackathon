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
import { LongTextQuestionEditor } from '@/components/questionnaire/LongTextQuestionEditor'
import { SliderQuestionEditor } from '@/components/questionnaire/SliderQuestionEditor'
import { ChoiceQuestionEditor } from '@/components/questionnaire/ChoiceQuestionEditor'
import { NumberInputQuestionEditor } from '@/components/questionnaire/NumberInputQuestionEditor'
import { FloatingAddBar } from '@/components/questionnaire/FloatingAddBar'
import type { QuestionnaireStatus } from '@/pages/HackathonQuestionnaireAdminPage.tsx'
import { MotivationMatrixSliderEditor } from '@/components/questionnaire/MotivationMatrixSliderEditor.tsx'

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
    onSave?: () => void
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const NUMERIC_KEYS = new Set(['age', 'years_experience'])

const DEFAULT_LABEL: Record<QuestionKind, string> = {
    TEXT: 'Short text answer',
    LONG_TEXT: 'Long text answer',
    NUMBER_SLIDER: 'Range from x to y',
    NUMBER_INPUT: 'Numeric answer',
    SINGLE_CHOICE: 'Choose one option',
    MULTI_CHOICE: 'Choose one or more options',
    MOTIVATION_MATRIX_SLIDER: 'Motivation',
}

const MOTIVATION_DESCRIPTION =
    `Please indicate your level of agreement with the statement below. Please mind that: 1 = "Not at all", 2 = "To some extent", 3 = "To a moderate extent", 4 = "To a large extent", 5 = "Completely"

To what extent was your decision to participate in this hackathon motivated by... `

function createId() {
    return crypto.randomUUID()
}

function opt(label: string) {
    return { id: createId(), label }
}

function createQuestion(kind: QuestionKind, index: number): Question {
    const base = {
        id: createId(),
        key: `q_${index + 1}`,
        label: DEFAULT_LABEL[kind],
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
                options: [opt('Option 1'), opt('Option 2')],
            } satisfies SingleChoiceQuestion

        case 'MULTI_CHOICE':
            return {
                ...base,
                type: 'MULTI_CHOICE',
                randomizeOptions: false,
                maxSelections: undefined,
                options: [opt('Option 1'), opt('Option 2')],
            } satisfies MultiChoiceQuestion

        case 'MOTIVATION_MATRIX_SLIDER':
            return {
                ...base,
                type: 'MOTIVATION_MATRIX_SLIDER',
                label: 'Motivation',
                description: MOTIVATION_DESCRIPTION,
                min: 1,
                max: 5,
                step: 1,
                showValue: true,
                nullAllowed: true,
                leftLabel: 'Not at all',
                rightLabel: 'Completely',
                rows: [
                    { key: 'feedback', label: 'Getting immediate feedback' },
                    { key: 'startup_creation', label: 'Creating a new startup' },
                    { key: 'first_product', label: 'Building the first version of the startup product' },
                    { key: 'own_startup', label: 'Working on my startup' },
                    { key: 'team_skills', label: 'Developing the skills of my startup team' },
                    { key: 'domain_learning', label: 'Learning about the domain of my startup' },
                ],
            }

        default:
            // Should never happen due to QuestionKind union
            return base as unknown as Question
    }
}

function prettifyKey(key: string): string {
    const withSpaces = key.replace(/[_\-]+/g, ' ')
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1)
}

export default function QuestionnaireBuilder({ hackathonId, meta, requiredFields, onSave }: Props) {
    const isImported = meta?.sourceType === 'EXTERNAL_UPLOAD'
    const isPublished = meta?.status === 'PUBLISHED'
    const isLocked = isImported || isPublished

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
                        opt('High school diploma'),
                        opt('Bachelor degree'),
                        opt('Master degree'),
                        opt('Doctorate'),
                        opt('Prefer not to say'),
                        opt('Other'),
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
                        opt('Self-employed'),
                        opt('Employee at a company'),
                        opt('Unemployed'),
                        opt('Prefer not to say'),
                        opt('Other'),
                    ],
                } satisfies SingleChoiceQuestion
            }

            if (key === 'team_name') {
                return {
                    id: createId(),
                    key: 'team_name',
                    label: 'If you are already part of a team, please write the name of your team below.',
                    type: 'TEXT',
                    required: false,
                    description: 'Please make sure you and your team members use the same team name.',
                    systemRequired: false,
                    order: index + 1,
                    maxLength: 255,
                } satisfies TextQuestion
            }

            if (key === 'gender') {
                return {
                    id: createId(),
                    key,
                    label: 'Gender',
                    type: 'SINGLE_CHOICE',
                    required: true,
                    systemRequired: true,
                    order: index + 1,
                    randomizeOptions: false,
                    options: [opt('Male'), opt('Female'), opt('Non-binary'), opt('Prefer not to say'), opt('Other')],
                } satisfies SingleChoiceQuestion
            }

            if (key === 'role') {
                return {
                    id: createId(),
                    key,
                    label: 'Role',
                    type: 'MULTI_CHOICE',
                    required: true,
                    systemRequired: true,
                    order: index + 1,
                    randomizeOptions: false,
                    options: [
                        opt('Software developer (e.g. Programming skills)'),
                        opt('Designer (e.g. Front end development, UI design)'),
                        opt('Marketer (Marketing campaigns, reaching target audience)'),
                        opt('Business expert (e.g. Managing, entrepreneurship)'),
                    ],
                } satisfies MultiChoiceQuestion
            }

            if (key === 'skills') {
                return {
                    id: createId(),
                    key: 'skills',
                    label: 'Skills',
                    description: 'Select the areas you feel comfortable contributing in during the hackathon.',
                    type: 'MULTI_CHOICE',
                    required: true,
                    systemRequired: true,
                    order: index + 1,
                    randomizeOptions: false,
                    maxSelections: undefined,
                    options: [
                        opt('Programming (general)'),
                        opt('Frontend (React / UI implementation)'),
                        opt('Backend (APIs / databases)'),
                        opt('Mobile development'),
                        opt('UI / UX design'),
                        opt('Data / analytics'),
                        opt('AI / ML'),
                        opt('DevOps / cloud / deployment'),
                        opt('Product thinking / ideation'),
                        opt('Business / entrepreneurship'),
                        opt('Marketing / growth'),
                        opt('Pitching / presentations'),
                        opt('Project management / facilitation'),
                        opt('Research / user interviews / validation'),
                    ],
                } satisfies MultiChoiceQuestion
            }

            const kind: QuestionKind =
                NUMERIC_KEYS.has(key) ? 'NUMBER_INPUT' : key === 'motivation' ? 'MOTIVATION_MATRIX_SLIDER' : 'TEXT'

            const base = createQuestion(kind, index)

            return {
                ...base,
                key,
                label: prettifyKey(key),
                required: true,
                systemRequired: true,
            }
        })

        return [...coreQuestions]
    })

    const [initializedFromMeta, setInitializedFromMeta] = useState(false)
    const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        if (initializedFromMeta) return

        if (!meta) {
            setInitializedFromMeta(true)
            return
        }

        if (meta.sourceType === 'INTERNAL' && Array.isArray(meta.questions) && meta.questions.length > 0) {
            setQuestions(meta.questions)
        }

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
                                This hackathon uses an imported questionnaire. Its structure is locked and cannot be edited in the web builder.
                            </p>
                            <p>
                                To change it, re-import a new file in the <strong>Import file</strong> tab.
                            </p>
                        </>
                    )}

                    {isPublished && (
                        <p>
                            This questionnaire has been <strong>published</strong>. Editing is disabled to preserve data integrity.
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

    const handleSave = async () => {
        setSaveStatus('saving')
        setErrorMsg(null)
        try {
            const res = await fetch(`${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/internal`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questions }),
            })
            if (!res.ok) throw new Error(`Status ${res.status}`)
            setSaveStatus('saved')
            setTimeout(() => setSaveStatus('idle'), 2000)
            onSave?.()
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
                        <Button size="sm" variant="outline" onClick={() => addQuestion('MOTIVATION_MATRIX_SLIDER')}>
                            <SlidersHorizontal className="mr-1 h-4 w-4" />
                            Motivation matrix
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 text-sm text-sky-100/85">
                    <div className="rounded-lg border border-sky-500/30 bg-slate-900/80 p-3 text-xs">
                        <p className="mb-2 text-sky-200/80">These keys must exist and be marked as required:</p>
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

                    <div className="space-y-4">
                        {questions.length === 0 && (
                            <p className="text-xs text-sky-200/70">No questions yet. Use the buttons above to add a block.</p>
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
                                    <TextQuestionEditor question={q} onChange={updated => updateQuestion(q.id, updated)} />
                                )}

                                {q.type === 'LONG_TEXT' && (
                                    <LongTextQuestionEditor question={q} onChange={updated => updateQuestion(q.id, updated)} />
                                )}

                                {q.type === 'NUMBER_SLIDER' && (
                                    <SliderQuestionEditor question={q} onChange={updated => updateQuestion(q.id, updated)} />
                                )}

                                {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') && (
                                    <ChoiceQuestionEditor
                                        question={q}
                                        onChange={updated =>
                                            updateQuestion(q.id, updated as SingleChoiceQuestion | MultiChoiceQuestion)
                                        }
                                    />
                                )}

                                {q.type === 'NUMBER_INPUT' && (
                                    <NumberInputQuestionEditor question={q} onChange={updated => updateQuestion(q.id, updated)} />
                                )}

                                {q.type === 'MOTIVATION_MATRIX_SLIDER' && (
                                    <MotivationMatrixSliderEditor question={q} onChange={updated => updateQuestion(q.id, updated)} />
                                )}
                            </QuestionCardShell>
                        ))}
                    </div>

                    <div className="mt-4 flex flex-col gap-4 border-t border-sky-500/20 pt-4 lg:flex-row">
                        <div className="flex items-center gap-2">
                            <Button size="sm" onClick={handleSave} disabled={saveStatus === 'saving'}>
                                {saveStatus === 'saving' && 'Saving…'}
                                {saveStatus === 'idle' && 'Save questionnaire'}
                                {saveStatus === 'saved' && 'Saved'}
                                {saveStatus === 'error' && 'Retry save'}
                            </Button>
                            {saveStatus === 'saved' && <span className="text-xs text-emerald-300">Saved to server.</span>}
                            {saveStatus === 'error' && <span className="text-xs text-rose-300">Error: {errorMsg}</span>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <FloatingAddBar onAdd={addQuestion} />
        </>
    )
}
