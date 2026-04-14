import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProtectedRouteProps {
  element: React.ReactNode;
  allowedRoles?: string[];
}

const RouteLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center">
    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRoles }) => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return <RouteLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{element}</>;
};

export default ProtectedRoute;
