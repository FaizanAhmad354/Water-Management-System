import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/LoginPage';
import AdminDashboard from './features/admin/AdminDashboard';
import CustomerDashboard from './features/customer/CustomerDashboard';
import DistributorDashboard from './features/distributor/DistributorDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default Landing to Login */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        
        {/* 1. Admin Master Dashboard */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* 2. Customer Portal */}
        <Route path="/customer" element={<CustomerDashboard />} />

        {/* 3. Distributor / Driver Hub */}
        <Route path="/distributor" element={<DistributorDashboard />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;