import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole = 'admin' }) => {
  const userStr = localStorage.getItem('tetris:user');
  
  if (!userStr) {
    // Chưa đăng nhập -> Redirect về trang chủ
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    if (requiredRole && user.role !== requiredRole) {
      // Không đủ quyền -> Redirect về trang chủ
      return <Navigate to="/" replace />;
    }

    // Có quyền -> Cho phép truy cập
    return <>{children}</>;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return <Navigate to="/" replace />;
  }
};

export default ProtectedRoute;
