// DashboardRedirect.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function DashboardRedirect() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user || !user.role) {
      navigate("/login");
    } else {
      navigate(`/${user.role}/dashboard`);
    }
  }, []);

  return null;
}

export default DashboardRedirect;
