import { Navigate, HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Listings from './pages/Listings'
import Overview from './pages/Overview'
import MyActivity from './pages/MyActivity'
import Agents from './pages/Agents'
import CompanyInfo from './pages/CompanyInfo'
import AdminNewListing from './pages/AdminNewListing'
import AdminCondoProject from './pages/AdminCondoProject'
import AdminCondoDevelopment from './pages/AdminCondoDevelopment'
import AdminMarkup from './pages/AdminMarkup'
import AdminCondoType from './pages/AdminCondoType'
import AdminAgents from './pages/AdminAgents'
import MarketingMaterial from './pages/MarketingMaterial'
import Chat from './pages/Chat'
import SocialCalendar from './pages/SocialCalendar'
import SocialBlock from './pages/SocialBlock'
import SocialShotlist from './pages/SocialShotlist'
import SocialSettings from './pages/SocialSettings'

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

// Marketing material and requests are visible to admins and to the Marketing role.
function MarketingOnly({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useAuth()
  if (loading) return <FullScreenMessage text="Loading..." />
  if (!agent?.is_admin && agent?.role !== 'Marketing') return <Navigate to="/listings" replace />
  return <>{children}</>
}

// The social media calendar is only for the social media team (editors) and its viewers.
function SocialOnly({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useAuth()
  if (loading) return <FullScreenMessage text="Loading..." />
  if (agent?.social_role !== 'editor' && agent?.social_role !== 'viewer') return <Navigate to="/listings" replace />
  return <>{children}</>
}

function SocialHeadAdminOnly({ children }: { children: React.ReactNode }) {
  const { agent, loading } = useAuth()
  if (loading) return <FullScreenMessage text="Loading..." />
  if (!agent?.is_head_admin || !agent?.social_role) return <Navigate to="/social" replace />
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
        <Route path="/overview" element={<Overview />} />
        <Route path="/listings" element={<Listings />} />
        <Route path="/my-activity" element={<MyActivity />} />
        <Route path="/agents" element={<Agents />} />
        <Route path="/company" element={<CompanyInfo />} />
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/admin/new-listing"
          element={
            <AdminOnly>
              <AdminNewListing />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/edit-listing/:id"
          element={
            <AdminOnly>
              <AdminNewListing />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/condo/:id"
          element={
            <AdminOnly>
              <AdminCondoProject />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/development/:id"
          element={
            <AdminOnly>
              <AdminCondoDevelopment />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/markup"
          element={
            <AdminOnly>
              <AdminMarkup />
            </AdminOnly>
          }
        />
        <Route
          path="/admin/condo/:id/type/:type"
          element={
            <AdminOnly>
              <AdminCondoType />
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
        <Route
          path="/marketing-material"
          element={
            <MarketingOnly>
              <MarketingMaterial />
            </MarketingOnly>
          }
        />
        <Route
          path="/social"
          element={
            <SocialOnly>
              <SocialCalendar />
            </SocialOnly>
          }
        />
        <Route
          path="/social/block/:start"
          element={
            <SocialOnly>
              <SocialBlock />
            </SocialOnly>
          }
        />
        <Route
          path="/social/block/:start/shotlist"
          element={
            <SocialOnly>
              <SocialShotlist />
            </SocialOnly>
          }
        />
        <Route
          path="/social/settings"
          element={
            <SocialHeadAdminOnly>
              <SocialSettings />
            </SocialHeadAdminOnly>
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
