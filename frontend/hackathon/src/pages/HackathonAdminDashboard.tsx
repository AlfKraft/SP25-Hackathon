// src/pages/HackathonAdminDashboard.tsx
import { HackathonAdminLayout } from './HackathonAdminLayout'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

export default function HackathonAdminDashboard() {
    return (
        <HackathonAdminLayout>
            <section className="space-y-6 text-sky-50">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Overview</h2>
                        <p className="text-xs text-sky-100/70">
                            Quick status of registrations, questionnaire and teams.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="rounded-full bg-sky-500/90 px-4 text-sky-950 shadow-sm shadow-sky-500/40 hover:bg-sky-400"
                    >
                        Go to public page
                        <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>

                {/* stats placeholders */}
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sky-500/25 bg-slate-900/60 p-3 text-xs">
                        <p className="text-sky-100/70">Registered participants</p>
                        <p className="mt-2 text-2xl font-semibold text-sky-50">–</p>
                    </div>
                    <div className="rounded-xl border border-sky-500/25 bg-slate-900/60 p-3 text-xs">
                        <p className="text-sky-100/70">Teams</p>
                        <p className="mt-2 text-2xl font-semibold text-sky-50">–</p>
                    </div>
                    <div className="rounded-xl border border-sky-500/25 bg-slate-900/60 p-3 text-xs">
                        <p className="text-sky-100/70">Questionnaire completion</p>
                        <p className="mt-2 text-2xl font-semibold text-sky-50">–%</p>
                    </div>
                </div>
            </section>
        </HackathonAdminLayout>
    )
}
