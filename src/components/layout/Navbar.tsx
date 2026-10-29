import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Menu, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export const Navbar: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass border-b border-white/10 shadow-2xl' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:shadow-teal-500/50 transition-shadow">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-sora font-bold text-white text-lg tracking-tight">
            Wayn
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/addresses')}>
                Dashboard
              </Button>
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Sign In
              </Button>
              <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                Get Started
              </Button>
            </>
          )}
        </div>

        <button
          className="md:hidden text-slate-300 hover:text-white p-1"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden glass border-t border-white/10 px-6 py-4 flex flex-col gap-3"
        >
          {isAuthenticated ? (
            <>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => { navigate('/dashboard/addresses'); setMobileOpen(false); }}
              >
                Dashboard
              </Button>
              <Button variant="ghost" fullWidth onClick={handleLogout}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => { navigate('/login'); setMobileOpen(false); }}
              >
                Sign In
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => { navigate('/signup'); setMobileOpen(false); }}
              >
                Get Started
              </Button>
            </>
          )}
        </motion.div>
      )}
    </motion.nav>
  );
};
