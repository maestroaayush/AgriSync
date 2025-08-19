import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Features', path: '/', scrollTo: 'features' },
    { name: 'Contact', path: '/', scrollTo: 'contact' }
  ];

  const isActivePath = (item) => {
    // Only show active state for actual page navigation, not scroll sections
    if (item.scrollTo) {
      return false; // Features and Contact are sections, not separate pages
    }
    if (item.path === '/' && location.pathname === '/') return true;
    if (item.path !== '/' && location.pathname.startsWith(item.path)) return true;
    return false;
  };

  const handleNavClick = (item) => {
    setIsMenuOpen(false);
    
    // Handle scrolling to sections
    if (item.scrollTo) {
      if (location.pathname === '/') {
        // Already on home page, just scroll
        setTimeout(() => {
          const element = document.getElementById(item.scrollTo);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        // Navigate to home page first, then scroll
        // Use window location to navigate and then scroll
        window.location.href = `/#${item.scrollTo}`;
      }
    }
  };

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50 border-b border-green-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-2xl font-bold text-green-700 hover:text-green-800 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-700 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span>AgriSync</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => handleNavClick(item)}
                className={`text-sm font-medium transition-colors relative ${
                  isActivePath(item)
                    ? 'text-green-700'
                    : 'text-gray-600 hover:text-green-700'
                }`}
              >
                {item.name}
                {isActivePath(item) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-green-700 rounded-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Login Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/"
              onClick={() => {
                // This will trigger the modal in Home component
                const event = new CustomEvent('openAuthModal');
                window.dispatchEvent(event);
              }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <User className="h-4 w-4" />
              <span>Login</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-gray-600 hover:text-green-700 hover:bg-green-50 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-t border-green-100"
          >
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => handleNavClick(item)}
                  className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActivePath(item)
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-2 border-t border-green-100">
                <Link
                  to="/"
                  onClick={() => {
                    handleNavClick();
                    const event = new CustomEvent('openAuthModal');
                    window.dispatchEvent(event);
                  }}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <User className="h-4 w-4" />
                  <span>Login</span>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navigation;
