import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Modal from "../components/Modal";
import Login from "./Login";
import Register from "./Register";


function Home() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
const [activeTab, setActiveTab] = useState("login");

  useEffect(() => {
    document.title = "AgriSync – Smart Agriculture Supply Chain";
  }, []);

  return (
    <div className="w-full min-h-screen bg-white text-green-900">
      {/* Hero Section */}
      <section className="bg-[url('/images/farm-hero.jpg')] bg-cover bg-center min-h-[90vh] flex items-center justify-center">
        <div className="bg-white/80 p-6 md:p-12 rounded-2xl shadow-xl max-w-3xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Empowering Farmers with Smart Supply Chain Solutions
          </h1>
          <p className="text-lg md:text-xl mb-6">
            Streamline your agricultural operations from field to market with real-time insights and digital tools.
          </p>
          <button
  onClick={() => setShowModal(true)}
  className="bg-green-600 text-white px-6 py-3 rounded-xl text-lg flex items-center mx-auto hover:bg-green-700"
>
  Get Started <ArrowRight className="ml-2 h-5 w-5" />
</button>

<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  <div className="mb-4 flex justify-center gap-4 text-lg font-semibold">
    <button
      onClick={() => setActiveTab("login")}
      className={`py-1 px-4 border-b-2 ${activeTab === "login" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`}
    >
      Login
    </button>
    <button
      onClick={() => setActiveTab("register")}
      className={`py-1 px-4 border-b-2 ${activeTab === "register" ? "border-green-600 text-green-700" : "border-transparent text-gray-500"}`}
    >
      Register
    </button>
  </div>
  {activeTab === "login" ? <Login embed onClose={() => setShowModal(false)} /> : <Register embed onClose={() => setShowModal(false)} />}
</Modal>
        </div>
      </section>

      {/* Solutions Overview */}
      <section className="py-20 px-6 md:px-12 bg-green-50">
        <h2 className="text-3xl font-bold text-center mb-12">AgriSync Solutions</h2>
        <div className="grid gap-8 md:grid-cols-3">
          {["Crop Tracking", "Market Integration", "Logistics Optimization"].map((title, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="rounded-2xl shadow-md hover:shadow-lg bg-white p-6 text-center">
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                <p className="text-sm text-gray-700">
                  {title === "Crop Tracking" &&
                    "Monitor crop conditions, growth cycles, and yield forecasts with smart dashboards."}
                  {title === "Market Integration" &&
                    "Connect with local markets and suppliers to optimize demand-based planning."}
                  {title === "Logistics Optimization" &&
                    "Automate transportation and inventory with GPS and sensor-enabled logistics."}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="bg-gradient-to-br from-green-700 to-green-900 text-white py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Transform Agriculture?</h2>
        <p className="mb-6 text-lg">
          Contact our team today and learn how AgriSync can help digitize your agricultural ecosystem.
        </p>
        <a
          href="mailto:support@agrisync.io"
          className="inline-block bg-white text-green-800 text-lg px-6 py-3 rounded-xl hover:bg-green-100"
        >
          Contact Us
        </a>
      </section>
    </div>
  );
}

export default Home;


/*
function Home() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center p-8 max-w-xl">
        <h1 className="text-5xl font-extrabold text-green-700 mb-4">AgriSync</h1>
        <p className="text-lg text-gray-700 mb-6">
          A smart agricultural supply chain platform connecting farmers, warehouse managers,
          transporters, vendors, and admins in real-time.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/login" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Login
          </Link>
          <Link to="/register" className="px-6 py-2 bg-white border border-green-600 text-green-700 rounded hover:bg-green-100">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;
*/