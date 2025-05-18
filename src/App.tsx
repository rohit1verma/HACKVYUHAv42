import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PoseProvider } from './contexts/PoseContext';
import { PracticeProvider } from './contexts/PracticeContext';

// Pages
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PoseLibrary from './pages/PoseLibrary';
import PoseDetail from './pages/PoseDetail';
import PracticeSession from './pages/PracticeSession';
import NotFound from './pages/NotFound';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<LandingPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="login" element={<LoginPage />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute isAuthenticated={isAuthenticated} />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="poses" element={<PoseLibrary />} />
          <Route path="pose/:poseId" element={<PoseDetail />} />
          <Route path="practice" element={<PoseLibrary />} />
          <Route path="practice/:poseId" element={<PracticeSession />} />
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <PoseProvider>
          <PracticeProvider>
            <AppContent />
          </PracticeProvider>
        </PoseProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;