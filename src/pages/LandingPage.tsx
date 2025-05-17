import React from 'react';
import { Link } from 'react-router-dom';
import { Check, Activity, Award, Camera } from 'lucide-react';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary-500 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold font-display tracking-tight mb-4">
                Perfect Your Yoga Practice with AI
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-100">
                Real-time pose correction and personalized guidance for your yoga journey.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/signup"
                  className="px-8 py-3 bg-white text-primary-600 font-medium rounded-lg shadow-lg hover:bg-gray-100 transition-colors text-center"
                >
                  Start Free Trial
                </Link>
                <Link
                  to="/poses"
                  className="px-8 py-3 bg-transparent border-2 border-white text-white font-medium rounded-lg hover:bg-white/10 transition-colors text-center"
                >
                  Explore Poses
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center"
            >
              <img
                src="https://www.pngplay.com/wp-content/uploads/8/Yoga-No-Background.png"
                alt="Woman in yoga pose with AI guidance"
                className="rounded-xl shadow-2xl max-h-[500px] object-cover"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How YogaFlow AI Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our AI-powered platform helps you practice yoga safely and effectively from the comfort of your home.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gray-50 p-6 rounded-lg shadow-md"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="text-primary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Real-Time Detection</h3>
              <p className="text-gray-600">
                Our AI analyzes your poses in real-time through your device's camera to provide instant feedback.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gray-50 p-6 rounded-lg shadow-md"
            >
              <div className="w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
                <Check className="text-secondary-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Personalized Feedback</h3>
              <p className="text-gray-600">
                Receive customized guidance based on your body's alignment and unique challenges.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gray-50 p-6 rounded-lg shadow-md"
            >
              <div className="w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mb-4">
                <Activity className="text-accent-600" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
              <p className="text-gray-600">
                Track your improvement over time with detailed analytics and visual progress reports.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -5 }}
              className="bg-gray-50 p-6 rounded-lg shadow-md"
            >
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mb-4">
                <Award className="text-success" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-2">Guided Journeys</h3>
              <p className="text-gray-600">
                Follow personalized yoga sequences designed to match your experience level and goals.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-primary-500 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-12 sm:px-12 sm:py-16 lg:flex lg:items-center lg:p-20">
              <div className="lg:w-0 lg:flex-1">
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Ready to transform your yoga practice?
                </h2>
                <p className="mt-4 max-w-3xl text-lg text-indigo-100">
                  Join thousands of yogis who have improved their practice with YogaFlow AI.
                  Start your free 14-day trial today.
                </p>
              </div>
              <div className="mt-12 sm:w-full sm:max-w-md lg:mt-0 lg:ml-8 lg:flex-1">
                <Link
                  to="/signup"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Sign Up Now
                </Link>
                <p className="mt-3 text-sm text-indigo-100 text-center">
                  No credit card required. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;