import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, RefreshCw, ChevronLeft } from 'lucide-react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { detectPose, cleanup } from '../utils/poseDetection';
import { PoseReferenceImage } from '../components/PoseReferenceImage';

interface PoseState {
  score: number;
  feedback: string[];
  overallAccuracy?: number;
}

const PracticePage: React.FC = () => {
  const { poseId } = useParams<{ poseId: string }>();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [poseState, setPoseState] = useState<PoseState>({
    score: 0,
    feedback: [],
    overallAccuracy: 0
  });
  const [referenceKeypoints, setReferenceKeypoints] = useState<poseDetection.Keypoint[] | null>(null);

  // Add pose connection pairs for better visualization
  const POSE_CONNECTIONS = [
    // Face
    ['nose', 'left_eye'], ['nose', 'right_eye'],
    ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
    // Upper body
    ['left_shoulder', 'right_shoulder'],
    ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
    ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
    // Torso
    ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
    ['left_hip', 'right_hip'],
    // Lower body
    ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
    ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle']
  ];

  // Add keypoint drawing function with better visibility
  const drawKeypoint = (ctx: CanvasRenderingContext2D, keypoint: any) => {
    if (keypoint.score && keypoint.score > 0.3) {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgb(255, 255, 0)';
      ctx.fill();
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Add connection drawing function with better visibility
  const drawConnection = (ctx: CanvasRenderingContext2D, from: any, to: any) => {
    if (from.score > 0.3 && to.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = 'rgb(255, 255, 0)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  // Improved pose skeleton drawing
  const drawPoseSkeleton = (keypoints: poseDetection.Keypoint[]) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx || !videoRef.current) return;

    // Clear previous frame
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw video frame
    ctx.drawImage(
      videoRef.current,
      0, 0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Scale keypoints to canvas size
    const scaleX = canvasRef.current.width / videoRef.current.videoWidth;
    const scaleY = canvasRef.current.height / videoRef.current.videoHeight;
    
    const scaledKeypoints = keypoints.map(keypoint => ({
      ...keypoint,
      x: keypoint.x * scaleX,
      y: keypoint.y * scaleY
    }));

    // Draw connections first (under keypoints)
    POSE_CONNECTIONS.forEach(([fromName, toName]) => {
      const from = scaledKeypoints.find(kp => kp.name === fromName);
      const to = scaledKeypoints.find(kp => kp.name === toName);
      if (from && to) {
        drawConnection(ctx, from, to);
      }
    });

    // Draw keypoints on top
    scaledKeypoints.forEach(keypoint => {
      drawKeypoint(ctx, keypoint);
    });
  };

  // Handle reference pose detection
  const handleReferenceDetected = (keypoints: poseDetection.Keypoint[]) => {
    setReferenceKeypoints(keypoints);
  };

  // Update video initialization
  useEffect(() => {
    if (!poseId) return;

    const initializeCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            aspectRatio: 4/3,
            facingMode: 'user',
            frameRate: { ideal: 30 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            
            // Set canvas size to match video
            if (canvasRef.current) {
              canvasRef.current.width = videoRef.current!.videoWidth;
              canvasRef.current.height = videoRef.current!.videoHeight;
              console.log('Canvas size set to:', {
                width: canvasRef.current.width,
                height: canvasRef.current.height
              });
            }
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    };

    initializeCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [poseId]);

  // Start/stop pose detection
  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  // Update pose detection effect
  useEffect(() => {
    if (!isRecording || !videoRef.current || !poseId) return;

    let animationFrame: number;
    let isProcessing = false;
    
    const detectPoseFrame = async () => {
      if (!isProcessing && videoRef.current && canvasRef.current) {
        isProcessing = true;
        try {
          const result = await detectPose(videoRef.current, poseId);
          setPoseState(result);
          
          if (result.keypoints && result.keypoints.length > 0) {
            drawPoseSkeleton(result.keypoints);
          }
        } catch (err) {
          if (err instanceof Error && err.message !== 'Frame skipped') {
            console.error('Error in pose detection:', err);
          }
        } finally {
          isProcessing = false;
        }
      }
      
      if (isRecording) {
        animationFrame = requestAnimationFrame(detectPoseFrame);
      }
    };

    detectPoseFrame();
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRecording, poseId]);

  if (!poseId) {
    return <div>No pose selected</div>;
  }

  const accuracyColor = poseState.overallAccuracy 
    ? poseState.overallAccuracy >= 90 
      ? 'text-green-500' 
      : poseState.overallAccuracy >= 70 
        ? 'text-yellow-500' 
        : 'text-red-500'
    : 'text-gray-500';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center text-gray-600 hover:text-gray-800"
      >
        <ChevronLeft className="w-5 h-5 mr-1" />
        Back
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Reference Image */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Reference Pose</h2>
          <PoseReferenceImage
            poseId={poseId}
            onPoseDetected={handleReferenceDetected}
          />
        </div>

        {/* Live Camera Feed */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Your Pose</h2>
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover rounded-lg"
            />
            
            {/* Accuracy Overlay */}
            <div className={`absolute top-4 right-4 bg-black bg-opacity-50 px-4 py-2 rounded-full ${accuracyColor}`}>
              Accuracy: {Math.round(poseState.overallAccuracy || 0)}%
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button
                onClick={toggleRecording}
                className="bg-white rounded-full p-3 shadow-lg hover:bg-gray-100"
              >
                {isRecording ? (
                  <Pause className="w-6 h-6 text-red-500" />
                ) : (
                  <Play className="w-6 h-6 text-green-500" />
                )}
              </button>
              <button
                onClick={() => setIsRecording(false)}
                className="bg-white rounded-full p-3 shadow-lg hover:bg-gray-100"
              >
                <RefreshCw className="w-6 h-6 text-blue-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Feedback Panel */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Real-time Feedback</h2>
          <div className="space-y-2">
            {poseState.feedback.map((feedback: string, index: number) => (
              <div
                key={index}
                className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3" />
                {feedback}
              </div>
            ))}
            {poseState.feedback.length === 0 && (
              <div className="text-gray-500 italic">
                Start the pose detection to receive feedback
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticePage; 