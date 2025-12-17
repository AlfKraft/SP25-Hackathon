import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import type { MotivationMatrixSliderQuestion } from '@/types/questionnaire'

export function MotivationMatrixSliderEditor({
                                                 question,
                                                 onChange,
                                             }: {
    question: MotivationMatrixSliderQuestion
    onChange: (q: MotivationMatrixSliderQuestion) => void
}) {
    return (
        <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <Label>Left label</Label>
                    <Input
                        value={question.leftLabel ?? ''}
                        onChange={e => onChange({ ...question, leftLabel: e.target.value })}
                        className="h-8 text-xs"
                    />
                </div>
                <div>
                    <Label>Right label</Label>
                    <Input
                        value={question.rightLabel ?? ''}
                        onChange={e => onChange({ ...question, rightLabel: e.target.value })}
                        className="h-8 text-xs"
                    />
                </div>
            </div>

            <Label>Rows</Label>
            {question.rows.map((row, i) => (
                <div key={row.key} className="flex gap-2">
                    <Input
                        value={row.label}
                        onChange={e =>
                            onChange({
                                ...question,
                                rows: question.rows.map((r, idx) =>
                                    idx === i ? { ...r, label: e.target.value } : r
                                ),
                            })
                        }
                        className="h-8 text-xs"
                    />
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                            onChange({
                                ...question,
                                rows: question.rows.filter(r => r.key !== row.key),
                            })
                        }
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}

            <Button
                size="sm"
                variant="outline"
                onClick={() =>
                    onChange({
                        ...question,
                        rows: [
                            ...question.rows,
                            { key: crypto.randomUUID(), label: 'New motivation' },
                        ],
                    })
                }
            >
                <Plus className="mr-1 h-3 w-3" />
                Add row
            </Button>
        </div>
    )
}
