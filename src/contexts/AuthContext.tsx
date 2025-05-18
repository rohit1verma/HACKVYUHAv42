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
}

// Create a default test user
const defaultUser = {
  id: 'test-user-123',
  name: 'Test User',
  email: 'test@example.com',
  gender: 'not-specified',
  experienceLevel: 'intermediate' as const,
  joinedDate: new Date(),
};

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
  const [user, setUser] = useState<User>(defaultUser); // Set default user
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('yogaflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // If no stored user, use default user
      setUser(defaultUser);
      localStorage.setItem('yogaflow_user', JSON.stringify(defaultUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // Simulate API call with network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = {
        ...defaultUser,
        email,
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
      // Simulate API call with network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = {
        ...defaultUser,
        name: userData.name,
        email: userData.email,
        gender: userData.gender,
        experienceLevel: userData.experienceLevel,
      };
      
      setUser(mockUser);
      localStorage.setItem('yogaflow_user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(defaultUser); // Set back to default user instead of null
    localStorage.setItem('yogaflow_user', JSON.stringify(defaultUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true, // Always authenticated with default user
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