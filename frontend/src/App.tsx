import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { UIProvider } from './context/UIContext'
import Login from './pages/Login'
import UpdatePassword from './pages/UpdatePassword'
import Layout from './components/Layout'

// Placeholder components
import TablesView from './pages/TablesView'
import KitchenView from './pages/KitchenView'

// Placeholder components
import AdminDashboard from './pages/AdminDashboard'
import StaffManagement from './pages/StaffManagement'
import MenuEditor from './pages/MenuEditor'
import FloorMapEditor from './pages/FloorMapEditor'

import OrdersView from './pages/OrdersView'
import CashRegisterView from './pages/CashRegisterView'
import ReservationsView from './pages/ReservationsView'


function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string[] }) {
  const { user, role, loading } = useAuth()

  if (loading) return <div className="flex h-screen items-center justify-center text-white">Loading...</div>
  if (!user) return <Navigate to="/login" />

  if (requiredRole && role && !requiredRole.includes(role)) {
    return <div className="p-8 text-white">Not authorized</div>
  }

  return children
}

function AppRoutes() {
  const { role } = useAuth()

  // Default redirect based on role
  const getDefaultRoute = () => {
    if (role === 'admin') return '/admin'
    if (role === 'kitchen') return '/kitchen'
    return '/tables'
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/update-password" element={<UpdatePassword />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to={getDefaultRoute()} replace />} />

        {/* Admin Routes */}
        <Route path="admin" element={
          <ProtectedRoute requiredRole={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="menu-editor" element={
          <ProtectedRoute requiredRole={['admin']}>
            <MenuEditor />
          </ProtectedRoute>
        } />
        <Route path="floor-map-editor" element={
          <ProtectedRoute requiredRole={['admin']}>
            <FloorMapEditor />
          </ProtectedRoute>
        } />
        <Route path="staff-management" element={
          <ProtectedRoute requiredRole={['admin']}>
            <StaffManagement />
          </ProtectedRoute>
        } />

        {/* Waiter/Admin Routes */}
        <Route path="tables" element={
          <ProtectedRoute requiredRole={['admin', 'waiter']}>
            <TablesView />
          </ProtectedRoute>
        } />
        <Route path="orders" element={
          <ProtectedRoute requiredRole={['admin', 'waiter']}>
            <OrdersView />
          </ProtectedRoute>
        } />
        <Route path="reservations" element={
          <ProtectedRoute requiredRole={['admin', 'waiter']}>
            <ReservationsView />
          </ProtectedRoute>
        } />
        <Route path="cash" element={
          <ProtectedRoute requiredRole={['admin', 'waiter']}>
            <CashRegisterView />
          </ProtectedRoute>
        } />

        {/* Kitchen/Admin Routes */}
        <Route path="kitchen" element={
          <ProtectedRoute requiredRole={['admin', 'kitchen']}>
            <KitchenView />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

import { ThemeProvider, CssBaseline } from '@mui/material'
import { theme } from './config/theme'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <Router>
              <AppRoutes />
            </Router>
          </AuthProvider>
        </ThemeProvider>
      </UIProvider>
    </QueryClientProvider>
  )
}

export default App
