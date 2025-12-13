// src/components/questionnaire/QuestionnairePreview.tsx
import type { Question } from '@/types/questionnaire'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
interface Props {
    questions: Question[]
}

/**
 * Read-only preview of how participants will see the questionnaire.
 */
export function QuestionnairePreview({ questions }: Props) {
    // sort by order if present, otherwise keep current order
    const sorted = [...questions].sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order
        return 0
    })

    if (sorted.length === 0) {
        return (
            <div className="rounded-lg border border-slate-700 bg-slate-950/80 p-3 text-xs text-slate-300">
                No questions yet. Add some fields to see a participant preview.
            </div>
        )
    }

    return (
        <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/80 p-3">
            <p className="mb-1 text-[11px] font-semibold text-sky-200/80">
                Participant view preview
            </p>

            <div className="space-y-4 text-sm text-slate-100">
                {sorted.map(q => (
                    <div
                        key={q.id}
                        className="space-y-1 border-b border-slate-800 pb-3 last:border-0 last:pb-0"
                    >
                        {/* Label + required indicator */}
                        <div className="flex items-baseline gap-2">
                            <Label className="text-xs font-semibold text-slate-100">
                                {q.label || q.key}
                            </Label>
                            {q.required && (
                                <span className="text-[10px] uppercase tracking-wide text-rose-300">
                  * required
                </span>
                            )}
                        </div>

                        {/* Description */}
                        {q.description && (
                            <p className="text-[11px] text-slate-300">{q.description}</p>
                        )}

                        {/* Control preview (disabled) */}
                        <div className="mt-1">
                            {q.type === 'TEXT' && (
                                <Input
                                    disabled
                                    placeholder="Text answer…"
                                    className="h-8 text-xs disabled:bg-slate-900/70 disabled:text-slate-400"
                                />
                            )}

                            {q.type === 'NUMBER_INPUT' && (
                                <Input
                                    type="number"
                                    disabled
                                    placeholder="Numeric answer…"
                                    className="h-8 text-xs disabled:bg-slate-900/70 disabled:text-slate-400"
                                />
                            )}

                            {q.type === 'NUMBER_SLIDER' && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="range"
                                        min={q.min}
                                        max={q.max}
                                        step={q.step}
                                        disabled
                                        defaultValue={Math.round((q.min + q.max) / 2)}
                                        className="w-full accent-sky-500"
                                    />
                                    {q.showValue && (
                                        <span className="w-10 text-right text-[11px] text-slate-300">
                      {Math.round((q.min + q.max) / 2)}
                    </span>
                                    )}
                                </div>
                            )}

                            {(q.type === 'SINGLE_CHOICE' || q.type === 'MULTI_CHOICE') && (
                                <div className="space-y-1">
                                    {q.options.map(opt => (
                                        <label
                                            key={opt.id}
                                            className="flex items-center gap-2 text-xs text-slate-100"
                                        >
                                            <input
                                                type={q.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                                                disabled
                                                name={q.key}
                                                className="h-3 w-3 accent-sky-500"
                                            />
                                            <span>{opt.label}</span>
                                        </label>
                                    ))}
                                    {q.type === 'MULTI_CHOICE' && q.maxSelections && (
                                        <p className="text-[10px] text-slate-400">
                                            Up to {q.maxSelections} option
                                            {q.maxSelections > 1 ? 's' : ''} can be selected.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
