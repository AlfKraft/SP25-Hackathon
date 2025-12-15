// src/pages/HackathonQuestionnaireAdminPage.tsx
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { AlertCircle, FileText, Loader2, MessageSquareCode } from 'lucide-react'
import QuestionnaireImportSection from '@/components/features/QuestionnaireImportSection'
import QuestionnaireBuilder from '@/components/features/QuestionnaireBuilder'
import { API_URL } from '@/lib/config'
import type { Question } from '@/types/questionnaire'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useHackathon } from '@/contexts/HackathonContext'


const REQUIRED_MIN_FIELDS = [
    'first_name',
    'last_name',
    'email',
    'role',
    'skills',
    'motivation',
    'age',
    'gender',
    'education',
    'employment',
    'years_experience',
    'team_name',
]

type QuestionnaireSourceType = 'INTERNAL' | 'EXTERNAL_UPLOAD'
export type QuestionnaireStatus = 'DRAFT' | 'PUBLISHED' | 'LOCKED' | string

interface PublishedDto {
    questionnaireId: number
    status: QuestionnaireStatus
}
interface QuestionnaireMeta {
    id: number
    hackathonId: number
    title: string
    description: string
    sourceType: QuestionnaireSourceType
    isLocked: boolean
    createdAt?: string
    updatedAt?: string
    questions?: Question[]
    status?: QuestionnaireStatus
}

export default function HackathonQuestionnaireAdminPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { refreshHackathons } = useHackathon()
    const hackathonId = Number(id)
    const [publishing, setPublishing] = useState(false)
    const [publishError, setPublishError] = useState<string | null>(null)
    const [published, setPublished] = useState<boolean>(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [meta, setMeta] = useState<QuestionnaireMeta | null>(null)
    const [activeTab, setActiveTab] = useState<'import' | 'builder'>('import')

    useEffect(() => {
        if (!hackathonId) return

        const loadMeta = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await fetch(
                    `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire`,
                    {
                        method: 'GET',
                        credentials: 'include',
                    },
                )

                if (res.status === 404) {
                    // ❗ No questionnaire yet:
                    // meta = null, show WEB builder with defaults
                    setMeta(null)
                    setActiveTab('builder')
                    return
                }

                if (!res.ok) {
                    const text = await res.text()
                    throw new Error(text || 'Failed to load questionnaire info')
                }

                const data: QuestionnaireMeta = await res.json()
                setMeta(data)

                // Existing questionnaire:
                // IMPORT → show import tab & lock builder
                // WEB    → show builder, hydrated from meta.questions
                if (data.sourceType === 'EXTERNAL_UPLOAD') {
                    setActiveTab('import')
                } else {
                    setActiveTab('builder')
                }

                if (data.status === 'PUBLISHED' || data.status === 'LOCKED') {
                    setPublished(true)
                }
                else {
                    setPublished(false)
                }
            } catch (e: any) {
                console.error(e)
                setError(e?.message ?? 'Failed to load questionnaire info')
            } finally {
                setLoading(false)
            }
        }

        void loadMeta()
    }, [hackathonId])

    const handlePublishToggle = async () => {

        setPublishing(true)
        setPublishError(null)

        try {
            const res = await fetch(
                `${API_URL}/api/admin/hackathons/${hackathonId}/questionnaire/publish`,
                {
                    method: 'POST',
                    credentials: 'include',
                },
            )

            if (!res.ok) {
                const text = await res.text()
                throw new Error(text || `Failed to publish (status ${res.status})`)
            }
            const data: PublishedDto = await res.json()

            setPublished(data.status === 'PUBLISHED')
            // Optional: also reflect in meta so header pills stay in sync
            setMeta(prev =>
                prev ? { ...prev, status: data.status } : prev
            )
            await refreshHackathons()
        } catch (e: any) {
            console.error(e)
            setPublishError(e?.message ?? 'Failed to publish questionnaire')
        } finally {
            setPublishing(false)
        }
    }


    const headerSubtitle = useMemo(() => {
        if (loading) return 'Loading questionnaire information...'
        if (!meta)
            return 'Import questionnaire data or design one on the webpage for this hackathon.'
        if (meta.sourceType === 'EXTERNAL_UPLOAD')
            return 'This hackathon uses an imported questionnaire. Structure is locked; you can re-import if necessary.'
        return 'This hackathon uses a web-based questionnaire that can be edited in the builder.'
    }, [loading, meta])

    if (!hackathonId) {
        return (
            <div className="mx-auto max-w-6xl p-4 md:p-8 text-sky-100">
                Invalid hackathon id.
            </div>
        )
    }

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
            {/* HEADER */}
            <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-1 rounded-full border border-sky-500/40 bg-slate-900/70 px-2 py-1 text-xs text-sky-100 transition-all hover:border-sky-400 hover:bg-slate-800/90 hover:text-sky-50 disabled:opacity-60"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3.5 w-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back
                </button>
                <div>
                    <h1 className="bg-gradient-to-r from-sky-200 via-cyan-200 to-indigo-300 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                        Hackathon questionnaire
                    </h1>
                    <p className="mt-1 text-sm text-sky-100/70">{headerSubtitle}</p>
                    {publishError && (
                        <p className="mt-1 text-xs text-rose-300">
                            {publishError}
                        </p>
                    )}
                </div>

                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 rounded-full border border-sky-500/40 bg-slate-900/80 px-3 py-1 text-xs text-sky-100">
                            <FileText className="h-4 w-4" />
                            <span>Hackathon #{hackathonId}</span>
                        </div>

                        {meta?.sourceType === 'EXTERNAL_UPLOAD' && (
                            <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-[11px] text-amber-100">
                    Imported & locked
                </span>
                        )}

                        {meta?.sourceType === 'INTERNAL' && (
                            <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-100">
                    Web-based & editable
                </span>
                        )}
                    </div>

                    {/* Publish toggle only for INTERNAL questionnaires */}
                    {meta?.sourceType === 'INTERNAL' && (
                        <div className="flex items-center gap-2">
                            <Switch
                                id="publish-questionnaire"
                                checked={published}
                                disabled={publishing || !meta}
                                onCheckedChange={handlePublishToggle}
                            />
                            <Label
                                htmlFor="publish-questionnaire"
                                className="text-xs text-sky-100/90"
                            >
                                {publishing
                                    ? 'Publishing…'
                                    : published
                                        ? 'Questionnaire published'
                                        : 'Publish questionnaire'}
                            </Label>
                        </div>
                    )}
                </div>
            </header>


            {/* REQUIRED FIELDS INFO */}
            <Card className="border border-sky-500/20 bg-slate-900/70 shadow-[0_18px_45px_rgba(15,23,42,0.9)] backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-sky-50">
                        <AlertCircle className="h-4 w-4 text-amber-300" />
                        All questionnaires must include these fields
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-xs text-sky-100/90">
                    {REQUIRED_MIN_FIELDS.map(field => (
                        <span
                            key={field}
                            className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono"
                        >
              {field}
            </span>
                    ))}
                </CardContent>
            </Card>

            {/* GLOBAL ERROR */}
            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100 shadow-sm shadow-red-500/20">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                </div>
            )}

            {/* LOADING */}
            {loading && (
                <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-slate-900/80 px-3 py-2 text-sm text-sky-100">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading questionnaire…
                </div>
            )}

            {/* TABS: IMPORT / BUILDER */}
            {!loading && (
                <Tabs
                    value={activeTab}
                    onValueChange={val => setActiveTab(val as 'import' | 'builder')}
                    className="w-full"
                >
                    <TabsList className="mb-4 grid w-full grid-cols-2 bg-slate-900/80">
                        <TabsTrigger
                            value="import"
                            className="data-[state=active]:bg-sky-500/90 data-[state=active]:text-sky-950"
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Import file
                        </TabsTrigger>
                        <TabsTrigger
                            value="builder"
                            className="data-[state=active]:bg-sky-500/90 data-[state=active]:text-sky-950"
                        >
                            <MessageSquareCode className="mr-2 h-4 w-4" />
                            Web builder
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="import">
                        <QuestionnaireImportSection
                            hackathonId={hackathonId}
                            currentMeta={meta}
                            onImported={newMeta => setMeta(newMeta)}
                            requiredFields={REQUIRED_MIN_FIELDS}
                        />
                    </TabsContent>

                    <TabsContent value="builder">
                        <QuestionnaireBuilder
                            hackathonId={hackathonId}
                            meta={meta}
                            requiredFields={REQUIRED_MIN_FIELDS}
                        />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
