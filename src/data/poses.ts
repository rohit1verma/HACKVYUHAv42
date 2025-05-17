import { Pose } from '../contexts/PoseContext.tsx';

// LSP Yoga dataset categories
interface LSPCategories {
  basic: { [key: number]: string };
}

const lspCategories: LSPCategories = {
  basic: {
    1: 'Standing Poses',
    2: 'Sitting Poses',
    3: 'Balancing Poses',
    4: 'Inverted Poses',
    5: 'Reclining Poses'
  }
};

// Image URLs for each pose
const poseImages = {
  'standing-forward-bend': {
    main: 'https://lotusbuddhas.com/wp-content/uploads/2023/05/What-is-Standing-Forward-Bend-Uttanasana.webp',
    dataset: [
      'datasets/lsp/standing-forward-bend/pose1.jpg',
      'datasets/lsp/standing-forward-bend/pose2.jpg',
      'datasets/lsp/standing-forward-bend/pose3.jpg'
    ]
  },
  'lotus': {
    main: 'https://yogapractice.com/wp-content/uploads/2020/09/Ultimate-Guide-To-Lotus-Pose-%E2%80%94-Padmasana.jpg',
    dataset: [
      'datasets/lsp/lotus/pose1.jpg',
      'datasets/lsp/lotus/pose2.jpg',
      'datasets/lsp/lotus/pose3.jpg'
    ]
  },
  'tree': {
    main: 'https://global-uploads.webflow.com/5fe33d036237252135e3e74d/6273d5fd4abd6a13e9843dd2_Tree%20Pose%20by%20cult.fit.jpg',
    dataset: [
      'datasets/lsp/tree/pose1.jpg',
      'datasets/lsp/tree/pose2.jpg',
      'datasets/lsp/tree/pose3.jpg'
    ]
  },
  'headstand': {
    main: 'http://media4.popsugar-assets.com/files/2014/08/15/800/n/1922729/902dbc9728f8212a_Handstand_1_gnfWTP.xxxlarge_2x/i/Handstand.jpg',
    dataset: [
      'datasets/lsp/headstand/pose1.jpg',
      'datasets/lsp/headstand/pose2.jpg',
      'datasets/lsp/headstand/pose3.jpg'
    ]
  },
  'corpse': {
    main: 'https://buddymantra.com/wp-content/uploads/2019/08/yoga-at-home-resting-posture.jpg',
    dataset: [
      'datasets/lsp/corpse/pose1.jpg',
      'datasets/lsp/corpse/pose2.jpg',
      'datasets/lsp/corpse/pose3.jpg'
    ]
  }
};

// Basic pose data structure
export const poses: Pose[] = [
  {
    id: 'standing-forward-bend',
    name: 'Standing Forward Bend',
    description: 'A standing forward fold that stretches the entire back body',
    image: poseImages['standing-forward-bend'].main,
    imageUrl: poseImages['standing-forward-bend'].main,
    datasetImages: poseImages['standing-forward-bend'].dataset,
    sanskritName: 'Uttanasana',
    level: 'beginner',
    targetAreas: ['hamstrings', 'spine', 'calves'],
    benefits: [
      'Stretches spine and hamstrings',
      'Reduces stress and anxiety',
      'Improves circulation'
    ],
    category: {
      basic: lspCategories.basic[1],
      intermediate: '',
      detailed: ''
    },
    modifications: {
      general: 'Bend knees slightly if hamstrings are tight',
      beginner: 'Use blocks under hands for support'
    },
    steps: undefined
  },
  {
    id: 'lotus',
    name: 'Lotus Pose',
    description: 'A seated meditation pose that opens the hips',
    image: poseImages['lotus'].main,
    imageUrl: poseImages['lotus'].main,
    datasetImages: poseImages['lotus'].dataset,
    sanskritName: 'Padmasana',
    level: 'intermediate',
    targetAreas: ['hips', 'knees', 'ankles'],
    benefits: [
      'Improves hip flexibility',
      'Calms the mind',
      'Promotes good posture'
    ],
    category: {
      basic: lspCategories.basic[2],
      intermediate: '',
      detailed: ''
    },
    modifications: {
      general: 'Start with half lotus if full lotus is too challenging',
      beginner: 'Use cushion for support'
    },
    steps: undefined
  },
  {
    id: 'tree',
    name: 'Tree Pose',
    description: 'A standing balance pose that builds focus and stability',
    image: poseImages['tree'].main,
    imageUrl: poseImages['tree'].main,
    datasetImages: poseImages['tree'].dataset,
    sanskritName: 'Vrksasana',
    level: 'beginner',
    targetAreas: ['legs', 'core', 'balance'],
    benefits: [
      'Improves balance and stability',
      'Strengthens legs and core',
      'Enhances focus'
    ],
    category: {
      basic: lspCategories.basic[3],
      intermediate: '',
      detailed: ''
    },
    modifications: {
      general: 'Place foot on ankle or calf instead of inner thigh',
      beginner: 'Practice near a wall for support'
    },
    steps: undefined
  },
  {
    id: 'headstand',
    name: 'Headstand',
    description: 'An inverted pose that builds upper body strength',
    image: poseImages['headstand'].main,
    imageUrl: poseImages['headstand'].main,
    datasetImages: poseImages['headstand'].dataset,
    sanskritName: 'Sirsasana',
    level: 'advanced',
    targetAreas: ['shoulders', 'core', 'balance'],
    benefits: [
      'Builds upper body strength',
      'Improves circulation',
      'Enhances focus and concentration'
    ],
    category: {
      basic: lspCategories.basic[4],
      intermediate: '',
      detailed: ''
    },
    modifications: {
      general: 'Practice against a wall for support',
      beginner: 'Build strength with dolphin pose first'
    },
    steps: undefined
  },
  {
    id: 'corpse',
    name: 'Corpse Pose',
    description: 'A relaxation pose that calms the body and mind',
    image: poseImages['corpse'].main,
    imageUrl: poseImages['corpse'].main,
    datasetImages: poseImages['corpse'].dataset,
    sanskritName: 'Savasana',
    level: 'beginner',
    targetAreas: ['full body', 'mind'],
    benefits: [
      'Reduces stress and anxiety',
      'Promotes deep relaxation',
      'Improves sleep quality'
    ],
    category: {
      basic: lspCategories.basic[5],
      intermediate: '',
      detailed: ''
    },
    modifications: {
      general: 'Use bolster under knees for lower back support',
      beginner: 'Use eye pillow for deeper relaxation'
    },
    steps: undefined
  }
];

// Function to parse the LSP dataset file
export const parseLSPDataset = async () => {
  try {
    const response = await fetch('/datasets/lsp/yoga_train.txt');
    const data = await response.text();
    const lines = data.split('\n').filter(line => line.trim());
    
    const poseData = new Map<string, {
      images: string[];
      category: number;
    }>();

    lines.forEach(line => {
      const [path, category] = line.split(',');
      const poseName = path.split('/')[0];
      
      if (!poseData.has(poseName)) {
        poseData.set(poseName, {
          images: [],
          category: parseInt(category)
        });
      }
      
      const pose = poseData.get(poseName)!;
      pose.images.push(path);
    });

    return poseData;
  } catch (error) {
    console.error('Error parsing LSP dataset:', error);
    return null;
  }
};

// Updated dataset utilities
export const loadPoseDataset = async (poseName: string): Promise<LSPPoseData | null> => {
  try {
    const lspData = await parseLSPDataset();
    if (!lspData) return null;

    const poseData = Array.from(lspData.entries())
      .find(([name]) => name.toLowerCase().includes(poseName.toLowerCase()));

    if (!poseData) return null;

    const [name, data] = poseData;
    return {
      name,
      category: lspCategories.basic[data.category],
      images: data.images
    };
  } catch (error) {
    console.error('Error loading pose dataset:', error);
    return null;
  }
};

// Types
export interface LSPPoseData {
  name: string;
  category: string;
  images: string[];
}

export const getPoseKeypoints = async (_poseName: string): Promise<PoseKeypoints | null> => {
  return null; // LSP dataset doesn't support keypoints
};

export const getPoseAngles = async (_poseName: string): Promise<PoseAngles | null> => {
  return null; // LSP dataset doesn't support angles
};

export interface PoseKeypoints {
  [key: string]: { x: number; y: number };
}

export interface PoseAngles {
  [key: string]: number;
}