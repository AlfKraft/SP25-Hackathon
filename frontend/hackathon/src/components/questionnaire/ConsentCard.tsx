import { Button } from '@/components/ui/button'

export type ConsentValue = 'YES' | 'NO'

type Props = {
    value: ConsentValue | null
    onChange: (v: ConsentValue) => void
    onPrev: () => void
    onNext: () => void
}

export function ConsentCard({ value, onChange, onPrev, onNext }: Props) {
    return (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-6 text-sm text-slate-300 space-y-4">
            <div className="space-y-1">
                <div className="text-base font-semibold text-slate-50">Introduction</div>
                <p className="text-slate-300">
                    I am age 18 or older, I have read and understood the previous information and I wish to continue
                    with the hackathon registration. Please only answer "yes" if you agree to all of the aforementioned
                    purpose and use of your data. Answering "no" will still allow you to register for the hackathon,
                    but we will not process your data to support team formation before the hackathon, nor to support
                    entrepreneurial intention.
                </p>
            </div>

            <div className="space-y-2">
                <div className="text-xs text-slate-400">Choose one of the following answers</div>

                <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 cursor-pointer hover:bg-slate-950/60">
                    <input
                        type="radio"
                        name="consent"
                        checked={value === 'YES'}
                        onChange={() => onChange('YES')}
                    />
                    <span className="text-slate-100">Yes</span>
                </label>

                <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 cursor-pointer hover:bg-slate-950/60">
                    <input
                        type="radio"
                        name="consent"
                        checked={value === 'NO'}
                        onChange={() => onChange('NO')}
                    />
                    <span className="text-slate-100">No</span>
                </label>
            </div>

            <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={onPrev}>
                    Previous
                </Button>

                <Button type="button" onClick={onNext} disabled={!value}>
                    Next
                </Button>
            </div>
        </div>
    )
}
