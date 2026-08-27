import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CreateGroup from './pages/CreateGroup.jsx'
import GroupDetail from './pages/GroupDetail.jsx'
import GroupSettings from './pages/GroupSettings.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Signed in — RequireAuth also supplies the app shell. */}
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/group/new" element={<RequireAuth><CreateGroup /></RequireAuth>} />
      <Route path="/group/:id" element={<RequireAuth><GroupDetail /></RequireAuth>} />
      <Route path="/group/:id/settings" element={<RequireAuth><GroupSettings /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
