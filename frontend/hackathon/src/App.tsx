import { Routes, Route } from 'react-router-dom'
import { HackathonProvider } from './contexts/HackathonContext'
import Navbar from './components/layout/Navbar'
import ParticipantsPage from './pages/ParticipantsPage'
import TeambuilderPage from './pages/TeambuilderPage'
import AuthPage from './pages/AuthPage'
import {AuthProvider} from "@/contexts/AuthContext.tsx";
import HackathonsPage from "@/pages/HackathonsPage.tsx";
import RegisterPage from "@/pages/RegisterPage.tsx";
import AdminHackathonsPage from "@/pages/AdminHackathonsPage.tsx";
import HackathonAdminDashboard from "@/pages/HackathonAdminDashboard.tsx";

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
                            <Route path="/admin" element={<AdminHackathonsPage />} />
                            <Route path="/login" element={<AuthPage />} />
                            <Route path="/register" element={<RegisterPage/>}/>
                            <Route path="/admin/hackathons/:id" element={<HackathonAdminDashboard />} />
                            {/* Protected-ish views (you can guard them later) */}
                            <Route path="/admin/hackathons/:id/participants" element={<ParticipantsPage />} />
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
