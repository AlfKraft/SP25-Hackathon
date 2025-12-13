// src/components/questionnaire/ChoiceQuestionEditor.tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'
import type { SingleChoiceQuestion, MultiChoiceQuestion } from '@/types/questionnaire'

type ChoiceLike = SingleChoiceQuestion | MultiChoiceQuestion

interface Props {
    question: ChoiceLike
    onChange: (updated: ChoiceLike) => void
}

function createOptionLabel(index: number) {
    return `Option ${index + 1}`
}

export function ChoiceQuestionEditor({ question, onChange }: Props) {
    const isMulti = question.type === 'MULTI_CHOICE'

    return (
        <div className="space-y-2 text-xs">
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Options</Label>
                <div className="space-y-1">
                    {question.options.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2">
                            <Input
                                value={opt.label}
                                onChange={e =>
                                    onChange({
                                        ...question,
                                        options: question.options.map((o, i) =>
                                            i === idx ? { ...o, label: e.target.value } : o
                                        )
                                    })
                                }
                                className="h-8 text-xs"
                                placeholder={createOptionLabel(idx)}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() =>
                                    onChange({
                                        ...question,
                                        options: question.options.filter(o => o.id !== opt.id)
                                    })
                                }
                                disabled={question.options.length <= 1}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    className="mt-1 h-7 border-sky-500/40 text-[11px]" // keep it visually tiny
                    onClick={() =>
                        onChange({
                            ...question,
                            options: [
                                ...question.options,
                                { id: crypto.randomUUID(), label: createOptionLabel(question.options.length) }
                            ]
                        })
                    }
                >
                    <Plus className="mr-1 h-3 w-3" />
                    Add option
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    id={`rand-${question.id}`}
                    checked={question.randomizeOptions}
                    onCheckedChange={randomizeOptions =>
                        onChange({
                            ...question,
                            randomizeOptions
                        })
                    }
                />
                <Label
                    htmlFor={`rand-${question.id}`}
                    className="text-xs font-normal text-sky-100/90"
                >
                    Randomize option order
                </Label>
            </div>

            {isMulti && (
                <div className="space-y-1">
                    <Label className="text-xs text-sky-100/90">Max selections (optional)</Label>
                    <Input
                        type="number"
                        min={1}
                        max={question.options.length || undefined}
                        value={question.maxSelections ?? ''}
                        onChange={e =>
                            onChange({
                                ...(question as MultiChoiceQuestion),
                                maxSelections: e.target.value === '' ? undefined : Number(e.target.value)
                            })
                        }
                        className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-sky-300/70">
                        Leave empty to allow selecting any number of options.
                    </p>
                </div>
            )}
        </div>
    )
}
