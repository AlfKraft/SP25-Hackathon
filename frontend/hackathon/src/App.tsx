import { Routes, Route } from 'react-router-dom'
import { HackathonProvider } from './contexts/HackathonContext'
import Navbar from './components/layout/Navbar'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'

function App() {
  return (
    <HackathonProvider>
      <div className="min-h-screen min-w-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
          </Routes>
        </div>
      </div>
    </HackathonProvider>
  )
}

export default App
