import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/ProtectedRoute'
import { Toaster } from './toast'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import AccountantDashboard from './pages/AccountantDashboard'
import UserDashboard from './pages/UserDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RoleRoute allow={['Administrator']} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Dashboard />} />
          <Route path="/credit" element={<Dashboard />} />
          <Route path="/debit" element={<Dashboard />} />
          <Route path="/transactions" element={<Dashboard />} />
          <Route path="/reports" element={<Dashboard />} />
          <Route path="/chart-of-accounts" element={<Dashboard />} />
        </Route>

        <Route element={<RoleRoute allow={['Accountant']} />}>
          <Route path="/accountant/dashboard" element={<AccountantDashboard />} />
          <Route path="/accountant/customers" element={<AccountantDashboard />} />
          <Route path="/accountant/credit" element={<AccountantDashboard />} />
          <Route path="/accountant/debit" element={<AccountantDashboard />} />
          <Route path="/accountant/transactions" element={<AccountantDashboard />} />
          <Route path="/accountant/reports" element={<AccountantDashboard />} />
          <Route path="/accountant/chart-of-accounts" element={<AccountantDashboard />} />
        </Route>

        <Route element={<RoleRoute allow={['User']} />}>
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/user/transactions" element={<UserDashboard />} />
          <Route path="/user/reports" element={<UserDashboard />} />
          <Route path="/user/chart-of-accounts" element={<UserDashboard />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
