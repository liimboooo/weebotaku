import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  if (!authService.isLoggedIn()) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }
  return children;
}
