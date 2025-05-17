import React, { createContext, useContext, useState, useEffect } from 'react';
import { poses as initialPoses } from '../data/poses';
import { isDatasetDownloaded, downloadDataset } from '../utils/downloadDataset';

export interface PoseModifications {
  general?: string;
  male?: string;
  female?: string;
  beginner?: string;
}

export interface Pose {
  steps: any;
  id: string;
  name: string;
  description: string;
  image: string;
  imageUrl?: string;
  sanskritName?: string;
  level?: string;
  targetAreas?: string[];
  benefits?: string[];
  modifications?: PoseModifications;
  datasetImages?: string[];
  category?: {
    basic: string;
    intermediate: string;
    detailed: string;
  };
  accuracy?: PoseAccuracy[];
}

export interface PoseAccuracy {
  timestamp: number;
  score: number;
  feedback: string[];
}

interface UserProgress {
  [poseId: string]: {
    attempted: boolean;
    mastered: boolean;
  };
}

interface PoseContextType {
  poses: Pose[];
  getPoseById: (id: string) => Pose | undefined;
  userProgress: UserProgress;
  updateProgress: (poseId: string, status: { attempted?: boolean; mastered?: boolean }) => void;
  updatePoseAccuracy: (poseId: string, accuracy: PoseAccuracy) => void;
  loading: boolean;
  error: string | null;
  datasetStatus: 'not_downloaded' | 'downloading' | 'ready';
  downloadDatasetImages: () => Promise<void>;
  currentPose: Pose | null;
  setCurrentPose: (pose: Pose | null) => void;
}

const PoseContext = createContext<PoseContextType | undefined>(undefined);

export const PoseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [poses, setPoses] = useState<Pose[]>(initialPoses);
  const [userProgress, setUserProgress] = useState<UserProgress>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datasetStatus, setDatasetStatus] = useState<'not_downloaded' | 'downloading' | 'ready'>('not_downloaded');
  const [currentPose, setCurrentPose] = useState<Pose | null>(null);

  useEffect(() => {
    const checkDatasetStatus = async () => {
      const isDownloaded = await isDatasetDownloaded();
      setDatasetStatus(isDownloaded ? 'ready' : 'not_downloaded');
    };
    checkDatasetStatus();
  }, []);

  const getPoseById = (id: string) => {
    return poses.find(pose => pose.id === id);
  };

  const updateProgress = (poseId: string, status: { attempted?: boolean; mastered?: boolean }) => {
    try {
      setUserProgress(prev => {
        const currentStatus = prev[poseId] || { attempted: false, mastered: false };
        return {
          ...prev,
          [poseId]: {
            ...currentStatus,
            ...(status.attempted !== undefined ? { attempted: status.attempted } : {}),
            ...(status.mastered !== undefined ? { mastered: status.mastered } : {}),
          },
        };
      });
    } catch (err) {
      console.error('Error updating progress:', err);
      setError('Failed to update progress. Please try again.');
    }
  };

  const updatePoseAccuracy = (poseId: string, accuracy: PoseAccuracy) => {
    try {
      setPoses(prev => {
        return prev.map(pose => {
          if (pose.id === poseId) {
            const newAccuracy = [...(pose.accuracy || []), accuracy];
            if (newAccuracy.length > 10) {
              newAccuracy.shift();
            }
            return { ...pose, accuracy: newAccuracy };
          }
          return pose;
        });
      });

      if (accuracy.score >= 90) {
        updateProgress(poseId, { attempted: true, mastered: true });
      } else if (accuracy.score >= 60) {
        updateProgress(poseId, { attempted: true });
      }
    } catch (err) {
      console.error('Error updating pose accuracy:', err);
      setError('Failed to update pose accuracy. Please try again.');
    }
  };

  return (
    <PoseContext.Provider
      value={{
        poses,
        getPoseById,
        userProgress,
        updateProgress,
        updatePoseAccuracy,
        loading,
        error,
        datasetStatus,
        downloadDatasetImages: downloadDataset,
        currentPose,
        setCurrentPose
      }}
    >
      {children}
    </PoseContext.Provider>
  );
};

export const usePoses = () => {
  const context = useContext(PoseContext);
  if (!context) {
    throw new Error('usePoses must be used within a PoseProvider');
  }
  return context;
};