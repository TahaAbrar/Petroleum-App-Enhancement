import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Dashboard />} />
          <Route path="/credit" element={<Dashboard />} />
          <Route path="/debit" element={<Dashboard />} />
          <Route path="/transactions" element={<Dashboard />} />
          <Route path="/reports" element={<Dashboard />} />
          <Route path="/settings" element={<Dashboard />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
