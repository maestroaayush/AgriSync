import { useNavigate } from "react-router-dom";

function TestDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  console.log('TestDashboard rendered with user:', user);

  return (
    <div className="min-h-screen p-6 bg-blue-50">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-4">🎉 Dashboard Works!</h1>
          <p className="mb-4">Welcome, {user?.name}!</p>
          <p className="mb-4">Your role: {user?.role}</p>
          <p className="mb-6">If you can see this, the routing is working correctly.</p>
          
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestDashboard;
