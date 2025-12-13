import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { NumberInputQuestion } from '@/types/questionnaire'

interface Props {
    question: NumberInputQuestion
    onChange: (updated: NumberInputQuestion) => void
}

export function NumberInputQuestionEditor({ question, onChange }: Props) {
    return (
        <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Min</Label>
                <Input
                    type="number"
                    value={question.min ?? ''}
                    onChange={e =>
                        onChange({
                            ...question,
                            min: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Max</Label>
                <Input
                    type="number"
                    value={question.max ?? ''}
                    onChange={e =>
                        onChange({
                            ...question,
                            max: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Step</Label>
                <Input
                    type="number"
                    value={question.step ?? 1}
                    onChange={e =>
                        onChange({
                            ...question,
                            step: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
        </div>
    )
}