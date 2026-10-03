import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/AppLayout';
import CustomerLayout from './components/CustomerLayout';
import { Loading } from './components/DataState';

// Cinematic Intro & Auth Page
import IntroPage from './pages/IntroPage';

// Customer Portal Pages
import ExploreFleet from './pages/customer/ExploreFleet';
import MyRentals from './pages/customer/MyRentals';
import CustomerProfile from './pages/customer/CustomerProfile';

// Admin / Staff Portal Pages
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Customers from './pages/Customers';
import Rentals from './pages/Rentals';
import Payments from './pages/Payments';
import Maintenance from './pages/Maintenance';
import Branches from './pages/Branches';
import Reports from './pages/Reports';

// Route Guard: Requires authenticated user with CUSTOMER role (or Admin)
function RequireCustomerAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Validating session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Route Guard: Requires authenticated user with ADMIN or STAFF role
function RequireStaffAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Validating operational credentials…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
    return <Navigate to="/fleet" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* 1. Cinematic Scroll-Driven Intro Experience & Entry Point */}
      <Route path="/" element={<IntroPage />} />
      <Route path="/intro" element={<IntroPage />} />
      <Route path="/login" element={<IntroPage />} />

      {/* 2. Customer Portal (Showroom, Self-Service Booking, Profile) */}
      <Route element={<CustomerLayout />}>
        <Route path="/fleet" element={<ExploreFleet />} />
        <Route path="/explore" element={<Navigate to="/fleet" replace />} />
        <Route
          path="/my-rentals"
          element={<RequireCustomerAuth><MyRentals /></RequireCustomerAuth>}
        />
        <Route
          path="/profile"
          element={<RequireCustomerAuth><CustomerProfile /></RequireCustomerAuth>}
        />
      </Route>

      {/* 3. Admin & Staff Operations Portal */}
      <Route
        path="/admin"
        element={<RequireStaffAuth><AppLayout /></RequireStaffAuth>}
      >
        <Route index element={<Dashboard />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="customers" element={<Customers />} />
        <Route path="rentals" element={<Rentals />} />
        <Route path="payments" element={<Payments />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="branches" element={<Branches />} />
        <Route path="reports" element={<Reports />} />
      </Route>

      {/* Legacy/Direct route shortcuts */}
      <Route path="/vehicles" element={<Navigate to="/admin/vehicles" replace />} />
      <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />
      <Route path="/rentals" element={<Navigate to="/admin/rentals" replace />} />
      <Route path="/payments" element={<Navigate to="/admin/payments" replace />} />
      <Route path="/maintenance" element={<Navigate to="/admin/maintenance" replace />} />
      <Route path="/branches" element={<Navigate to="/admin/branches" replace />} />
      <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/fleet" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
