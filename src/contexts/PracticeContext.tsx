import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface PracticeSession {
  poseId: string;
  startTime: number;
  endTime?: number;
  accuracyHistory: number[];
  averageAccuracy: number;
  duration: number;
}

interface DailyProgress {
  date: string;
  sessions: PracticeSession[];
  totalMinutes: number;
  averageAccuracy: number;
}

interface PracticeContextType {
  sessions: PracticeSession[];
  dailyProgress: { [date: string]: DailyProgress };
  currentSession: PracticeSession | null;
  sessionHistory: PracticeSession[];
  startSession: (poseId: string) => void;
  endSession: (finalAccuracy: number) => void;
  updateSessionAccuracy: (accuracy: number) => void;
  getDailyStats: (days: number) => {
    dates: string[];
    accuracies: number[];
    minutes: number[];
  };
  getTotalStats: () => {
    totalSessions: number;
    totalMinutes: number;
    averageAccuracy: number;
  };
}

const PracticeContext = createContext<PracticeContextType | undefined>(undefined);

export const PracticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [dailyProgress, setDailyProgress] = useState<{ [date: string]: DailyProgress }>({});
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [sessionHistory, setSessionHistory] = useState<PracticeSession[]>([]);

  // Load saved data from localStorage when component mounts
  useEffect(() => {
    if (user) {
      const savedSessions = localStorage.getItem(`yoga-sessions-${user.id}`);
      const savedProgress = localStorage.getItem(`yoga-progress-${user.id}`);
      
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
      if (savedProgress) {
        setDailyProgress(JSON.parse(savedProgress));
      }
    }
  }, [user]);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`yoga-sessions-${user.id}`, JSON.stringify(sessions));
      localStorage.setItem(`yoga-progress-${user.id}`, JSON.stringify(dailyProgress));
    }
  }, [sessions, dailyProgress, user]);

  // Update daily progress when sessions change
  useEffect(() => {
    if (!user) return;

    const newDailyProgress: { [date: string]: DailyProgress } = {};
    
    sessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      
      if (!newDailyProgress[date]) {
        newDailyProgress[date] = {
          date,
          sessions: [],
          totalMinutes: 0,
          averageAccuracy: 0
        };
      }
      
      newDailyProgress[date].sessions.push(session);
      newDailyProgress[date].totalMinutes += session.duration;
      
      const totalAccuracy = newDailyProgress[date].sessions.reduce(
        (sum, s) => sum + s.averageAccuracy,
        0
      );
      newDailyProgress[date].averageAccuracy = totalAccuracy / newDailyProgress[date].sessions.length;
    });

    setDailyProgress(newDailyProgress);
  }, [sessions, user]);

  const startSession = useCallback((poseId: string) => {
    const newSession: PracticeSession = {
      poseId,
      startTime: Date.now(),
      accuracyHistory: [],
      averageAccuracy: 0,
      duration: 0
    };
    setCurrentSession(newSession);
  }, []);

  const updateSessionAccuracy = useCallback((accuracy: number) => {
    setCurrentSession(prev => {
      if (!prev) return null;

      const newHistory = [...prev.accuracyHistory, accuracy];
      const newAverage = newHistory.reduce((a, b) => a + b, 0) / newHistory.length;
      const duration = (Date.now() - prev.startTime) / 1000 / 60; // Convert to minutes

      return {
        ...prev,
        accuracyHistory: newHistory,
        averageAccuracy: newAverage,
        duration
      };
    });
  }, []);

  const endSession = useCallback((finalAccuracy: number) => {
    setCurrentSession(prev => {
      if (!prev) return null;

      const endTime = Date.now();
      const duration = (endTime - prev.startTime) / 1000 / 60; // Convert to minutes

      const endedSession: PracticeSession = {
        ...prev,
        endTime,
        accuracyHistory: [...prev.accuracyHistory, finalAccuracy],
        averageAccuracy: (prev.averageAccuracy + finalAccuracy) / 2,
        duration
      };

      setSessions(prevSessions => [...prevSessions, endedSession]);
      setSessionHistory(history => [...history, endedSession]);
      return null;
    });
  }, []);

  const getDailyStats = useCallback((days: number) => {
    const dates: string[] = [];
    const accuracies: number[] = [];
    const minutes: number[] = [];

    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dates.unshift(date.toLocaleDateString('en-US', { weekday: 'short' }));

      const dayProgress = dailyProgress[dateStr];
      accuracies.unshift(dayProgress ? Math.round(dayProgress.averageAccuracy * 100) / 100 : 0);
      minutes.unshift(dayProgress ? Math.round(dayProgress.totalMinutes * 100) / 100 : 0);
    }

    return { dates, accuracies, minutes };
  }, [dailyProgress]);

  const getTotalStats = useCallback(() => {
    const totalSessions = sessions.length;
    const totalMinutes = Math.round(sessions.reduce((sum, session) => sum + session.duration, 0) * 100) / 100;
    const averageAccuracy = sessions.length > 0
      ? Math.round(sessions.reduce((sum, session) => sum + session.averageAccuracy, 0) / sessions.length * 100) / 100
      : 0;

    return { totalSessions, totalMinutes, averageAccuracy };
  }, [sessions]);

  const value = {
    sessions,
    dailyProgress,
    currentSession,
    sessionHistory,
    startSession,
    endSession,
    updateSessionAccuracy,
    getDailyStats,
    getTotalStats
  };

  return (
    <PracticeContext.Provider value={value}>
      {children}
    </PracticeContext.Provider>
  );
};

export const usePractice = () => {
  const context = useContext(PracticeContext);
  if (context === undefined) {
    throw new Error('usePractice must be used within a PracticeProvider');
  }
  return context;
}; 