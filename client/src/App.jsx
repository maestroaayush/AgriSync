import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import AuthCallback from './pages/AuthCallback';
import CompleteProfile from './pages/CompleteProfile';
import Navigation from './components/Navigation';
import PrivateRoute from './routes/PrivateRoute';
import FarmerDashboard from './pages/dashboards/FarmerDashboard';
import TestDashboard from './pages/dashboards/TestDashboard';
import TransporterDashboard from './pages/dashboards/TransporterDashboard';
import WarehouseDashboard from './pages/dashboards/WarehouseDashboard';
import VendorDashboard from './pages/dashboards/VendorDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DashboardRedirect from './components/DashboardRedirect'; // 👈

// Layout component to conditionally show navigation
const Layout = ({ children }) => {
  const location = useLocation();
  
  // Don't show navigation on dashboard routes or auth pages
  const hideNavigation = location.pathname.includes('/dashboard') || 
                        location.pathname.includes('/auth/') ||
                        location.pathname.includes('/complete-profile');
  
  return (
    <>
      {!hideNavigation && <Navigation />}
      {children}
    </>
  );
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/dashboard" element={<DashboardRedirect />} /> {/* 👈 new route */}

        <Route element={<PrivateRoute role="farmer" />}>
          <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
        </Route>

        <Route element={<PrivateRoute role="transporter" />}>
          <Route path="/transporter/dashboard" element={<TransporterDashboard />} />
        </Route>

        <Route element={<PrivateRoute role="warehouse_manager" />}>
          <Route path="/warehouse_manager/dashboard" element={<WarehouseDashboard />} />
        </Route>

        <Route element={<PrivateRoute role="market_vendor" />}>
          <Route path="/market_vendor/dashboard" element={<VendorDashboard />} />
        </Route>

        <Route element={<PrivateRoute role="admin" />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
