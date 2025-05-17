import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import { calculatePoseAccuracy, POSE_ID_TO_NAME } from './poseAccuracy';

interface PoseScore {
  score: number;
  feedback: string[];
  jointScores: { [key: string]: number };
  keypoints?: poseDetection.Keypoint[];
  overallAccuracy?: number;
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

// Frame rate control
const FRAME_RATE = 24; // Reduced for better performance
let lastFrameTime = 0;

// Pose-specific guidance
const POSE_GUIDANCE: { [key: string]: PoseGuidance } = {
  'warrior1': {
    setup: [
      "Stand at the top of your mat",
      "Step your left foot back about 4 feet",
      "Turn your back foot to 45 degrees"
    ],
    alignment: {
      front_knee: { target: 90, tolerance: 15 },
      back_leg: { target: 180, tolerance: 15 },
      hips: { target: 90, tolerance: 20 },
      torso: { target: 90, tolerance: 15 }
    }
  },
  'warrior2': {
    setup: [
      "Step your feet 4 feet apart",
      "Turn your front foot forward",
      "Turn your back foot parallel to the back of the mat"
    ],
    alignment: {
      front_knee: { target: 90, tolerance: 15 },
      back_leg: { target: 180, tolerance: 15 },
      arms: { target: 180, tolerance: 15 },
      hips: { target: 180, tolerance: 20 }
    }
  },
  'tree': {
    setup: [
      "Stand at the center of your mat",
      "Shift weight to your right foot",
      "Place left foot on inner right thigh or calf"
    ],
    alignment: {
      standing_leg: { target: 180, tolerance: 10 },
      hips: { target: 180, tolerance: 15 },
      raised_knee: { target: 90, tolerance: 20 },
      spine: { target: 180, tolerance: 15 }
    }
  },
  'chair': {
    setup: [
      "Stand with feet hip-width apart",
      "Bend knees and sit back",
      "Raise arms overhead"
    ],
    alignment: {
      knees: { target: 90, tolerance: 15 },
      hips: { target: 90, tolerance: 15 },
      arms: { target: 180, tolerance: 20 },
      spine: { target: 45, tolerance: 15 }
    }
  },
  'cobra': {
    setup: [
      "Lie on your stomach",
      "Place hands under shoulders",
      "Lift chest while keeping hips down"
    ],
    alignment: {
      arms: { target: 160, tolerance: 20 },
      hips: { target: 180, tolerance: 15 },
      shoulders: { target: 45, tolerance: 15 },
      neck: { target: 45, tolerance: 10 }
    }
  },
  'triangle': {
    setup: [
      "Step feet wide apart",
      "Turn front foot out 90 degrees",
      "Extend arms and fold sideways"
    ],
    alignment: {
      front_leg: { target: 180, tolerance: 15 },
      back_leg: { target: 180, tolerance: 15 },
      hips: { target: 180, tolerance: 20 },
      spine: { target: 45, tolerance: 15 }
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
const initializeDetector = async () => {
  if (detector && isBackendInitialized) return detector;

  try {
    if (!isBackendInitialized) {
      // Set memory growth to true for better memory management
      tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
      tf.env().set('WEBGL_VERSION', 2);
      tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
      
      // Initialize WebGL backend with custom settings
      await tf.setBackend('webgl');
      await tf.ready();
      
      // Check if backend is properly initialized
      const backend = tf.getBackend();
      if (backend !== 'webgl') {
        throw new Error(`Failed to initialize WebGL backend. Current backend: ${backend}`);
      }
      
      console.log('TensorFlow.js initialized with WebGL backend');
      isBackendInitialized = true;
    }

    if (!detector) {
      // Create detector with optimized settings
      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
          enableSmoothing: true,
          minPoseScore: 0.2
        }
      );
      console.log('Pose detector created successfully');
    }

    return detector;
  } catch (err) {
    console.error('Error initializing pose detection:', err);
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
const calculateAngle = (a: poseDetection.Keypoint, b: poseDetection.Keypoint, c: poseDetection.Keypoint): number => {
  const ab = Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
  const bc = Math.sqrt(Math.pow(b.x - c.x, 2) + Math.pow(b.y - c.y, 2));
  const ac = Math.sqrt(Math.pow(c.x - a.x, 2) + Math.pow(c.y - a.y, 2));
  
  const angle = Math.acos((ab * ab + bc * bc - ac * ac) / (2 * ab * bc));
  return (angle * 180) / Math.PI;
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

// Add smoothing for keypoints
const keypointHistory: poseDetection.Keypoint[][] = [];
const MAX_HISTORY = 5;

// Smooth keypoint movements
const smoothKeypoints = (
  keypoints: poseDetection.Keypoint[],
  smoothingFactor: number = 0.8
): poseDetection.Keypoint[] => {
  if (!previousKeypoints) {
    previousKeypoints = keypoints;
    return keypoints;
  }

  const smoothedKeypoints = keypoints.map((keypoint, index) => {
    const prevKeypoint = previousKeypoints![index];
    return {
      ...keypoint,
      x: prevKeypoint.x * smoothingFactor + keypoint.x * (1 - smoothingFactor),
      y: prevKeypoint.y * smoothingFactor + keypoint.y * (1 - smoothingFactor),
      score: keypoint.score
    };
  });

  previousKeypoints = smoothedKeypoints;
  return smoothedKeypoints;
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
    case 'warrior1':
    case 'warrior2': {
      const frontHip = getPoint('left_hip');
      const frontKnee = getPoint('left_knee');
      const frontAnkle = getPoint('left_ankle');
      const backHip = getPoint('right_hip');
      const backKnee = getPoint('right_knee');
      const backAnkle = getPoint('right_ankle');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');

      if (frontHip && frontKnee && frontAnkle) {
        angles.front_knee = calculateAngle(frontHip, frontKnee, frontAnkle);
      }
      if (backHip && backKnee && backAnkle) {
        angles.back_leg = calculateAngle(backHip, backKnee, backAnkle);
      }
      if (leftShoulder && rightShoulder && frontHip && backHip) {
        angles.hips = Math.abs(Math.atan2(backHip.y - frontHip.y, backHip.x - frontHip.x) * 180 / Math.PI);
        angles.torso = Math.abs(Math.atan2(rightShoulder.y - leftShoulder.y, rightShoulder.x - leftShoulder.x) * 180 / Math.PI);
      }
      break;
    }
    case 'tree': {
      const hip = getPoint('right_hip');
      const knee = getPoint('right_knee');
      const ankle = getPoint('right_ankle');
      const leftHip = getPoint('left_hip');
      const leftKnee = getPoint('left_knee');
      
      if (hip && knee && ankle) {
        angles.standing_leg = calculateAngle(hip, knee, ankle);
      }
      if (hip && leftHip && leftKnee) {
        angles.raised_knee = calculateAngle(hip, leftHip, leftKnee);
        angles.hips = Math.abs(Math.atan2(leftHip.y - hip.y, leftHip.x - hip.x) * 180 / Math.PI);
      }
      break;
    }
    case 'chair': {
  const leftHip = getPoint('left_hip');
  const leftKnee = getPoint('left_knee');
  const leftAnkle = getPoint('left_ankle');
  const rightHip = getPoint('right_hip');
  const rightKnee = getPoint('right_knee');
  const rightAnkle = getPoint('right_ankle');
      const leftShoulder = getPoint('left_shoulder');
      const rightShoulder = getPoint('right_shoulder');
      const leftWrist = getPoint('left_wrist');
      const rightWrist = getPoint('right_wrist');

      if (leftHip && leftKnee && leftAnkle) {
        angles.left_knee = calculateAngle(leftHip, leftKnee, leftAnkle);
      }
  if (rightHip && rightKnee && rightAnkle) {
        angles.right_knee = calculateAngle(rightHip, rightKnee, rightAnkle);
      }
      if (leftShoulder && leftHip && leftWrist) {
        angles.arms = calculateAngle(leftWrist, leftShoulder, leftHip);
      }
      break;
    }
    case 'cobra': {
      const leftShoulder = getPoint('left_shoulder');
      const leftElbow = getPoint('left_elbow');
      const leftWrist = getPoint('left_wrist');
      const leftHip = getPoint('left_hip');
      const rightHip = getPoint('right_hip');
      
      if (leftShoulder && leftElbow && leftWrist) {
        angles.arms = calculateAngle(leftWrist, leftElbow, leftShoulder);
      }
      if (leftShoulder && leftHip && rightHip) {
        angles.shoulders = Math.abs(Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x) * 180 / Math.PI);
      }
      break;
    }
    case 'triangle': {
      const frontHip = getPoint('left_hip');
      const frontKnee = getPoint('left_knee');
      const frontAnkle = getPoint('left_ankle');
      const backHip = getPoint('right_hip');
      const backKnee = getPoint('right_knee');
      const backAnkle = getPoint('right_ankle');
      const leftShoulder = getPoint('left_shoulder');
      
      if (frontHip && frontKnee && frontAnkle) {
        angles.front_leg = calculateAngle(frontHip, frontKnee, frontAnkle);
      }
      if (backHip && backKnee && backAnkle) {
        angles.back_leg = calculateAngle(backHip, backKnee, backAnkle);
      }
      if (leftShoulder && frontHip) {
        angles.spine = Math.abs(Math.atan2(leftShoulder.y - frontHip.y, leftShoulder.x - frontHip.x) * 180 / Math.PI);
      }
      break;
    }
  }

  return angles;
};

// Map kebab-case pose IDs to the expected format
const mapPoseId = (poseId: string): string => {
  const mapping: { [key: string]: string } = {
    'standing-forward-bend': 'Standing_Forward_Bend',
    'lotus': 'Lotus_Pose',
    'tree': 'Tree_Pose',
    'headstand': 'Headstand',
    'corpse': 'Corpse_Pose'
  };
  return mapping[poseId] || poseId;
};

// Main pose detection function
export const detectPose = async (
  video: HTMLVideoElement,
  poseType: string
): Promise<PoseScore> => {
  try {
    // Map the pose type to the expected format
    const mappedPoseType = mapPoseId(poseType);
    
    // Check if pose type is valid
    const poseData = YOGA_POSES_DATA.get(mappedPoseType);
    if (!poseData) {
      return {
        score: 0,
        feedback: ["Invalid pose type. Please select a valid pose."],
        jointScores: {},
        keypoints: [],
        overallAccuracy: 0
      };
    }

    // Get reference image for this pose
    const referenceImage = `/datasets/lsp/${poseData.images[0]}`; // Use first image as reference

    // Check for video/camera errors
    const videoError = checkVideoErrors(video);
    if (videoError) {
      return {
        score: 0,
        feedback: [videoError],
        jointScores: {},
        keypoints: [],
        overallAccuracy: 0,
        referenceImage
      };
    }

    const now = performance.now();
    if (!shouldProcessFrame(now)) {
      throw new Error('Frame skipped');
    }

    if (!isVideoValid(video)) {
      return {
        score: 0,
        feedback: ["Please ensure you're fully visible in the camera frame and step back if needed"],
        jointScores: {},
        keypoints: [],
        overallAccuracy: 0,
        referenceImage
      };
    }

    const poseDetector = await initializeDetector();
    const poses = await poseDetector.estimatePoses(video, {
      flipHorizontal: true,
      maxPoses: 1,
      scoreThreshold: 0.3
    });

    if (!poses.length || !poses[0].keypoints?.length) {
      return {
        score: 0,
        feedback: ["Move where your full body is visible in the frame"],
        jointScores: {},
        keypoints: [],
        overallAccuracy: 1,
        referenceImage
      };
    }

    // Apply smoothing to keypoints
    const smoothedKeypoints = smoothKeypoints(poses[0].keypoints);
    
    // Calculate confidence score
    const validKeypoints = smoothedKeypoints.filter(kp => kp.score && kp.score > 0.3);
    const confidenceScore = validKeypoints.length / smoothedKeypoints.length;

    // Calculate accuracy only with good confidence
    let result;
    if (confidenceScore > 0.7) {
      result = calculatePoseAccuracy(smoothedKeypoints, mappedPoseType, referenceImage);
  } else {
      result = {
        accuracy: 1,
        feedback: ["Please move to a position where your full body is clearly visible"],
        referenceImage
      };
  }

  return {
      score: poses[0].score || 0,
      feedback: result.feedback,
      jointScores: smoothedKeypoints.reduce((acc, kp) => {
        if (kp.score && kp.name) {
          acc[kp.name] = kp.score;
        }
        return acc;
      }, {} as { [key: string]: number }),
      keypoints: smoothedKeypoints,
      overallAccuracy: result.accuracy,
      referenceImage: result.referenceImage
    };

  } catch (err) {
    console.error('Error in pose detection:', err);
    return {
      score: 0,
      feedback: ["Error detecting pose. Please try again."],
      jointScores: {},
      keypoints: [],
      overallAccuracy: 1
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