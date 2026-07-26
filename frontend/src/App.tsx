import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import NewRunPage from '@/pages/NewRunPage'
import SimulatingPage from '@/pages/SimulatingPage'
import PersonaLabPage from '@/pages/PersonaLabPage'
import PersonasPage from '@/pages/PersonasPage'
import CastProfilePage from '@/pages/CastProfilePage'
import RunsPage from '@/pages/RunsPage'

function LegacyPersonaRedirect() {
  const { personaId } = useParams<{ personaId: string }>()
  return <Navigate to={`/personas/${personaId ?? ''}`} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/simulating" element={<SimulatingPage />} />

      <Route element={<AppShell />}>
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:runId" element={<DashboardPage />} />
        <Route path="/runs/:runId/listeners/:personaId" element={<PersonaLabPage />} />
        <Route path="/personas" element={<PersonasPage />} />
        <Route path="/personas/:handle" element={<CastProfilePage />} />
        <Route path="/dashboard" element={<Navigate to="/runs" replace />} />
        <Route path="/new" element={<NewRunPage />} />
        <Route path="/personas-legacy/:personaId" element={<LegacyPersonaRedirect />} />
      </Route>

      <Route path="*" element={<Navigate to="/runs" replace />} />
    </Routes>
  )
}
