import { Navigate, HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Listings from './pages/Listings'
import MyActivity from './pages/MyActivity'
import Agents from './pages/Agents'
import CompanyInfo from './pages/CompanyInfo'
import AdminNewListing from './pages/AdminNewListing'
import AdminAgents from './pages/AdminAgents'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenMessage text="Loading..." />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useAuth()
  if (loading) return <FullScreenMessage text="Loading..." />
  if (!agent?.is_admin) return <Navigate to="/listings" replace />
  return <>{children}</>
}

function FullScreenMessage({ text }: { text: string }) {
  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--color-secondary)' }}>{text}</p>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/listings" replace />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/my-activity" element={<MyActivity />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/company" element={<CompanyInfo />} />
        <Route
          path="/admin/new-listing"
          element={
            <AdminOnly>
              <AdminNewListing />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/agents"
          element={
            <AdminOnly>
              <AdminAgents />
            </AdminOnly>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/listings" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  )
}
