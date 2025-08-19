import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, MapPin, Navigation2 } from "lucide-react";
import Modal from "../components/Modal";
import Login from "./Login";
import Register from "./Register";


function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt'); // 'granted', 'denied', 'prompt'

  useEffect(() => {
    document.title = "AgriSync – Smart Agriculture Supply Chain";
    
    // Check if we have a success message from OAuth callback
    if (location.state?.successMessage) {
      setSuccessData(location.state);
      setShowSuccessMessage(true);
      
      // Clear the location state to prevent showing message on refresh
      navigate(location.pathname, { replace: true, state: null });
      
      // Auto-hide success message after 10 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 10000);
    }
  }, [location.state, navigate, location.pathname]);

  // Request location permission and get user's location
  const requestLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    try {
      setLocationPermission('requesting');
      
      // Request permission and get location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        });
      });

      const { latitude, longitude } = position.coords;
      setUserLocation({ latitude, longitude });
      setLocationPermission('granted');
      
      // Store location in localStorage for later use
      localStorage.setItem('userLocation', JSON.stringify({ latitude, longitude }));
      
    } catch (error) {
      console.error('Error getting location:', error);
      setLocationPermission('denied');
      
      if (error.code === error.PERMISSION_DENIED) {
        alert('Location access denied. You can manually set your location in settings.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        alert('Location information is unavailable.');
      } else if (error.code === error.TIMEOUT) {
        alert('Location request timed out.');
      }
    }
  };

  // Check for existing location permission on component mount
  useEffect(() => {
    const checkLocationPermission = async () => {
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setLocationPermission(result.state);
        
        if (result.state === 'granted') {
          // Try to get cached location
          const cachedLocation = localStorage.getItem('userLocation');
          if (cachedLocation) {
            setUserLocation(JSON.parse(cachedLocation));
          }
        }
      }
    };
    
    checkLocationPermission();
  }, []);

  // Listen for custom event from Navigation component
  useEffect(() => {
    const handleOpenModal = () => {
      setActiveTab("login");
      setShowModal(true);
    };

    window.addEventListener('openAuthModal', handleOpenModal);
    return () => window.removeEventListener('openAuthModal', handleOpenModal);
  }, []);

  // Handle URL hash fragments for smooth scrolling
  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    };

    // Handle initial load with hash
    handleHashScroll();

    // Handle hash changes
    window.addEventListener('hashchange', handleHashScroll);
    
    return () => window.removeEventListener('hashchange', handleHashScroll);
  }, []);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 text-green-900 relative overflow-hidden">
      {/* Environmental Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating leaf patterns */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-green-200/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-20 w-32 h-32 bg-emerald-200/15 rounded-full blur-2xl animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-20 left-32 w-24 h-24 bg-teal-200/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-10 w-16 h-16 bg-lime-200/25 rounded-full blur-lg animate-bounce" style={{ animationDuration: '4s', animationDelay: '2s' }}></div>
        
        {/* Nature-inspired geometric patterns */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-green-400/30 rotate-45 animate-spin" style={{ animationDuration: '20s' }}></div>
        <div className="absolute bottom-1/3 right-1/3 w-3 h-3 bg-emerald-400/25 rotate-12 animate-spin" style={{ animationDuration: '25s', animationDirection: 'reverse' }}></div>
        <div className="absolute top-2/3 left-1/6 w-1 h-1 bg-teal-400/40 animate-pulse"></div>
      </div>

      {/* Success Message Notification */}
      {showSuccessMessage && successData && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-green-50/95 backdrop-blur-sm border border-green-200 rounded-lg p-4 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {successData.pendingApproval ? (
                  <Clock className="h-6 w-6 text-orange-500" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 mb-1">
                  {successData.pendingApproval ? 'Account Created - Pending Approval' : 'Success!'}
                </h3>
                <p className="text-sm text-green-700 mb-2">
                  {successData.successMessage}
                </p>
                {successData.userInfo && (
                  <div className="text-xs text-green-600 bg-green-100/80 rounded px-2 py-1 inline-block">
                    Email: {successData.userInfo.email} | Role: {successData.userInfo.role}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="flex-shrink-0 text-green-500 hover:text-green-700 text-lg font-bold"
              >
                ×
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* Hero Section - Made significantly larger */}
      <section className="relative min-h-[85vh] md:min-h-[90vh] flex items-center justify-center overflow-hidden">
        {/* Enhanced Nature Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-400/10 via-emerald-300/5 to-teal-400/10"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-110 opacity-80"
          style={{ 
            backgroundImage: "url('/images/farm-hero.jpg')",
            filter: 'brightness(1.1) contrast(1.05) saturate(1.2)'
          }}
          onError={(e) => {
            e.target.style.backgroundImage = "linear-gradient(135deg, #065f46 0%, #10b981 50%, #059669 100%)";
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 via-transparent to-emerald-900/10"></div>
        
        {/* Content */}
        <div className="relative z-10 bg-white/90 backdrop-blur-sm p-6 md:p-10 lg:p-12 rounded-2xl shadow-2xl max-w-4xl mx-4 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Empowering Farmers with Smart Supply Chain Solutions
          </h1>
          <p className="text-lg md:text-xl mb-6">
            Streamline your agricultural operations from field to market with real-time insights and digital tools.
          </p>
          <button
            onClick={() => {
              setActiveTab("login"); // Always start with login
              setShowModal(true);
            }}
            className="bg-green-600 text-white px-6 py-3 rounded-xl text-lg flex items-center mx-auto hover:bg-green-700"
          >
            Get Started <ArrowRight className="ml-2 h-5 w-5" />
          </button>

<Modal isOpen={showModal} onClose={() => setShowModal(false)}>
  {activeTab === "login" ? (
    <Login 
      onClose={() => setShowModal(false)} 
      onSwitchToRegister={() => setActiveTab("register")} 
    />
  ) : (
    <Register 
      embed 
      onClose={() => setShowModal(false)} 
      onSwitchToLogin={() => setActiveTab("login")}
    />
  )}
</Modal>
        </div>
      </section>

      {/* Solutions Overview - Enhanced Environment-Friendly Design */}
      <section id="features" className="py-20 px-6 md:px-12 bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 relative overflow-hidden">
        {/* Background nature elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-10 left-1/4 w-40 h-40 bg-green-300/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-1/4 w-32 h-32 bg-emerald-300/10 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-10 w-24 h-24 bg-teal-300/10 rounded-full blur-xl"></div>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-green-800">🌱 AgriSync Solutions</h2>
          <p className="text-center text-green-600 mb-12 max-w-2xl mx-auto">Sustainable technology for a greener agricultural future</p>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { title: "🌾 Crop Tracking", icon: "🌾", color: "from-green-100 to-emerald-100" },
              { title: "🏪 Market Integration", icon: "🏪", color: "from-emerald-100 to-teal-100" },
              { title: "🚛 Logistics Optimization", icon: "🚛", color: "from-teal-100 to-green-100" }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.2 }}
              >
                <div className={`rounded-2xl shadow-lg hover:shadow-xl bg-gradient-to-br ${item.color} p-8 text-center border border-green-200/50 backdrop-blur-sm transform hover:scale-105 transition-all duration-300`}>
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-4 text-green-800">{item.title}</h3>
                  <p className="text-sm text-green-700 leading-relaxed">
                    {item.title.includes("Crop Tracking") &&
                      "🔍 Monitor crop conditions, growth cycles, and yield forecasts with smart dashboards. Embrace precision agriculture for sustainable farming."}
                    {item.title.includes("Market Integration") &&
                      "🤝 Connect with local markets and suppliers to optimize demand-based planning. Support local communities and reduce carbon footprint."}
                    {item.title.includes("Logistics Optimization") &&
                      "📍 Automate transportation and inventory with GPS and sensor-enabled logistics. Minimize waste and optimize delivery routes for eco-efficiency."}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA - Enhanced Environment-Friendly Design */}
      <section id="contact" className="bg-gradient-to-br from-green-700 via-emerald-800 to-teal-900 text-white py-20 px-6 text-center relative overflow-hidden">
        {/* Environmental background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDVMMTUgMTVIMjVMMjAgNVoiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4K')] bg-repeat"></div>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">🌍 Ready to Transform Agriculture?</h2>
          <p className="mb-8 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            🌱 Join us in creating a sustainable agricultural ecosystem. Contact our team today and discover how AgriSync can help digitize your operations while protecting our planet.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="mailto:support@agrisync.io"
              className="inline-flex items-center bg-white text-green-800 text-lg px-8 py-4 rounded-xl hover:bg-green-50 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              📧 Contact Us
            </a>
            <div className="flex items-center text-green-100 text-sm">
              <span className="mr-2">🌿</span>
              <span>Committed to sustainable farming practices</span>
            </div>
          </div>
        </div>
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