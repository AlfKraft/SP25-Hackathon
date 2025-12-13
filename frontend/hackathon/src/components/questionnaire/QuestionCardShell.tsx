import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { Switch } from '@/components/ui/switch.tsx'
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea.tsx'
import type { Question } from '@/types/questionnaire.ts'

interface Props {
    question: Question
    index: number
    total: number
    onChange: (updated: Question) => void
    onMoveUp: () => void
    onMoveDown: () => void
    onDelete: () => void
    children: ReactNode
}

export function QuestionCardShell({
                                      question,
                                      index,
                                      total,
                                      onChange,
                                      onMoveUp,
                                      onMoveDown,
                                      onDelete,
                                      children,
                                  }: Props) {
    const isSystemRequired = question.systemRequired === true

    return (
        <div className="rounded-xl border border-sky-500/30 bg-slate-950/60 p-4 space-y-3">
            {/* Header */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-sky-300/80">
                    <span className="rounded-full bg-sky-900/70 px-2 py-1 text-[10px] border border-sky-500/40">
                        Q{index + 1}
                    </span>
                    <span>
                        {question.type === 'TEXT' && 'Text field'}
                        {question.type === 'NUMBER_SLIDER' && 'Numeric slider'}
                        {question.type === 'NUMBER_INPUT' && 'Numeric field'}
                        {question.type === 'SINGLE_CHOICE' && 'One choice'}
                        {question.type === 'MULTI_CHOICE' && 'Multiple choice'}
                        {isSystemRequired && (
                            <span className="ml-2 rounded-full bg-sky-800/80 px-2 py-0.5 text-[9px] text-sky-50 border border-sky-500/50">
            required core field
        </span>
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Required toggle */}
                    <div className="flex items-center gap-1 text-xs">
                        <Switch
                            id={`required-${question.id}`}
                            checked={question.required}
                            disabled={isSystemRequired}
                            onCheckedChange={required => {
                                if (isSystemRequired) return
                                onChange({ ...question, required })
                            }}
                        />
                        <Label
                            htmlFor={`required-${question.id}`}
                            className="text-xs font-normal text-sky-100/90"
                        >
                            Required
                        </Label>
                    </div>

                    {/* Move/delete controls */}
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={index === 0}
                            onClick={onMoveUp}
                        >
                            <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={index === total - 1}
                            onClick={onMoveDown}
                        >
                            <ArrowDown className="h-3 w-3" />
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-rose-300 hover:text-rose-200"
                            onClick={onDelete}
                            disabled={isSystemRequired}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
                {/* Left side: label + description */}
                <div className="space-y-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-sky-100/90">Question</Label>
                        <Input
                            value={question.label}
                            onChange={e =>
                                onChange({ ...question, label: e.target.value })
                            }
                            className="h-8 text-xs"
                            placeholder="What do you want to ask?"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-sky-100/90">Help text / description</Label>
                        <Textarea
                            value={question.description ?? ''}
                            onChange={e =>
                                onChange({ ...question, description: e.target.value })
                            }
                            className="min-h-[50px] text-xs"
                            placeholder="Optional explanation shown under the question"
                        />
                    </div>
                </div>

                {/* Right side: response key + type-specific config */}
                <div className="space-y-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-sky-100/90">Response key</Label>
                        <Input
                            value={question.key}
                            onChange={e =>
                                onChange({ ...question, key: e.target.value })
                            }
                            disabled={isSystemRequired}
                            className="h-8 text-xs font-mono disabled:bg-slate-900/70 disabled:text-sky-300/60"
                            placeholder="e.g. experience_level"
                        />
                        <p className="text-[10px] text-sky-300/70">
                            This key will be used in exports (CSV, JSON).
                        </p>
                    </div>

                    {/* Type-specific editor injected from parent */}
                    {children}
                </div>
            </div>
        </div>
    )
}
