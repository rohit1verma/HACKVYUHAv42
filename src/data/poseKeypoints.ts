import { Pose } from '../contexts/PoseContext.tsx';

export interface PoseKeypoint {
  id: number;
  name: string;
  coordinates: {
    x: number;
    y: number;
  };
  connections: number[];
}

export interface PoseAlignment {
  poseId: string;
  keypoints: PoseKeypoint[];
  angles: {
    [key: string]: {
      ideal: number;
      tolerance: number;
    };
  };
}

export const poseAlignments: Record<string, PoseAlignment> = {
  'warrior-ii': {
    poseId: 'warrior-ii',
    keypoints: [
      {
        id: 0,
        name: 'nose',
        coordinates: { x: 0.5, y: 0.2 },
        connections: [1, 2]
      },
      {
        id: 5,
        name: 'left_shoulder',
        coordinates: { x: 0.3, y: 0.25 },
        connections: [7, 6]
      },
      {
        id: 6,
        name: 'right_shoulder',
        coordinates: { x: 0.7, y: 0.25 },
        connections: [8, 5]
      },
      {
        id: 7,
        name: 'left_elbow',
        coordinates: { x: 0.1, y: 0.25 },
        connections: [5, 9]
      },
      {
        id: 8,
        name: 'right_elbow',
        coordinates: { x: 0.9, y: 0.25 },
        connections: [6, 10]
      },
      {
        id: 9,
        name: 'left_wrist',
        coordinates: { x: 0, y: 0.25 },
        connections: [7]
      },
      {
        id: 10,
        name: 'right_wrist',
        coordinates: { x: 1, y: 0.25 },
        connections: [8]
      },
      {
        id: 11,
        name: 'left_hip',
        coordinates: { x: 0.4, y: 0.5 },
        connections: [13, 12]
      },
      {
        id: 12,
        name: 'right_hip',
        coordinates: { x: 0.6, y: 0.5 },
        connections: [14, 11]
      },
      {
        id: 13,
        name: 'left_knee',
        coordinates: { x: 0.35, y: 0.7 },
        connections: [11, 15]
      },
      {
        id: 14,
        name: 'right_knee',
        coordinates: { x: 0.8, y: 0.7 },
        connections: [12, 16]
      },
      {
        id: 15,
        name: 'left_ankle',
        coordinates: { x: 0.35, y: 0.9 },
        connections: [13]
      },
      {
        id: 16,
        name: 'right_ankle',
        coordinates: { x: 0.8, y: 0.9 },
        connections: [14]
      }
    ],
    angles: {
      front_knee: {
        ideal: 90,
        tolerance: 10
      },
      back_leg: {
        ideal: 180,
        tolerance: 15
      },
      arms: {
        ideal: 180,
        tolerance: 10
      },
      hips: {
        ideal: 90,
        tolerance: 15
      }
    }
  },
  'downward-dog': {
    poseId: 'downward-dog',
    keypoints: [
      {
        id: 0,
        name: 'nose',
        coordinates: { x: 0.5, y: 0.6 },
        connections: [1, 2]
      },
      {
        id: 5,
        name: 'left_shoulder',
        coordinates: { x: 0.4, y: 0.5 },
        connections: [7, 6]
      },
      {
        id: 6,
        name: 'right_shoulder',
        coordinates: { x: 0.6, y: 0.5 },
        connections: [8, 5]
      },
      {
        id: 7,
        name: 'left_elbow',
        coordinates: { x: 0.35, y: 0.3 },
        connections: [5, 9]
      },
      {
        id: 8,
        name: 'right_elbow',
        coordinates: { x: 0.65, y: 0.3 },
        connections: [6, 10]
      },
      {
        id: 9,
        name: 'left_wrist',
        coordinates: { x: 0.3, y: 0.1 },
        connections: [7]
      },
      {
        id: 10,
        name: 'right_wrist',
        coordinates: { x: 0.7, y: 0.1 },
        connections: [8]
      },
      {
        id: 11,
        name: 'left_hip',
        coordinates: { x: 0.45, y: 0.7 },
        connections: [13, 12]
      },
      {
        id: 12,
        name: 'right_hip',
        coordinates: { x: 0.55, y: 0.7 },
        connections: [14, 11]
      },
      {
        id: 13,
        name: 'left_knee',
        coordinates: { x: 0.4, y: 0.8 },
        connections: [11, 15]
      },
      {
        id: 14,
        name: 'right_knee',
        coordinates: { x: 0.6, y: 0.8 },
        connections: [12, 16]
      },
      {
        id: 15,
        name: 'left_ankle',
        coordinates: { x: 0.3, y: 0.9 },
        connections: [13]
      },
      {
        id: 16,
        name: 'right_ankle',
        coordinates: { x: 0.7, y: 0.9 },
        connections: [14]
      }
    ],
    angles: {
      spine: {
        ideal: 45,
        tolerance: 15
      },
      arms: {
        ideal: 180,
        tolerance: 10
      },
      legs: {
        ideal: 180,
        tolerance: 15
      }
    }
  }
};

export const calculatePoseAccuracy = (
  detectedKeypoints: PoseKeypoint[],
  referenceAlignment: PoseAlignment
): number => {
  let totalScore = 0;
  let pointCount = 0;

  detectedKeypoints.forEach(detected => {
    const reference = referenceAlignment.keypoints.find(ref => ref.id === detected.id);
    if (reference) {
      const distance = Math.sqrt(
        Math.pow(detected.coordinates.x - reference.coordinates.x, 2) +
        Math.pow(detected.coordinates.y - reference.coordinates.y, 2)
      );
      
      // Convert distance to a score (0-100)
      const score = Math.max(0, 100 - (distance * 100));
      totalScore += score;
      pointCount++;
    }
  });

  return pointCount > 0 ? totalScore / pointCount : 0;
};