import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import TournamentPage from './pages/TournamentPage'
import HistoryPage from './pages/HistoryPage'
import RulesPage from './pages/RulesPage'

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/history" element={<HistoryPage />} />
        {/* NOUVEAU : page règlement, dynamique selon les paramètres du tournoi */}
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/rules/:id" element={<RulesPage />} />
      </Routes>
    </>
  )
}
