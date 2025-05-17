import React, { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import { referencePoses } from '../data/referenceImages';

interface Props {
  poseId: string;
  onPoseDetected?: (keypoints: poseDetection.Keypoint[]) => void;
}

export const PoseReferenceImage: React.FC<Props> = ({ poseId, onPoseDetected }) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);

  // Initialize TensorFlow.js and detector
  useEffect(() => {
    const initializeTF = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // First, try to initialize WebGPU backend
        try {
          await tf.setBackend('webgpu');
          await tf.ready();
          console.log('Using WebGPU backend');
        } catch (err) {
          // If WebGPU fails, fall back to WebGL
          console.log('WebGPU not available, falling back to WebGL');
          await tf.setBackend('webgl');
          await tf.ready();
          console.log('Using WebGL backend');
        }

        // Initialize detector after backend is ready
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
            enableSmoothing: true,
            minPoseScore: 0.3
          }
        );
        setDetector(detector);
        setIsLoading(false);
      } catch (err) {
        console.error('Error initializing TensorFlow.js:', err);
        setError('Failed to initialize pose detection system');
        setIsLoading(false);
      }
    };

    initializeTF();

    return () => {
      if (detector) {
        detector.dispose();
      }
    };
  }, []);

  // Detect pose in reference image
  useEffect(() => {
    const detectPoseInImage = async () => {
      if (!imageRef.current || !detector) return;

      try {
        setIsLoading(true);
        setError(null);

        // Wait for image to load
        await new Promise<void>((resolve) => {
          if (imageRef.current?.complete) {
            resolve();
          } else {
            imageRef.current?.addEventListener('load', () => resolve());
          }
        });

        // Detect pose in the image
        const poses = await detector.estimatePoses(imageRef.current, {
          flipHorizontal: false,
          maxPoses: 1,
          scoreThreshold: 0.3
        });

        if (poses.length === 0) {
          setError('No pose detected in reference image');
          return;
        }

        // Draw keypoints on canvas
        if (canvasRef.current && imageRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            // Set canvas size to match image
            canvasRef.current.width = imageRef.current.width;
            canvasRef.current.height = imageRef.current.height;

            // Draw image
            ctx.drawImage(imageRef.current, 0, 0);

            // Draw skeleton
            drawSkeleton(ctx, poses[0].keypoints);

            // Draw keypoints
            poses[0].keypoints.forEach(keypoint => {
              if (keypoint.score && keypoint.score > 0.3) {
                ctx.beginPath();
                ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            });
          }
        }

        // Notify parent component
        if (onPoseDetected) {
          onPoseDetected(poses[0].keypoints);
        }

      } catch (err) {
        console.error('Error detecting pose in reference image:', err);
        setError('Error analyzing reference pose');
      } finally {
        setIsLoading(false);
      }
    };

    detectPoseInImage();
  }, [detector, poseId, onPoseDetected]);

  const referencePose = referencePoses.find(pose => pose.id === poseId);
  if (!referencePose) {
    return <div className="text-red-500">Reference pose not found</div>;
  }

  return (
    <div className="relative rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2"></div>
            <span>Analyzing pose...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-50 text-white p-4 text-center">
          {error}
        </div>
      )}
      <img
        ref={imageRef}
        src={referencePose.imageUrl}
        alt={referencePose.name}
        className="w-full h-auto"
        style={{ display: 'none' }}
      />
      <canvas
        ref={canvasRef}
        className="w-full h-auto"
      />
    </div>
  );
};

// Helper function to draw skeleton
const drawSkeleton = (ctx: CanvasRenderingContext2D, keypoints: poseDetection.Keypoint[]) => {
  const connections = [
    ['nose', 'left_eye'],
    ['nose', 'right_eye'],
    ['left_eye', 'left_ear'],
    ['right_eye', 'right_ear'],
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'],
    ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'],
    ['right_elbow', 'right_wrist'],
    ['left_shoulder', 'left_hip'],
    ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    ['left_hip', 'left_knee'],
    ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'],
    ['right_knee', 'right_ankle']
  ];

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;

  connections.forEach(([from, to]) => {
    const fromPoint = keypoints.find(kp => kp.name === from);
    const toPoint = keypoints.find(kp => kp.name === to);

    if (fromPoint?.score && toPoint?.score && 
        fromPoint.score > 0.3 && toPoint.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(fromPoint.x, fromPoint.y);
      ctx.lineTo(toPoint.x, toPoint.y);
      ctx.stroke();
    }
  });
}; 