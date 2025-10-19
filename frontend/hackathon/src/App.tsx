import { Routes, Route } from 'react-router-dom'
import { HackathonProvider } from './contexts/HackathonContext'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import ParticipantsPage from './pages/ParticipantsPage'
import TeambuilderPage from './pages/TeambuilderPage'

function App() {
  return (
    <HackathonProvider>
      <div className="min-h-screen min-w-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/participants" element={<ParticipantsPage />} />
            <Route path="/team-builder" element={<TeambuilderPage />} />
          </Routes>
        </div>
      </div>
    </HackathonProvider>
  )
}

export default App
