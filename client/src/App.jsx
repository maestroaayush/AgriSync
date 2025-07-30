import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './routes/PrivateRoute';
import FarmerDashboard from './pages/dashboards/FarmerDashboard';
import TransporterDashboard from './pages/dashboards/TransporterDashboard';
import WarehouseDashboard from './pages/dashboards/WarehouseDashboard';
import VendorDashboard from './pages/dashboards/VendorDashboard';
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DashboardRedirect from './components/DashboardRedirect'; // 👈

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
    </Router>
  );
}

export default App;
