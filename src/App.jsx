import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import TournamentPage from './pages/TournamentPage'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </>
  )
}
