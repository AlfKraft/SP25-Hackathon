import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { SliderQuestion } from '@/types/questionnaire'

interface Props {
    question: SliderQuestion
    onChange: (updated: SliderQuestion) => void
}

export function SliderQuestionEditor({ question, onChange }: Props) {
    return (
        <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Min</Label>
                <Input
                    type="number"
                    value={question.min}
                    onChange={e =>
                        onChange({
                            ...question,
                            min: Number(e.target.value)
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Max</Label>
                <Input
                    type="number"
                    value={question.max}
                    onChange={e =>
                        onChange({
                            ...question,
                            max: Number(e.target.value)
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-sky-100/90">Step</Label>
                <Input
                    type="number"
                    value={question.step}
                    onChange={e =>
                        onChange({
                            ...question,
                            step: Number(e.target.value)
                        })
                    }
                    className="h-8 text-xs"
                />
            </div>
            <div className="col-span-3 flex items-center gap-2 mt-2">
                <Switch
                    id={`showval-${question.id}`}
                    checked={question.showValue}
                    onCheckedChange={showValue => onChange({ ...question, showValue })}
                />
                <Label
                    htmlFor={`showval-${question.id}`}
                    className="text-xs font-normal text-sky-100/90"
                >
                    Show numeric value next to slider
                </Label>
            </div>
        </div>
    )
}