import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-primary-500 text-2xl font-display font-bold">YogaFlow AI</span>
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex md:items-center md:space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 text-sm font-medium ${
                    isActive('/dashboard')
                      ? 'text-primary-500 border-b-2 border-primary-500'
                      : 'text-gray-700 hover:text-primary-500'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/poses"
                  className={`px-3 py-2 text-sm font-medium ${
                    isActive('/poses')
                      ? 'text-primary-500 border-b-2 border-primary-500'
                      : 'text-gray-700 hover:text-primary-500'
                  }`}
                >
                  Pose Library
                </Link>
                <Link
                  to="/practice"
                  className={`px-3 py-2 text-sm font-medium ${
                    isActive('/practice')
                      ? 'text-primary-500 border-b-2 border-primary-500'
                      : 'text-gray-700 hover:text-primary-500'
                  }`}
                >
                  Practice
                </Link>
                <div className="ml-3 relative">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">
                      {user?.name}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="inline-flex items-center justify-center p-2 rounded-full text-gray-600 hover:text-primary-500 focus:outline-none"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-500"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-md shadow-sm hover:bg-primary-600 focus:outline-none"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-500 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className={`block px-3 py-2 text-base font-medium ${
                    isActive('/dashboard')
                      ? 'text-primary-500 border-l-4 border-primary-500 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/poses"
                  className={`block px-3 py-2 text-base font-medium ${
                    isActive('/poses')
                      ? 'text-primary-500 border-l-4 border-primary-500 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Pose Library
                </Link>
                <Link
                  to="/practice"
                  className={`block w-full text-left px-3 py-2 text-base font-medium ${
                    isActive('/practice')
                      ? 'text-primary-500 border-l-4 border-primary-500 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-500 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Practice
                </Link>
                <div className="mt-3 px-3 py-3 border-t border-gray-200">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <User size={24} className="text-gray-500" />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-gray-800">
                        {user?.name}
                      </div>
                      <div className="text-sm font-medium text-gray-500">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-500 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-500 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-500 hover:bg-gray-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;