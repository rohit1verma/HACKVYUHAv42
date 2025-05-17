import * as poseDetection from '@tensorflow-models/pose-detection';

// Map pose IDs to names from yoga_train.txt
export const POSE_ID_TO_NAME = {
  1: 'Standing_Forward_Bend',
  2: 'Lotus_Pose',
  3: 'Tree_Pose',
  4: 'Headstand',
  5: 'Corpse_Pose'
};

// Define pose-specific angle configurations
const POSE_CONFIGS = {
  'Standing_Forward_Bend': {
    angles: [
      {
        name: 'spine',
        joints: ['shoulders', 'hips', 'knees'],
        target: 90,
        tolerance: 15,
        weight: 2
      },
      {
        name: 'legs',
        joints: ['hips', 'knees', 'ankles'],
        target: 180,
        tolerance: 10,
        weight: 1.5
      }
    ],
    feedback: {
      spine: 'Fold forward from your hips, keeping your spine long',
      legs: 'Keep your legs straight or slightly bent'
    }
  },
  'Lotus_Pose': {
    angles: [
      {
        name: 'spine',
        joints: ['shoulders', 'hips', 'knees'],
        target: 180,
        tolerance: 10,
        weight: 2
      },
      {
        name: 'hips',
        joints: ['left_hip', 'right_hip', 'knees'],
        target: 45,
        tolerance: 15,
        weight: 1.5
      }
    ],
    feedback: {
      spine: 'Keep your spine straight and tall',
      hips: 'Open your hips and cross your legs comfortably'
    }
  },
  'Tree_Pose': {
    angles: [
      {
        name: 'standing_leg',
        joints: ['hip', 'knee', 'ankle'],
        target: 180,
        tolerance: 8,
        weight: 2
      },
      {
        name: 'bent_knee',
        joints: ['hip', 'knee', 'foot'],
        target: 45,
        tolerance: 10,
        weight: 1.5
      }
    ],
    feedback: {
      standing_leg: 'Keep your standing leg strong and straight',
      bent_knee: 'Open your hip and place your foot against your inner thigh'
    }
  },
  'Headstand': {
    angles: [
      {
        name: 'body_line',
        joints: ['hips', 'shoulders', 'elbows'],
        target: 180,
        tolerance: 10,
        weight: 2
      },
      {
        name: 'legs',
        joints: ['ankles', 'knees', 'hips'],
        target: 180,
        tolerance: 8,
        weight: 1.5
      }
    ],
    feedback: {
      body_line: 'Keep your body in a straight line',
      legs: 'Point your toes up towards the ceiling'
    }
  },
  'Corpse_Pose': {
    angles: [
      {
        name: 'body_alignment',
        joints: ['shoulders', 'hips', 'ankles'],
        target: 180,
        tolerance: 10,
        weight: 1
      },
      {
        name: 'arms',
        joints: ['shoulders', 'elbows', 'wrists'],
        target: 15,
        tolerance: 10,
        weight: 1
      }
    ],
    feedback: {
      body_alignment: 'Keep your body relaxed and symmetrical',
      arms: 'Let your arms rest slightly away from your body'
    }
  }
};

// Calculate angle between three points
const calculateAngle = (a: poseDetection.Keypoint, b: poseDetection.Keypoint, c: poseDetection.Keypoint): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// Normalize keypoints relative to body size
const normalizeKeypoints = (keypoints: poseDetection.Keypoint[]): poseDetection.Keypoint[] => {
  const shoulders = keypoints.filter(kp => kp.name?.includes('shoulder'));
  const hips = keypoints.filter(kp => kp.name?.includes('hip'));
  
  if (shoulders.length < 2 || hips.length < 2) {
    return keypoints;
  }

  const centerX = (shoulders[0].x + shoulders[1].x + hips[0].x + hips[1].x) / 4;
  const centerY = (shoulders[0].y + shoulders[1].y + hips[0].y + hips[1].y) / 4;
  
  const bodySize = Math.sqrt(
    Math.pow(shoulders[1].x - shoulders[0].x, 2) +
    Math.pow(shoulders[1].y - shoulders[0].y, 2)
  );

  return keypoints.map(kp => ({
    ...kp,
    x: (kp.x - centerX) / bodySize,
    y: (kp.y - centerY) / bodySize
  }));
};

// Calculate accuracy for a specific angle
const calculateAngleAccuracy = (
  actual: number,
  target: number,
  tolerance: number
): number => {
  const diff = Math.abs(actual - target);
  if (diff <= tolerance) {
    return 1.0;
  }
  // Smoother falloff beyond tolerance
  return Math.max(0.1, Math.exp(-0.3 * Math.pow((diff - tolerance) / tolerance, 2)));
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

// Main accuracy calculation function
export const calculatePoseAccuracy = (
  keypoints: poseDetection.Keypoint[],
  poseType: string,
  referenceImage: string
): { accuracy: number; feedback: string[]; referenceImage: string } => {
  const feedback: string[] = [];
  const mappedPoseType = mapPoseId(poseType);
  const config = POSE_CONFIGS[mappedPoseType as keyof typeof POSE_CONFIGS];
  
  if (!config) {
    return {
      accuracy: 0,
      feedback: ['Unknown pose type'],
      referenceImage
    };
  }

  // Normalize keypoints
  const normalizedKeypoints = normalizeKeypoints(keypoints);

  let totalWeightedAccuracy = 0;
  let totalWeight = 0;
  let validAngles = 0;

  // Calculate accuracy for each angle configuration
  config.angles.forEach(angle => {
    const points = angle.joints.map(joint => 
      normalizedKeypoints.find(kp => kp.name?.toLowerCase().includes(joint.toLowerCase()))
    );

    if (points.every(p => p && p.score && p.score > 0.3)) {
      const actualAngle = calculateAngle(points[0]!, points[1]!, points[2]!);
      const accuracy = calculateAngleAccuracy(actualAngle, angle.target, angle.tolerance);
      
      totalWeightedAccuracy += accuracy * angle.weight;
      totalWeight += angle.weight;
      validAngles++;

      // Add feedback if accuracy is low
      if (accuracy < 0.7) {
        feedback.push(config.feedback[angle.name as keyof typeof config.feedback]);
      }
    } else {
      feedback.push(`Move closer to the camera to detect ${angle.name} alignment`);
    }
  });

  // Calculate final accuracy with minimum threshold
  const rawAccuracy = totalWeight > 0 ? totalWeightedAccuracy / totalWeight : 0;
  const minAccuracy = Math.max(5, validAngles * 5); // Minimum accuracy based on detected angles
  const scaledAccuracy = Math.max(minAccuracy, Math.min(99, Math.round(
    minAccuracy + (99 - minAccuracy) * (1 / (1 + Math.exp(-8 * (rawAccuracy - 0.5))))
  )));

  // Add overall feedback
  if (validAngles < config.angles.length / 2) {
    feedback.unshift('Move closer to the camera for better pose detection');
  } else if (scaledAccuracy < 30) {
    feedback.unshift('Focus on the basic alignment of the pose');
  } else if (scaledAccuracy < 60) {
    feedback.unshift('Keep adjusting to find better alignment');
  } else if (scaledAccuracy < 85) {
    feedback.unshift('Good form! Make small refinements');
  } else {
    feedback.unshift('Excellent form! Maintain your stability');
  }

  return {
    accuracy: scaledAccuracy,
    feedback: feedback.slice(0, 3), // Return top 3 feedback items
    referenceImage
  };
}; 