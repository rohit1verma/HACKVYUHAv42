import React, { createContext, useContext, useState, useEffect } from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  gender: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  joinedDate: Date;
} | null;

interface AuthContextType {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (userData: SignupData) => Promise<void>;
  logout: () => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  gender: string;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  age?: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('yogaflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Simulate API call
      // In a real application, this would be a fetch to your backend
      // For demo purposes, we'll simulate a successful login with mock data
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = {
        id: 'user123',
        name: 'Demo User',
        email,
        gender: 'female',
        experienceLevel: 'beginner' as const,
        joinedDate: new Date(),
      };
      
      setUser(mockUser);
      localStorage.setItem('yogaflow_user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (userData: SignupData) => {
    try {
      // Simulate API call
      // In a real application, this would be a fetch to your backend
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = {
        id: 'user123',
        name: userData.name,
        email: userData.email,
        gender: userData.gender,
        experienceLevel: userData.experienceLevel,
        joinedDate: new Date(),
      };
      
      setUser(mockUser);
      localStorage.setItem('yogaflow_user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('yogaflow_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};