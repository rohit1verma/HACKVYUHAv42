import * as poseDetection from '@tensorflow-models/pose-detection';

interface PoseComparison {
  accuracy: number;
  jointAccuracies: { [key: string]: number };
  feedback: string[];
}

interface KeypointPair {
  userKeypoint: poseDetection.Keypoint;
  targetKeypoint: poseDetection.Keypoint;
}

// Calculate angle between three points
const calculateAngle = (a: poseDetection.Keypoint, b: poseDetection.Keypoint, c: poseDetection.Keypoint): number => {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
};

// Calculate distance between two points (normalized)
const calculateDistance = (a: poseDetection.Keypoint, b: poseDetection.Keypoint): number => {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
};

// Normalize keypoint coordinates relative to body size
const normalizeKeypoints = (keypoints: poseDetection.Keypoint[]): poseDetection.Keypoint[] => {
  const hipCenter = {
    x: (keypoints[11].x + keypoints[12].x) / 2,
    y: (keypoints[11].y + keypoints[12].y) / 2
  };

  const bodySize = calculateDistance(
    keypoints[0], // nose
    { x: hipCenter.x, y: hipCenter.y }
  );

  return keypoints.map(keypoint => ({
    ...keypoint,
    x: (keypoint.x - hipCenter.x) / bodySize,
    y: (keypoint.y - hipCenter.y) / bodySize
  }));
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

// Compare two poses and calculate accuracy
export const comparePoses = (
  userPose: poseDetection.Pose,
  targetPose: poseDetection.Pose,
  poseType: string
): PoseComparison => {
  const feedback: string[] = [];
  const jointAccuracies: { [key: string]: number } = {};
  const mappedPoseType = mapPoseId(poseType);

  console.log('Starting pose comparison:', {
    poseType: mappedPoseType,
    userPoseKeypoints: userPose.keypoints.length,
    targetPoseKeypoints: targetPose.keypoints.length
  });

  // Normalize poses
  const normalizedUserPose = normalizeKeypoints(userPose.keypoints);
  const normalizedTargetPose = normalizeKeypoints(targetPose.keypoints);

  // Define important angles for each pose type
  const poseAngles: { [key: string]: { joints: [string, string, string][], targetAngles: number[] }[] } = {
    'Standing_Forward_Bend': [
      {
        joints: [
          ['shoulders', 'hips', 'knees'],
          ['hips', 'knees', 'ankles']
        ],
        targetAngles: [90, 180]
      }
    ],
    'Lotus_Pose': [
      {
        joints: [
          ['left_hip', 'left_knee', 'left_ankle'],
          ['right_hip', 'right_knee', 'right_ankle']
        ],
        targetAngles: [45, 45]
      }
    ],
    'Tree_Pose': [
      {
        joints: [
          ['left_hip', 'left_knee', 'left_ankle'],
          ['right_shoulder', 'right_hip', 'right_knee'],
          ['left_shoulder', 'left_hip', 'left_knee']
        ],
        targetAngles: [180, 180, 180]
      }
    ],
    'Headstand': [
      {
        joints: [
          ['shoulders', 'elbows', 'wrists'],
          ['hips', 'shoulders', 'elbows']
        ],
        targetAngles: [90, 180]
      }
    ],
    'Corpse_Pose': [
      {
        joints: [
          ['shoulders', 'hips', 'ankles'],
          ['shoulders', 'elbows', 'wrists']
        ],
        targetAngles: [180, 15]
      }
    ]
  };

  // Calculate angles and compare
  let totalAccuracy = 0;
  let angleCount = 0;

  const poseConfig = poseAngles[mappedPoseType];
  if (poseConfig) {
    poseConfig.forEach(config => {
      config.joints.forEach((jointSet, index) => {
        const [joint1, joint2, joint3] = jointSet;
        
        const userAngle = calculateAngle(
          normalizedUserPose.find(kp => kp.name === joint1)!,
          normalizedUserPose.find(kp => kp.name === joint2)!,
          normalizedUserPose.find(kp => kp.name === joint3)!
        );

        const targetAngle = config.targetAngles[index];
        const angleDiff = Math.abs(userAngle - targetAngle);
        const angleAccuracy = Math.max(0, 1 - angleDiff / 90);

        jointAccuracies[joint2] = angleAccuracy;
        totalAccuracy += angleAccuracy;
        angleCount++;

        // Add feedback based on angle difference
        if (angleAccuracy < 0.7) {
          switch (mappedPoseType) {
            case 'Standing_Forward_Bend':
              if (joint2 === 'knees') {
                feedback.push("Bend your knees as if sitting in a chair");
              } else if (joint2 === 'hips') {
                feedback.push("Keep your spine straight, chest lifted");
              }
              break;
            case 'Lotus_Pose':
              if (joint2 === 'left_hip' || joint2 === 'right_hip') {
                feedback.push("Keep your legs straight and open");
              }
              break;
            case 'Tree_Pose':
              if (joint2 === 'right_hip') {
                feedback.push("Keep your standing leg straight and strong");
              } else if (joint2 === 'left_hip') {
                feedback.push("Turn your bent knee out to the side more");
              }
              break;
            case 'Headstand':
              if (joint2 === 'shoulders') {
                feedback.push("Keep your shoulders relaxed and level");
              }
              break;
            case 'Corpse_Pose':
              if (joint2 === 'hips' || joint2 === 'shoulders') {
                feedback.push("Keep your body in a straight line");
              }
              break;
          }
        }
      });
    });
  }

  // Calculate final accuracy
  const finalAccuracy = angleCount > 0 ? (totalAccuracy / angleCount) * 100 : 0;

  // Add general feedback based on overall accuracy
  if (finalAccuracy < 50) {
    feedback.unshift("Try to match the reference pose more closely");
  } else if (finalAccuracy < 80) {
    feedback.unshift("Getting better! Focus on the specific alignment cues");
  } else {
    feedback.unshift("Great form! Hold the pose and breathe deeply");
  }

  console.log('Pose comparison result:', {
    accuracy: finalAccuracy,
    feedback
  });

  return {
    accuracy: finalAccuracy,
    jointAccuracies,
    feedback
  };
};

// Get pose-specific angles to check
const getPoseSpecificAngles = (poseType: string) => {
  const defaultTolerance = 15;
  const defaultThreshold = 0.7;

  switch (poseType) {
    case 'warrior1':
      return [
        {
          name: 'front_knee',
          points: [11, 13, 15], // hip, knee, ankle
          tolerance: 10,
          threshold: 0.8,
          feedback: "Bend your front knee to 90 degrees, align over ankle"
        },
        {
          name: 'back_leg',
          points: [12, 14, 16],
          tolerance: 10,
          threshold: 0.8,
          feedback: "Straighten your back leg and ground the heel"
        },
        {
          name: 'torso',
          points: [5, 11, 13], // shoulder, hip, knee
          tolerance: 15,
          threshold: 0.7,
          feedback: "Keep your torso upright and chest open"
        },
        {
          name: 'hips',
          points: [11, 12, 14], // hip alignment
          tolerance: 12,
          threshold: 0.8,
          feedback: "Square your hips to the front"
        }
      ];

    case 'tree':
      return [
        {
          name: 'standing_leg',
          points: [11, 13, 15],
          tolerance: 8,
          threshold: 0.85,
          feedback: "Keep your standing leg strong and straight"
        },
        {
          name: 'raised_knee',
          points: [12, 14, 16],
          tolerance: 12,
          threshold: 0.8,
          feedback: "Lift your knee higher and open your hip"
        },
        {
          name: 'spine',
          points: [0, 11, 12], // nose, hips
          tolerance: 10,
          threshold: 0.8,
          feedback: "Lengthen your spine and maintain balance"
        },
        {
          name: 'shoulders',
          points: [5, 6, 0], // shoulders and nose alignment
          tolerance: 8,
          threshold: 0.85,
          feedback: "Keep your shoulders relaxed and level"
        }
      ];

    case 'downward-dog':
      return [
        {
          name: 'spine',
          points: [5, 11, 15], // shoulder to hip to ankle
          tolerance: 12,
          threshold: 0.8,
          feedback: "Create an inverted V-shape with your body"
        },
        {
          name: 'arms',
          points: [5, 7, 9], // shoulder, elbow, wrist
          tolerance: 10,
          threshold: 0.8,
          feedback: "Straighten your arms and press the ground away"
        },
        {
          name: 'legs',
          points: [11, 13, 15], // hip, knee, ankle
          tolerance: 12,
          threshold: 0.75,
          feedback: "Straighten your legs and press your heels down"
        },
        {
          name: 'shoulders',
          points: [5, 6, 7], // shoulder alignment
          tolerance: 10,
          threshold: 0.8,
          feedback: "Keep your shoulders away from your ears"
        }
      ];

    case 'chair':
      return [
        {
          name: 'knees',
          points: [11, 13, 15], // hip, knee, ankle
          tolerance: 10,
          threshold: 0.8,
          feedback: "Bend your knees as if sitting in a chair"
        },
        {
          name: 'spine',
          points: [0, 5, 11], // nose, shoulder, hip
          tolerance: 12,
          threshold: 0.8,
          feedback: "Keep your spine straight, chest lifted"
        },
        {
          name: 'arms',
          points: [5, 7, 9], // shoulder, elbow, wrist
          tolerance: 15,
          threshold: 0.75,
          feedback: "Raise your arms parallel to the ground"
        },
        {
          name: 'ankles',
          points: [13, 15, 11], // knee, ankle, hip
          tolerance: 8,
          threshold: 0.85,
          feedback: "Keep weight in your heels"
        }
      ];

    case 'forward-bend':
      return [
        {
          name: 'spine',
          points: [5, 11, 13], // shoulder, hip, knee
          tolerance: 15,
          threshold: 0.75,
          feedback: "Hinge at your hips, keeping your spine long"
        },
        {
          name: 'legs',
          points: [11, 13, 15], // hip, knee, ankle
          tolerance: 12,
          threshold: 0.8,
          feedback: "Keep a slight bend in your knees"
        },
        {
          name: 'head',
          points: [3, 5, 11], // ear, shoulder, hip
          tolerance: 10,
          threshold: 0.8,
          feedback: "Release your head and neck"
        },
        {
          name: 'shoulders',
          points: [5, 6, 7], // shoulder alignment
          tolerance: 10,
          threshold: 0.8,
          feedback: "Relax your shoulders away from your ears"
        }
      ];

    case 'plank':
      return [
        {
          name: 'spine',
          points: [5, 11, 15], // shoulder to hip to ankle
          tolerance: 8,
          threshold: 0.85,
          feedback: "Keep your body in one straight line"
        },
        {
          name: 'arms',
          points: [5, 7, 9], // shoulder, elbow, wrist
          tolerance: 10,
          threshold: 0.8,
          feedback: "Stack shoulders over wrists, engage arms"
        },
        {
          name: 'hips',
          points: [11, 12, 13], // hip alignment
          tolerance: 8,
          threshold: 0.85,
          feedback: "Keep your hips level with shoulders"
        },
        {
          name: 'legs',
          points: [11, 13, 15], // hip, knee, ankle
          tolerance: 10,
          threshold: 0.8,
          feedback: "Engage your legs and keep them straight"
        }
      ];

    default:
      return [
        {
          name: 'spine',
          points: [0, 11, 12],
          tolerance: defaultTolerance,
          threshold: defaultThreshold,
          feedback: "Focus on your spine alignment"
        }
      ];
  }
}; 