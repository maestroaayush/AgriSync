// DashboardRedirect.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function DashboardRedirect() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    console.log('User data:', user);
    if (!user || !user.role) {
      console.warn('Redirecting to login: No user data');
      navigate("/login");
    } else {
      console.info(`Navigating to ${user.role} dashboard`);
      navigate(`/${user.role}/dashboard`);
    }
  }, [navigate]);

  return null;
}

export default DashboardRedirect;
