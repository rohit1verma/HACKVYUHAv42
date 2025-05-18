import * as poseDetection from '@tensorflow-models/pose-detection';
import '@tensorflow/tfjs-backend-webgl';
import * as tf from '@tensorflow/tfjs-core';
import { POSE_ID_TO_NAME } from './poseAccuracy';

interface PoseScore {
  score: number;
  feedback: string[];
  jointScores: { [key: string]: JointScore };
  keypoints?: poseDetection.Keypoint[];
  overallAccuracy?: number;
  referenceImage?: string;
}

interface PoseDetectionResult {
  accuracy: number;
  feedback: string[];
  referenceImage?: string;
}

interface JointAlignment {
  target: number;
  tolerance: number;
}

interface PoseGuidance {
  setup: string[];
  alignment: {
    [key: string]: JointAlignment;
  };
}

interface JointScore {
  score: number;
  currentAngle?: number;
  targetAngle?: number;
  tolerance?: number;
}

// Frame rate control
const FRAME_RATE = 24; // Reduced for better performance
let lastFrameTime = 0;

// Pose-specific guidance
const POSE_GUIDANCE: { [key: string]: PoseGuidance } = {
  'standing-forward-bend': {
    setup: [
      "Stand at the top of your mat",
      "Feet hip-width apart",
      "Hinge at your hips",
      "Fold forward with a flat back"
    ],
    alignment: {
      spine: { target: 90, tolerance: 15 },
      knees: { target: 165, tolerance: 10 },
      hips: { target: 90, tolerance: 15 },
      shoulders: { target: 180, tolerance: 15 },
      neck: { target: 45, tolerance: 10 }
    }
  },
  'lotus': {
    setup: [
      "Sit on the mat",
      "Cross legs",
      "Each foot on opposite thigh",
      "Spine straight"
    ],
    alignment: {
      spine: { target: 180, tolerance: 10 },
      hips: { target: 45, tolerance: 15 },
      knees: { target: 30, tolerance: 15 },
      shoulders: { target: 180, tolerance: 10 },
      neck: { target: 180, tolerance: 10 }
    }
  },
  'tree': {
    setup: [
      "Stand on one leg",
      "Place foot on inner thigh/calf",
      "Hands at heart or overhead",
      "Gaze at fixed point"
    ],
    alignment: {
      standing_leg: { target: 175, tolerance: 5 },
      raised_knee: { target: 90, tolerance: 15 },
      hips: { target: 180, tolerance: 10 },
      spine: { target: 180, tolerance: 5 },
      shoulders: { target: 180, tolerance: 10 }
    }
  },
  'headstand': {
    setup: [
      "Forearms on mat",
      "Interlace fingers",
      "Stack shoulders over elbows",
      "Lift legs up"
    ],
    alignment: {
      forearms: { target: 90, tolerance: 10 },
      shoulders: { target: 90, tolerance: 10 },
      spine: { target: 180, tolerance: 5 },
      hips: { target: 180, tolerance: 10 },
      legs: { target: 180, tolerance: 10 }
    }
  },
  'corpse': {
    setup: [
      "Lie flat on back",
      "Arms by sides",
      "Legs extended",
      "Palms face up"
    ],
    alignment: {
      spine: { target: 180, tolerance: 5 },
      shoulders: { target: 180, tolerance: 10 },
      hips: { target: 180, tolerance: 10 },
      legs: { target: 180, tolerance: 10 },
      neck: { target: 180, tolerance: 5 }
    }
  }
};

// Define the yoga poses data structure
const YOGA_POSES_DATA = new Map([
  ['Standing_Forward_Bend', {
    poseId: 1,
    images: ['Standing_Forward_Bend/pose1.jpg', 'Standing_Forward_Bend/pose2.jpg', 'Standing_Forward_Bend/pose3.jpg']
  }],
  ['Lotus_Pose', {
    poseId: 2,
    images: ['Lotus_Pose/pose1.jpg', 'Lotus_Pose/pose2.jpg', 'Lotus_Pose/pose3.jpg']
  }],
  ['Tree_Pose', {
    poseId: 3,
    images: ['Tree_Pose/pose1.jpg', 'Tree_Pose/pose2.jpg', 'Tree_Pose/pose3.jpg']
  }],
  ['Headstand', {
    poseId: 4,
    images: ['Headstand/pose1.jpg', 'Headstand/pose2.jpg', 'Headstand/pose3.jpg']
  }],
  ['Corpse_Pose', {
    poseId: 5,
    images: ['Corpse_Pose/pose1.jpg', 'Corpse_Pose/pose2.jpg', 'Corpse_Pose/pose3.jpg']
  }]
]);

let detector: poseDetection.PoseDetector | null = null;
let isBackendInitialized = false;
let lastProcessedTime = 0;
const PROCESS_INTERVAL = 100; // Process every 100ms

let previousKeypoints: poseDetection.Keypoint[] | null = null;

// Initialize TensorFlow.js and create detector
const initializeDetector = async (retries = 3): Promise<poseDetection.PoseDetector> => {
  if (detector && isBackendInitialized) return detector;

  try {
    if (!isBackendInitialized) {
      await tf.setBackend('webgl');
      await tf.ready();
      isBackendInitialized = true;
    }

    if (!detector) {
      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.BlazePose,
        {
          runtime: 'tfjs',
          enableSmoothing: true,
          modelType: 'full'
        }
      );
    }

    return detector;
  } catch (err) {
    console.error('Error initializing pose detection:', err);
    if (retries > 0) {
      console.log(`Retrying initialization... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return initializeDetector(retries - 1);
    }
    isBackendInitialized = false;
    detector = null;
    throw new Error('Failed to initialize pose detection system');
  }
};

// Add normalized pose comparison
const normalizeKeypoints = (keypoints: poseDetection.Keypoint[]): poseDetection.Keypoint[] => {
  // Find the bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  keypoints.forEach(kp => {
    if (kp.x < minX) minX = kp.x;
    if (kp.x > maxX) maxX = kp.x;
    if (kp.y < minY) minY = kp.y;
    if (kp.y > maxY) maxY = kp.y;
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height);

  // Normalize to 0-1 range
  return keypoints.map(kp => ({
    ...kp,
    x: (kp.x - minX) / scale,
    y: (kp.y - minY) / scale
  }));
};

// Calculate angle between three points with better precision
const calculateAngle = (pointA: poseDetection.Keypoint | undefined, pointB: poseDetection.Keypoint | undefined, pointC: poseDetection.Keypoint | undefined): number => {
  if (!pointA || !pointB || !pointC) return 0;
  
  const radians = Math.atan2(pointC.y - pointB.y, pointC.x - pointB.x) -
                  Math.atan2(pointA.y - pointB.y, pointA.x - pointB.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
};

// Calculate joint accuracy with exponential falloff
const calculateJointAccuracy = (actual: number, target: number, tolerance: number): number => {
  const diff = Math.abs(actual - target);
  if (diff <= tolerance) {
    return 1.0;
  }
  // Exponential falloff beyond tolerance
  return Math.exp(-0.5 * Math.pow((diff - tolerance) / tolerance, 2));
};

// Improved keypoint smoothing
const MAX_HISTORY = 8; // Increased history size
const keypointHistory: poseDetection.Keypoint[][] = [];

const smoothKeypoints = (
  keypoints: poseDetection.Keypoint[],
  smoothingFactor: number = 0.6  // Adjusted for more responsive tracking
): poseDetection.Keypoint[] => {
  if (keypointHistory.length >= MAX_HISTORY) {
    keypointHistory.shift();
  }
  keypointHistory.push(keypoints);

  if (keypointHistory.length < 3) {
    return keypoints;
  }

  return keypoints.map((keypoint, index) => {
    const keypointHistory2D = keypointHistory.map(history => history[index]);
    const weightedSum = { x: 0, y: 0, score: 0 };
    let totalWeight = 0;

    // Apply exponential weighting to history
    keypointHistory2D.forEach((historical, historyIndex) => {
      const weight = Math.exp(-0.5 * (keypointHistory2D.length - 1 - historyIndex));
      weightedSum.x += historical.x * weight;
      weightedSum.y += historical.y * weight;
      weightedSum.score = Math.max(weightedSum.score, historical.score || 0);
      totalWeight += weight;
    });

    return {
      ...keypoint,
      x: weightedSum.x / totalWeight,
      y: weightedSum.y / totalWeight,
      score: weightedSum.score
    };
  });
};

// Check if we should process this frame
const shouldProcessFrame = (now: number): boolean => {
  if (now - lastProcessedTime >= PROCESS_INTERVAL) {
    lastProcessedTime = now;
    return true;
  }
  return false;
};

// Validate video input
const isVideoValid = (video: HTMLVideoElement): boolean => {
  const minWidth = 720; // Increased minimum width
  const minHeight = 540; // Increased minimum height
  const preferredWidth = 1280; // Preferred larger width
  const preferredHeight = 720; // Preferred larger height
  const aspectRatio = video.videoWidth / video.videoHeight;
  
  // Try to set preferred dimensions if possible
  if (video.width !== preferredWidth || video.height !== preferredHeight) {
    try {
      video.width = preferredWidth;
      video.height = preferredHeight;
    } catch (e) {
      console.warn('Could not set preferred video dimensions');
    }
  }
  
  return (
    video.videoWidth >= minWidth &&
    video.videoHeight >= minHeight &&
    aspectRatio >= 1.3 && // Slightly wider ratio for better view
    aspectRatio <= 2.0 && // Allow wider screens
    !video.paused &&
    !video.ended &&
    video.readyState === 4
  );
};

// Check for video/camera errors
const checkVideoErrors = (video: HTMLVideoElement): string | null => {
  if (!video) {
    return 'No video input detected';
  }
  if (video.paused) {
    return 'Video is paused';
  }
  if (video.ended) {
    return 'Video has ended';
  }
  if (video.readyState !== 4) {
    return 'Video is not ready';
  }
  if (video.videoWidth < 720 || video.videoHeight < 540) {
    return 'Please use a higher resolution camera (minimum 720p recommended)';
  }
  const aspectRatio = video.videoWidth / video.videoHeight;
  if (aspectRatio < 1.3 || aspectRatio > 2.0) {
    return 'Please adjust your camera to show a wider view for better pose detection';
  }
  return null;
};

// Add pose-specific angle calculations
const calculatePoseAngles = (keypoints: poseDetection.Keypoint[], poseType: string): { [key: string]: number } => {
  const angles: { [key: string]: number } = {};
  const getPoint = (name: string) => keypoints.find(kp => kp.name === name);

  switch (poseType) {
    case 'standing-forward-bend': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      const leftKnee = getPoint('left_knee');
      const rightKnee = getPoint('right_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightAnkle = getPoint('right_ankle');

      // Spine angle (forward fold)
      if (nose && leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1
        };
        angles.spine = calculateAngle(nose, midShoulder, midHip);
      }

      // Knee bend
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        angles.knees = (
          calculateAngle(leftHip, leftKnee, leftAnkle) +
          calculateAngle(rightHip, rightKnee, rightAnkle)
        ) / 2;
      }

      // Hip hinge
      if (leftShoulder && leftHip && leftKnee && rightShoulder && rightHip && rightKnee) {
        angles.hips = (
          calculateAngle(leftShoulder, leftHip, leftKnee) +
          calculateAngle(rightShoulder, rightHip, rightKnee)
        ) / 2;
      }

      // Shoulder alignment
      if (leftShoulder && rightShoulder && leftHip) {
        angles.shoulders = calculateAngle(leftShoulder, rightShoulder, leftHip);
      }

      // Neck alignment
      if (nose && leftShoulder && rightShoulder) {
        angles.neck = calculateAngle(nose, leftShoulder, rightShoulder);
      }
      break;
    }

    case 'lotus': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      const leftKnee = getPoint('left_knee');
      const rightKnee = getPoint('right_knee');

      // Spine alignment
      if (nose && leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1
        };
        angles.spine = calculateAngle(nose, midShoulder, midHip);
      }

      // Hip opening
      if (leftHip && rightHip && leftKnee && rightKnee) {
        angles.hips = calculateAngle(leftKnee, leftHip, rightHip);
      }

      // Knee position
      if (leftHip && leftKnee && rightHip && rightKnee) {
        angles.knees = (
          calculateAngle(leftHip, leftKnee, rightKnee) +
          calculateAngle(rightHip, rightKnee, leftKnee)
        ) / 2;
      }

      // Shoulder alignment
      if (leftShoulder && rightShoulder && leftHip) {
        angles.shoulders = calculateAngle(leftShoulder, rightShoulder, leftHip);
      }

      // Neck alignment
      if (nose && leftShoulder && rightShoulder) {
        angles.neck = calculateAngle(nose, leftShoulder, rightShoulder);
      }
      break;
    }

    case 'tree': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      const leftKnee = getPoint('left_knee');
      const rightKnee = getPoint('right_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightAnkle = getPoint('right_ankle');

      // Standing leg alignment
      if (leftHip && leftKnee && leftAnkle) {
        angles.standing_leg = calculateAngle(leftHip, leftKnee, leftAnkle);
      }

      // Raised knee position
      if (rightHip && rightKnee && rightAnkle) {
        angles.raised_knee = calculateAngle(rightHip, rightKnee, rightAnkle);
      }

      // Hip alignment
      if (leftHip && rightHip && leftKnee) {
        angles.hips = calculateAngle(leftHip, rightHip, leftKnee);
      }

      // Spine alignment
      if (nose && leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1
        };
        angles.spine = calculateAngle(nose, midShoulder, midHip);
      }

      // Shoulder alignment
      if (leftShoulder && rightShoulder && leftHip) {
        angles.shoulders = calculateAngle(leftShoulder, rightShoulder, leftHip);
      }
      break;
    }

    case 'headstand': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftElbow = getPoint('left_elbow');
      const rightElbow = getPoint('right_elbow');
      const leftWrist = getPoint('left_wrist');
      const rightWrist = getPoint('right_wrist');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      const leftKnee = getPoint('left_knee');
      const rightKnee = getPoint('right_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightAnkle = getPoint('right_ankle');

      // Forearm alignment
      if (leftElbow && leftWrist && rightElbow && rightWrist) {
        angles.forearms = (
          calculateAngle(leftShoulder, leftElbow, leftWrist) +
          calculateAngle(rightShoulder, rightElbow, rightWrist)
        ) / 2;
      }

      // Shoulder stack
      if (leftShoulder && rightShoulder && leftElbow && rightElbow) {
        angles.shoulders = (
          calculateAngle(leftWrist, leftElbow, leftShoulder) +
          calculateAngle(rightWrist, rightElbow, rightShoulder)
        ) / 2;
      }

      // Spine alignment
      if (nose && leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1
        };
        angles.spine = calculateAngle(nose, midShoulder, midHip);
      }

      // Hip alignment
      if (leftHip && rightHip && leftKnee && rightKnee) {
        angles.hips = calculateAngle(leftKnee, leftHip, rightHip);
      }

      // Leg alignment
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        angles.legs = (
          calculateAngle(leftHip, leftKnee, leftAnkle) +
          calculateAngle(rightHip, rightKnee, rightAnkle)
        ) / 2;
      }
      break;
    }

    case 'corpse': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      const leftKnee = getPoint('left_knee');
      const rightKnee = getPoint('right_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightAnkle = getPoint('right_ankle');

      // Spine alignment
      if (nose && leftShoulder && rightShoulder && leftHip && rightHip) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1
        };
        angles.spine = calculateAngle(nose, midShoulder, midHip);
      }

      // Shoulder relaxation
      if (leftShoulder && rightShoulder && leftHip) {
        angles.shoulders = calculateAngle(leftShoulder, rightShoulder, leftHip);
      }

      // Hip alignment
      if (leftHip && rightHip && leftKnee && rightKnee) {
        angles.hips = calculateAngle(leftKnee, leftHip, rightHip);
      }

      // Leg relaxation
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        angles.legs = (
          calculateAngle(leftHip, leftKnee, leftAnkle) +
          calculateAngle(rightHip, rightKnee, rightAnkle)
        ) / 2;
      }

      // Neck alignment
      if (nose && leftShoulder && rightShoulder) {
        angles.neck = calculateAngle(nose, leftShoulder, rightShoulder);
      }
      break;
    }
  }

  return angles;
};

// Map kebab-case pose IDs to the expected format
const mapPoseId = (poseId: string): string => {
  const poseMap: { [key: string]: string } = {
    'standing-forward-bend': 'Standing_Forward_Bend',
    'lotus': 'Lotus_Pose',
    'tree': 'Tree_Pose',
    'headstand': 'Headstand',
    'corpse': 'Corpse_Pose'
  };
  
  return poseMap[poseId] || poseId;
};

// Add keypoint type for type safety
type KeypointName = 
  | 'nose' 
  | 'left_eye' 
  | 'right_eye' 
  | 'left_ear' 
  | 'right_ear'
  | 'left_shoulder'
  | 'right_shoulder'
  | 'left_elbow'
  | 'right_elbow'
  | 'left_wrist'
  | 'right_wrist'
  | 'left_hip'
  | 'right_hip'
  | 'left_knee'
  | 'right_knee'
  | 'left_ankle'
  | 'right_ankle';

// Add weighted scoring for different body parts with proper typing
const KEYPOINT_WEIGHTS: Record<KeypointName, number> = {
  nose: 0.5,
  left_eye: 0.3,
  right_eye: 0.3,
  left_ear: 0.2,
  right_ear: 0.2,
  left_shoulder: 0.8,
  right_shoulder: 0.8,
  left_elbow: 0.7,
  right_elbow: 0.7,
  left_wrist: 0.6,
  right_wrist: 0.6,
  left_hip: 0.9,
  right_hip: 0.9,
  left_knee: 0.8,
  right_knee: 0.8,
  left_ankle: 0.7,
  right_ankle: 0.7
};

// Enhanced pose accuracy calculation
const calculatePoseAccuracyWithFeedback = (
  keypoints: poseDetection.Keypoint[],
  poseType: string,
  referenceImage: string
): PoseDetectionResult => {
  const feedback: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;
  
  // Calculate weighted accuracy with improved scoring
  keypoints.forEach(keypoint => {
    if (keypoint.name && keypoint.score) {
      const weight = keypoint.name in KEYPOINT_WEIGHTS 
        ? KEYPOINT_WEIGHTS[keypoint.name as KeypointName]
        : 0.5;
      
      // Apply sigmoid-based scoring for smoother transitions
      const sigmoid = (x: number) => 1 / (1 + Math.exp(-10 * (x - 0.5)));
      const adjustedScore = sigmoid(keypoint.score);
      
      totalScore += adjustedScore * weight;
      totalWeight += weight;
    }
  });

  // Calculate base accuracy with improved scaling
  let accuracy = (totalScore / totalWeight) * 100;
  
  // Add pose-specific scoring with improved weighting
  const poseGuidance = POSE_GUIDANCE[poseType];
  if (poseGuidance) {
    let alignmentScore = 0;
    let alignmentCount = 0;
    let stabilityScore = 0;
    let confidenceScore = 0;

    // Calculate confidence score
    const visibleKeypoints = keypoints.filter(kp => kp.score && kp.score > 0.2).length;
    confidenceScore = (visibleKeypoints / keypoints.length) * 100;

    Object.entries(poseGuidance.alignment).forEach(([joint, { target, tolerance }]) => {
      const actualAngle = calculateJointAngle(keypoints, joint);
      if (actualAngle !== null) {
        // Improved angle difference calculation
        const difference = Math.abs(actualAngle - target);
        const maxDifference = tolerance * 2;
        
        // Gaussian-based scoring for more natural falloff
        const gaussian = (x: number, sigma: number) => 
          Math.exp(-0.5 * Math.pow(x / sigma, 2));
        
        // Calculate joint score with multiple factors
        const angleScore = gaussian(difference, tolerance);
        const stability = calculateJointStability(keypoints, joint);
        const confidence = keypoints
          .filter(kp => kp.name && kp.name.includes(joint))
          .reduce((acc, kp) => acc + (kp.score || 0), 0) / 3;
        
        // Weighted combination of factors
        const jointScore = (
          angleScore * 0.6 +    // Angle accuracy
          stability * 0.2 +     // Stability
          confidence * 0.2      // Confidence
        );
        
        alignmentScore += jointScore;
        alignmentCount++;
        stabilityScore += stability;
      }
    });

    if (alignmentCount > 0) {
      // Improved score combination
      const alignmentAverage = (alignmentScore / alignmentCount) * 100;
      const stabilityAverage = (stabilityScore / alignmentCount) * 100;
      
      // Dynamic weighting based on confidence
      const confidenceWeight = Math.min(confidenceScore / 100, 0.8);
      accuracy = (
        accuracy * 0.3 +                    // Base pose detection
        alignmentAverage * 0.5 +            // Joint alignment
        stabilityAverage * 0.1 +            // Stability
        confidenceScore * 0.1               // Overall confidence
      ) * confidenceWeight +                // Apply confidence scaling
      accuracy * (1 - confidenceWeight);    // Fallback to base accuracy when confidence is low
    }
  }

  // More granular feedback based on specific aspects
  if (accuracy >= 80) {
    feedback.push("Excellent form! Your alignment is very precise.");
  } else if (accuracy >= 70) {
    feedback.push("Great progress! Your form is getting more refined.");
  } else if (accuracy >= 60) {
    feedback.push("Good effort! Keep focusing on maintaining alignment.");
  } else if (accuracy >= 50) {
    feedback.push("You're improving! Continue working on the basic form.");
  } else {
    feedback.push("Keep practicing! Follow the pose guide for better alignment.");
  }

  // Add specific joint feedback with more detail
  const jointScores = calculateJointScores(keypoints, poseType);
  Object.entries(jointScores).forEach(([joint, score]) => {
    if (score.score < 0.6) {
      const jointName = joint.replace(/_/g, ' ');
      if (score.currentAngle !== undefined && score.targetAngle !== undefined) {
        const difference = Math.abs(score.currentAngle - score.targetAngle);
        const direction = score.currentAngle > score.targetAngle ? "decrease" : "increase";
        feedback.push(`Adjust your ${jointName} angle - try to ${direction} by ${Math.round(difference)}°`);
      } else {
        feedback.push(`Focus on improving your ${jointName} position.`);
      }
    }
  });

  return {
    accuracy: Math.min(100, Math.max(40, accuracy)), // Minimum 40% to encourage users
    feedback,
    referenceImage
  };
};

// Enhanced joint score calculation
const calculateJointScores = (keypoints: poseDetection.Keypoint[], poseType: string): { [key: string]: JointScore } => {
  const scores: { [key: string]: JointScore } = {};
  const poseGuidance = POSE_GUIDANCE[poseType];
  
  // Add general joint scores regardless of pose type
  const generalJoints = {
    'spine_alignment': ['nose', 'left_shoulder', 'left_hip'],
    'shoulder_alignment': ['left_shoulder', 'right_shoulder'],
    'hip_alignment': ['left_hip', 'right_hip'],
    'left_arm': ['left_shoulder', 'left_elbow', 'left_wrist'],
    'right_arm': ['right_shoulder', 'right_elbow', 'right_wrist'],
    'left_leg': ['left_hip', 'left_knee', 'left_ankle'],
    'right_leg': ['right_hip', 'right_knee', 'right_ankle']
  };

  // Calculate general alignment scores
  Object.entries(generalJoints).forEach(([joint, points]) => {
    const jointPoints = points.map(name => keypoints.find(kp => kp.name === name));
    if (jointPoints.every(point => point && point.score && point.score > 0.3)) {
      let score = 0;
      let currentAngle: number | undefined;
      let targetAngle: number | undefined;
      let tolerance: number | undefined;
      
      if (joint === 'spine_alignment') {
        // Calculate vertical alignment
        const [top, mid, bottom] = jointPoints;
        currentAngle = calculateAngle(top!, mid!, bottom!);
        targetAngle = 180; // Straight spine
        tolerance = 15;
        score = Math.max(0, 1 - Math.abs(180 - currentAngle) / 45);
      } else if (joint.includes('alignment')) {
        // Calculate horizontal alignment
        const [left, right] = jointPoints;
        const heightDiff = Math.abs(left!.y - right!.y);
        currentAngle = Math.atan2(Math.abs(right!.y - left!.y), Math.abs(right!.x - left!.x)) * (180 / Math.PI);
        targetAngle = 0; // Perfectly horizontal
        tolerance = 10;
        score = Math.max(0, 1 - heightDiff);
      } else {
        // Calculate joint angles
        const [start, middle, end] = jointPoints;
        currentAngle = calculateAngle(start!, middle!, end!);
        const isLeg = joint.includes('leg');
        targetAngle = isLeg ? 170 : 160; // Slightly bent is better than locked
        tolerance = isLeg ? 20 : 30;
        score = calculateJointAccuracy(currentAngle, targetAngle, tolerance);
      }
      
      scores[joint] = {
        score,
        currentAngle,
        targetAngle,
        tolerance
      };
    }
  });

  // Add pose-specific scores if guidance exists
  if (poseGuidance) {
    Object.entries(poseGuidance.alignment).forEach(([joint, { target, tolerance }]) => {
      const actualAngle = calculateJointAngle(keypoints, joint);
      if (actualAngle !== null) {
        const baseScore = calculateJointAccuracy(actualAngle, target, tolerance);
        const stability = calculateJointStability(keypoints, joint);
        const finalScore = Math.min(1, baseScore + (stability * 0.1));
        
        scores[`${poseType}_${joint}`] = {
          score: finalScore,
          currentAngle: actualAngle,
          targetAngle: target,
          tolerance
        };
      }
    });
  }

  return scores;
};

// Calculate joint stability
const calculateJointStability = (keypoints: poseDetection.Keypoint[], joint: string): number => {
  const relevantPoints = keypoints.filter(kp => 
    kp.name && kp.name.includes(joint.split('_')[0]) && kp.score && kp.score > 0.3
  );
  
  if (relevantPoints.length === 0) return 0;
  
  // Calculate average score of relevant points
  const avgScore = relevantPoints.reduce((sum, kp) => sum + (kp.score || 0), 0) / relevantPoints.length;
  
  return avgScore;
};

// Calculate specific joint angles
const calculateJointAngle = (keypoints: poseDetection.Keypoint[], joint: string): number | null => {
  const getPoint = (name: string) => keypoints.find(kp => kp.name === name);
  
  switch (joint) {
    case 'spine': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      
      if (nose && leftShoulder && rightShoulder && leftHip && rightHip &&
          nose.score && leftShoulder.score && rightShoulder.score && leftHip.score && rightHip.score) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1,
          name: 'mid_shoulder'
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1,
          name: 'mid_hip'
        };
        return calculateAngle(nose, midShoulder, midHip);
      }
      break;
    }
    case 'knees': {
      const leftHip = getPoint('left_hip');
      const leftKnee = getPoint('left_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightHip = getPoint('right_hip');
      const rightKnee = getPoint('right_knee');
      const rightAnkle = getPoint('right_ankle');
      
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle &&
          leftHip.score && leftKnee.score && leftAnkle.score &&
          rightHip.score && rightKnee.score && rightAnkle.score) {
        const leftAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        return (leftAngle + rightAngle) / 2; // Average of both knees
      }
      break;
    }
    case 'hips': {
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      
      if (leftShoulder && rightShoulder && leftHip && rightHip &&
          leftShoulder.score && rightShoulder.score && leftHip.score && rightHip.score) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1,
          name: 'mid_shoulder'
        };
        const midHip = {
          x: (leftHip.x + rightHip.x) / 2,
          y: (leftHip.y + rightHip.y) / 2,
          score: 1,
          name: 'mid_hip'
        };
        const midBase = {
          x: midHip.x,
          y: midHip.y + 0.5, // Point below hips
          score: 1,
          name: 'mid_base'
        };
        return calculateAngle(midShoulder, midHip, midBase);
      }
      break;
    }
    case 'shoulders': {
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const neck = getPoint('nose'); // Using nose as reference for neck position
      
      if (leftShoulder && rightShoulder && neck &&
          leftShoulder.score && rightShoulder.score && neck.score) {
        return calculateAngle(leftShoulder, neck, rightShoulder);
      }
      break;
    }
    case 'neck': {
      const nose = getPoint('nose');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      
      if (nose && leftShoulder && rightShoulder &&
          nose.score && leftShoulder.score && rightShoulder.score) {
        const midShoulder = {
          x: (leftShoulder.x + rightShoulder.x) / 2,
          y: (leftShoulder.y + rightShoulder.y) / 2,
          score: 1,
          name: 'mid_shoulder'
        };
        const topHead = {
          x: nose.x,
          y: nose.y - 0.3, // Point above nose
          score: 1,
          name: 'top_head'
        };
        return calculateAngle(topHead, nose, midShoulder);
      }
      break;
    }
    case 'standing_leg': {
      const hip = getPoint('left_hip');
      const knee = getPoint('left_knee');
      const ankle = getPoint('left_ankle');
      
      if (hip && knee && ankle && hip.score && knee.score && ankle.score) {
        return calculateAngle(hip, knee, ankle);
      }
      break;
    }
    case 'raised_knee': {
      const hip = getPoint('right_hip');
      const knee = getPoint('right_knee');
      const ankle = getPoint('right_ankle');
      
      if (hip && knee && ankle && hip.score && knee.score && ankle.score) {
        return calculateAngle(hip, knee, ankle);
      }
      break;
    }
    case 'legs': {
      const leftHip = getPoint('left_hip');
      const leftKnee = getPoint('left_knee');
      const leftAnkle = getPoint('left_ankle');
      const rightHip = getPoint('right_hip');
      const rightKnee = getPoint('right_knee');
      const rightAnkle = getPoint('right_ankle');
      
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle &&
          leftHip.score && leftKnee.score && leftAnkle.score &&
          rightHip.score && rightKnee.score && rightAnkle.score) {
        const leftLegAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        return (leftLegAngle + rightLegAngle) / 2; // Average of both legs
      }
      break;
    }
    case 'forearms': {
      const leftShoulder = getPoint('left_shoulder');
      const leftElbow = getPoint('left_elbow');
      const leftWrist = getPoint('left_wrist');
      const rightShoulder = getPoint('right_shoulder');
      const rightElbow = getPoint('right_elbow');
      const rightWrist = getPoint('right_wrist');
      
      if (leftShoulder && leftElbow && leftWrist && rightShoulder && rightElbow && rightWrist &&
          leftShoulder.score && leftElbow.score && leftWrist.score &&
          rightShoulder.score && rightElbow.score && rightWrist.score) {
        const leftArmAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightArmAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        return (leftArmAngle + rightArmAngle) / 2; // Average of both forearms
      }
      break;
    }
  }
  return null;
};

// Add pose validation with specific feedback
const validatePosePosition = (keypoints: poseDetection.Keypoint[], poseType: string, referenceImage?: string): { 
  isValid: boolean;
  feedback: string[];
  adjustments: string[];
} => {
  const feedback: string[] = [];
  const adjustments: string[] = [];
  let isValid = true;

  // Helper function to find keypoint
  const getKeypoint = (name: string) => keypoints.find(kp => kp.name === name);
  
  // Check if all required keypoints are visible
  const requiredKeypoints = [
    'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
    'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
    'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
    'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
  ];

  const visibleKeypoints = keypoints.filter(kp => (kp.score || 0) > 0.3);
  const visibilityRatio = visibleKeypoints.length / requiredKeypoints.length;

  if (visibilityRatio < 0.8) {
    isValid = false;
    if (visibilityRatio < 0.5) {
      feedback.push("Please move back so your full body is visible");
    } else {
      feedback.push("Adjust your position to ensure all body parts are visible");
    }
  }

  // Get key points for pose-specific checks
  const nose = getKeypoint('nose');
  const leftShoulder = getKeypoint('left_shoulder');
  const rightShoulder = getKeypoint('right_shoulder');
  const leftHip = getKeypoint('left_hip');
  const rightHip = getKeypoint('right_hip');
  const leftKnee = getKeypoint('left_knee');
  const rightKnee = getKeypoint('right_knee');
  const leftAnkle = getKeypoint('left_ankle');
  const rightAnkle = getKeypoint('right_ankle');

  // Check if person is facing the camera
  if (leftShoulder && rightShoulder && nose) {
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    if (shoulderWidth < 0.2) { // Too narrow, person might be sideways
      isValid = false;
      adjustments.push("Turn to face the camera directly");
    }
  }

  // Pose-specific validations
  switch (poseType) {
    case 'lotus':
      if (leftHip && rightHip && leftKnee && rightKnee) {
        // Check if hips are level
        const hipDiff = Math.abs(leftHip.y - rightHip.y);
        if (hipDiff > 0.1) {
          adjustments.push("Level your hips");
        }
        
        // Check if knees are properly positioned
        const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
        if (kneeWidth < 0.3) {
          adjustments.push("Spread your knees wider for proper lotus position");
        }
        
        // Check spine alignment
        if (nose && leftHip && rightHip) {
          const spineAngle = calculateAngle(
            nose,
            { x: (leftHip.x + rightHip.x) / 2, y: (leftHip.y + rightHip.y) / 2, score: 1 },
            { x: nose.x, y: nose.y + 0.1, score: 1 }
          );
          if (Math.abs(90 - spineAngle) > 15) {
            adjustments.push("Straighten your spine");
          }
        }
      }
      break;

    case 'tree':
      if (leftAnkle && rightAnkle && leftKnee && rightKnee) {
        // Check if one foot is lifted
        const ankleDiff = Math.abs(leftAnkle.y - rightAnkle.y);
        if (ankleDiff < 0.2) {
          adjustments.push("Lift one foot and place it on your inner thigh or calf");
        }
        
        // Check standing leg alignment
        const standingLeg = leftAnkle.y > rightAnkle.y ? 'right' : 'left';
        const hip = standingLeg === 'left' ? leftHip : rightHip;
        const knee = standingLeg === 'left' ? leftKnee : rightKnee;
        const ankle = standingLeg === 'left' ? leftAnkle : rightAnkle;
        
        if (hip && knee && ankle) {
          const standingLegAngle = calculateAngle(hip, knee, ankle);
          if (Math.abs(180 - standingLegAngle) > 15) {
            adjustments.push("Straighten your standing leg");
          }
        }
      }
      break;

    case 'warrior1':
    case 'warrior2':
      if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        // Check front knee alignment
        const kneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
        if (Math.abs(90 - kneeAngle) > 15) {
          adjustments.push("Bend your front knee to 90 degrees");
        }
        
        // Check back leg
        const backLegAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
        if (Math.abs(180 - backLegAngle) > 15) {
          adjustments.push("Straighten your back leg");
        }
      }
      break;
  }

  return { isValid, feedback, adjustments };
};

// Main pose detection function
export const detectPose = async (
  video: HTMLVideoElement,
  poseType: string,
  referenceImage?: string
): Promise<PoseScore> => {
  if (!isVideoValid(video)) {
    throw new Error('Frame skipped');
  }

  const now = Date.now();
  if (!shouldProcessFrame(now)) {
    throw new Error('Frame skipped');
  }
  lastProcessedTime = now;

  try {
    const detector = await initializeDetector();
    if (!detector) {
      throw new Error('Failed to initialize pose detector');
    }

    const poses = await detector.estimatePoses(video, {
      flipHorizontal: false,
      maxPoses: 1
    });

    if (poses.length === 0) {
      return {
        score: 0,
        feedback: ['No pose detected. Please make sure you are visible in the frame.'],
        overallAccuracy: 0,
        jointScores: {} as { [key: string]: JointScore }
      };
    }

    const pose = poses[0];
    const normalizedKeypoints = normalizeKeypoints(pose.keypoints);
    const smoothedKeypoints = smoothKeypoints(normalizedKeypoints);

    // Calculate pose angles with improved accuracy
    const angles = calculatePoseAngles(smoothedKeypoints, poseType);
    
    // Calculate joint scores with weighted importance
    const jointScores = calculateJointScores(smoothedKeypoints, poseType);
    
    // Validate pose position with stricter criteria
    const validation = validatePosePosition(smoothedKeypoints, poseType, referenceImage);

    // Calculate overall accuracy with enhanced weighting
    const { accuracy, feedback } = calculatePoseAccuracyWithFeedback(
      smoothedKeypoints,
      poseType,
      referenceImage || ''
    );

    // Calculate stability score
    const stabilityScore = calculateStabilityScore(smoothedKeypoints);
    
    // Calculate alignment score
    const alignmentScore = calculateAlignmentScore(smoothedKeypoints);

    // Calculate final accuracy
    const finalAccuracy = calculateFinalAccuracy({
      poseAccuracy: accuracy,
      stabilityScore,
      alignmentScore,
      jointScores,
      validation
    });

    // Combine feedback with priority ordering
    const combinedFeedback = [
      ...validation.feedback,
      ...feedback,
      ...validation.adjustments
    ].filter((item, index, array) => array.indexOf(item) === index);

    return {
      score: pose.score || 0,
      feedback: combinedFeedback.slice(0, 3),
      overallAccuracy: finalAccuracy,
      jointScores,
      keypoints: smoothedKeypoints
    };

  } catch (error) {
    console.error('Error in pose detection:', error);
    return {
      score: 0,
      feedback: ['Error detecting pose. Please try again.'],
      overallAccuracy: 0,
      jointScores: {} as { [key: string]: JointScore }
    };
  }
};

// Clean up resources
export const cleanup = () => {
  if (detector) {
    detector.dispose();
    detector = null;
  }
};

// Add new function to calculate final accuracy
const calculateFinalAccuracy = ({
  poseAccuracy,
  stabilityScore,
  alignmentScore,
  jointScores,
  validation
}: {
  poseAccuracy: number;
  stabilityScore: number;
  alignmentScore: number;
  jointScores: { [key: string]: JointScore };
  validation: { isValid: boolean; feedback: string[]; adjustments: string[] };
}): number => {
  // Weight factors for different components
  const weights = {
    poseAccuracy: 0.4,
    stability: 0.2,
    alignment: 0.2,
    jointAccuracy: 0.2
  };

  // Calculate average joint score
  const jointScoresArray = Object.values(jointScores);
  const avgJointScore = jointScoresArray.length > 0
    ? jointScoresArray.reduce((sum, score) => sum + score.score, 0) / jointScoresArray.length
    : 0;

  // Calculate weighted sum
  let finalScore = (
    poseAccuracy * weights.poseAccuracy +
    stabilityScore * weights.stability +
    alignmentScore * weights.alignment +
    avgJointScore * 100 * weights.jointAccuracy
  );

  // Apply validation penalty if pose is not valid
  if (!validation.isValid) {
    finalScore *= 0.8;
  }

  // Ensure score is between 0 and 100
  return Math.min(100, Math.max(0, finalScore));
};

// Add new function to calculate stability score
const calculateStabilityScore = (keypoints: poseDetection.Keypoint[]): number => {
  if (previousKeypoints === null) {
    previousKeypoints = keypoints;
    return 1.0;
  }

  let totalMovement = 0;
  let validPoints = 0;

  keypoints.forEach((keypoint, index) => {
    const prevKeypoint = previousKeypoints![index];
    if (keypoint.score && prevKeypoint.score && 
        keypoint.score > 0.3 && prevKeypoint.score > 0.3) {
      const movement = Math.sqrt(
        Math.pow(keypoint.x - prevKeypoint.x, 2) +
        Math.pow(keypoint.y - prevKeypoint.y, 2)
      );
      totalMovement += movement;
      validPoints++;
    }
  });

  previousKeypoints = keypoints;

  if (validPoints === 0) return 1.0;
  
  // Convert movement to stability score (inverse relationship)
  const avgMovement = totalMovement / validPoints;
  return Math.max(0, 1 - (avgMovement / 0.1)); // 0.1 is the movement threshold
};

// Add new function to calculate alignment score
const calculateAlignmentScore = (keypoints: poseDetection.Keypoint[]): number => {
  const scores: number[] = [];

  // Check shoulder alignment
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');
  const rightShoulder = keypoints.find(kp => kp.name === 'right_shoulder');
  if (leftShoulder && rightShoulder && 
      leftShoulder.score && rightShoulder.score && 
      leftShoulder.score > 0.3 && rightShoulder.score > 0.3) {
    const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
    scores.push(1 - Math.min(1, shoulderTilt / 0.1));
  }

  // Check hip alignment
  const leftHip = keypoints.find(kp => kp.name === 'left_hip');
  const rightHip = keypoints.find(kp => kp.name === 'right_hip');
  if (leftHip && rightHip && 
      leftHip.score && rightHip.score && 
      leftHip.score > 0.3 && rightHip.score > 0.3) {
    const hipTilt = Math.abs(leftHip.y - rightHip.y);
    scores.push(1 - Math.min(1, hipTilt / 0.1));
  }

  // Check spine alignment
  const nose = keypoints.find(kp => kp.name === 'nose');
  const midHip = keypoints.find(kp => kp.name === 'mid_hip');
  if (nose && midHip && 
      nose.score && midHip.score && 
      nose.score > 0.3 && midHip.score > 0.3) {
    const spineDeviation = Math.abs(nose.x - midHip.x);
    scores.push(1 - Math.min(1, spineDeviation / 0.1));
  }

  return scores.length > 0 
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
}; 