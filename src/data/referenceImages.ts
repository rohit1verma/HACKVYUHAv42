interface ReferencePose {
  id: string;
  name: string;
  imageUrl: string;
  keypoints?: {
    x: number;
    y: number;
    name: string;
  }[];
}

export const referencePoses: ReferencePose[] = [
  {
    id: 'warrior1',
    name: 'Warrior I',
    imageUrl: '/poses/warrior1.jpg',
  },
  {
    id: 'tree',
    name: 'Tree Pose',
    imageUrl: '/poses/tree.jpg',
  },
  {
    id: 'downward-dog',
    name: 'Downward Dog',
    imageUrl: '/poses/downward-dog.jpg',
  }
]; 