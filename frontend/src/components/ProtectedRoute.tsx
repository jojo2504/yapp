import { Navigate, Outlet } from 'react-router-dom';
import { LS } from '../constants/storage';

function getRole(): string {
  try {
    const raw = localStorage.getItem(LS.USER);
    if (raw) return (JSON.parse(raw) as { role?: string }).role ?? '';
  } catch { /* ignore */ }
  return '';
}

/** Redirects to /login if no token is present. */
export default function ProtectedRoute() {
  const isAuthenticated = Boolean(localStorage.getItem(LS.TOKEN));
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * Restricts a subtree to a specific role.
 * If the user is authenticated but has the wrong role, redirects them to their
 * own home page instead of showing a blank screen or an error.
 */
export function RoleGuard({ role }: { role: 'admin' | 'teacher' }) {
  const userRole = getRole();
  if (userRole === role) return <Outlet />;
  if (userRole === 'admin')   return <Navigate to="/admin/dashboard"   replace />;
  if (userRole === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}
