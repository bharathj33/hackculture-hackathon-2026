import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { getToken } from '@/api'
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

/**
 * Send unauthenticated visitors to /login instead of rendering the shell.
 *
 * Without this, a signed-out visitor landed on /runs and saw the full app chrome
 * plus "No runs yet — start your first analysis", which reads as an empty account
 * rather than a login prompt. `from` is the path LoginPage returns to after sign-in.
 */
function RequireAuth() {
  const location = useLocation()
  if (!getToken()) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
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
      </Route>

      <Route path="*" element={<Navigate to="/runs" replace />} />
    </Routes>
  )
}
