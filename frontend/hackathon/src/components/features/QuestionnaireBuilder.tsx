import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AlertCircle, Edit3 } from 'lucide-react'

interface QuestionnaireMeta {
    id: number
    hackathonId: number
    title: string
    description: string
    sourceType: 'WEB' | 'IMPORT'
    isLocked: boolean
    createdAt?: string
    updatedAt?: string
}

interface Props {
    hackathonId: number
    meta: QuestionnaireMeta | null
    requiredFields: string[]
}

export default function QuestionnaireBuilder({ hackathonId, meta, requiredFields }: Props) {
    const isImported = meta?.sourceType === 'IMPORT'

    if (isImported) {
        return (
            <Card className="border border-amber-500/30 bg-amber-950/40 shadow-[0_18px_45px_rgba(120,53,15,0.7)] backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-amber-50">
                        <AlertCircle className="h-4 w-4" />
                        Builder disabled for imported questionnaires
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-amber-100/90">
                    <p className="mb-2">
                        This hackathon uses an imported questionnaire. Its structure is locked and
                        cannot be edited in the web builder.
                    </p>
                    <p>
                        To change it, re-import a new file in the <strong>Import file</strong> tab.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="border border-sky-500/20 bg-slate-900/70 shadow-[0_20px_60px_rgba(15,23,42,0.95)] backdrop-blur-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sky-50">
                    <Edit3 className="h-5 w-5" />
                    Web questionnaire builder (coming soon)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-sky-100/85">
                <p>
                    Here you will build and edit the questionnaire directly on the webpage for
                    hackathon <span className="font-semibold">#{hackathonId}</span>.
                </p>
                <p className="text-xs text-sky-200/80">
                    All versions created in this builder must still contain at least the required
                    fields:
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                    {requiredFields.map(field => (
                        <span
                            key={field}
                            className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 font-mono"
                        >
              {field}
            </span>
                    ))}
                </div>

                <p className="mt-4 text-xs text-sky-200/70">
                    You can now start implementing the actual builder UI here: question list,
                    drag-and-drop reordering, field configuration, etc.
                </p>
            </CardContent>
        </Card>
    )
}
