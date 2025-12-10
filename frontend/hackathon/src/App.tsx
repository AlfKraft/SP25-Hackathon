import { Routes, Route } from 'react-router-dom'
import { HackathonProvider } from './contexts/HackathonContext'
import Navbar from './components/layout/Navbar'
import ParticipantsPage from './pages/ParticipantsPage'
import TeambuilderPage from './pages/TeambuilderPage'
import AuthPage from './pages/AuthPage'
import {AuthProvider} from "@/contexts/AuthContext.tsx";
import HackathonsPage from "@/pages/HackathonsPage.tsx";

function App() {
    return (
        <AuthProvider>
        <HackathonProvider>
            {/* Global background & layout */}
            <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-slate-50">
                <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col gap-6">
                    <Navbar />
                    <main className="flex-1">
                        <Routes>
                            {/* Auth / login page */}
                            <Route path="/" element={<HackathonsPage />} />
                            <Route path="/login" element={<AuthPage />} />

                            {/* Protected-ish views (you can guard them later) */}
                            <Route path="/participants" element={<ParticipantsPage />} />
                            <Route path="/team-builder" element={<TeambuilderPage />} />
                        </Routes>
                    </main>
                </div>
            </div>
        </HackathonProvider>
        </AuthProvider>
    )
}

export default App
