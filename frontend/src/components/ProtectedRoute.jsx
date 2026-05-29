import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!authService.isLoggedIn()) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname + location.search)}`} state={{ from: location.pathname + location.search }} replace />;
  }
  return children;
}
