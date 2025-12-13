import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TextQuestion } from '@/types/questionnaire'

interface Props {
    question: TextQuestion
    onChange: (updated: TextQuestion) => void
}

export function TextQuestionEditor({ question, onChange }: Props) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-sky-100/90">Max length</Label>
            <Input
                type="number"
                min={1}
                value={question.maxLength ?? ''}
                onChange={e =>
                    onChange({
                        ...question,
                        maxLength: e.target.value === '' ? undefined : Number(e.target.value)
                    })
                }
                className="h-8 text-xs"
            />
        </div>
    )
}