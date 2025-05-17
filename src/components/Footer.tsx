import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">YogaFlow AI</h3>
            <p className="text-gray-300 text-sm">
              An AI-powered yoga coaching application that provides real-time posture 
              correction and personalized feedback for safer home practice.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>
                <Link to="/" className="hover:text-primary-300">Home</Link>
              </li>
              <li>
                <Link to="/poses" className="hover:text-primary-300">Pose Library</Link>
              </li>
              <li>
                <Link to="/practice" className="hover:text-primary-300">Practice</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>Email: contact@yogaflow.ai</li>
              <li>Phone: (555) 123-4567</li>
              <li>Address: 123 Zen Street, Serenity City</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            &copy; 2025 YogaFlow AI. All rights reserved.
          </p>
          <div className="flex items-center mt-4 md:mt-0">
            <span className="text-sm text-gray-400 flex items-center">
              Made with <Heart size={14} className="text-red-500 mx-1" /> for yogis everywhere
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;