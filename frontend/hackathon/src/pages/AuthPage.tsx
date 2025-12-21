import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Button } from '@/components/ui/button'
import { Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { API_URL } from '@/lib/config'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const navigate = useNavigate()
    const { refresh } = useAuth()

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch(`${API_URL}/api/auth/login`, {
                method: 'POST',
                credentials: 'include', // 🔐 receive auth_token cookie
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })

            if (!response.ok) {
                const errorText = await response.text()
                throw new Error(errorText || 'Login failed')
            }

            // Cookie is now set; update global auth state
            await refresh()

            toast.success('Login successful')
            // redirect wherever you want as "home" for a logged-in organizer
            navigate('/')
        } catch (error: any) {
            console.error('Login error', error)
            toast.error(error?.message ?? 'Login failed')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-slate-800 bg-slate-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
                {/* LEFT SIDE – Brand / Pitch */}
                <div className="hidden md:flex flex-col justify-between border-r border-slate-800 bg-gradient-to-b from-slate-950/80 to-slate-900/40 p-8">
                    <div>
                        <div className="flex items-center gap-2 mb-8">
                            <div className="h-9 w-9 rounded-xl bg-sky-500/20 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-sky-400" />
                            </div>
                            <span className="text-lg font-semibold tracking-tight text-slate-50">
                Hackathon Hub
              </span>
                        </div>

                        <h1 className="text-3xl font-bold text-slate-50 mb-3">
                            Welcome back, organizer
                        </h1>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Sign in to manage your hackathons, review participants and build the perfect teams.
                            Your dashboard is just a login away.
                        </p>
                    </div>

                    <div className="mt-8 text-xs text-slate-400">
                        <p>Secure organizer access • Cookie-based authentication • JWT under the hood</p>
                    </div>
                </div>

                {/* RIGHT SIDE – Login form */}
                <div className="p-6 md:p-8 flex flex-col justify-center bg-slate-950/60">
                    <div className="mb-6 md:mb-8 md:hidden">
                        <h1 className="text-2xl font-bold text-slate-50">Sign in</h1>
                        <p className="text-sm text-slate-300">
                            Log in to manage your hackathons.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200" htmlFor="email">
                                Email
                            </label>
                            <InputGroup>
                                <InputGroupInput
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={event => setEmail(event.target.value)}
                                    required
                                    className="bg-slate-900/70 border-slate-700 text-slate-50 placeholder:text-slate-500"
                                />
                                <InputGroupAddon className="bg-slate-900/80 border-slate-700 text-slate-400">
                                    <Mail className="h-4 w-4" />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200" htmlFor="password">
                                Password
                            </label>
                            <InputGroup>
                                <InputGroupInput
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={event => setPassword(event.target.value)}
                                    required
                                    className="bg-slate-900/70 border-slate-700 text-slate-50 placeholder:text-slate-500"
                                />
                                <InputGroupAddon className="bg-slate-900/80 border-slate-700 text-slate-400">
                                    <Lock className="h-4 w-4" />
                                </InputGroupAddon>
                            </InputGroup>
                        </div>

                        <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-slate-400">
                Don&apos;t have an account yet?
              </span>
                            {/* Replace with your real register navigation */}
                            <a href="/register" className="text-sky-400 hover:text-sky-300 hover:underline">
                                Register as organizer
                            </a>
                        </div>

                        <Button
                            type="submit"
                            className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-500/90 text-white font-medium"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                'Signing in…'
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    )
}
