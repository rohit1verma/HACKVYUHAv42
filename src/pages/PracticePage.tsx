import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pause, Play, RefreshCw, ChevronLeft, Clock, Camera } from 'lucide-react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { detectPose, cleanup } from '../utils/poseDetection';
import { PoseReferenceImage } from '../components/PoseReferenceImage';
import PoseFeedback from '../components/PoseFeedback';
import { usePractice } from '../contexts/PracticeContext';
import { usePoses } from '../contexts/PoseContext';

interface JointScore {
  score: number;
  currentAngle?: number;
  targetAngle?: number;
  tolerance?: number;
}

interface PoseState {
  score: number;
  feedback: string[];
  overallAccuracy?: number;
  jointScores?: { [key: string]: JointScore };
  keypoints?: poseDetection.Keypoint[];
}

interface PoseTimer {
  startTime: number;
  elapsedTime: number;
  isActive: boolean;
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
    overallAccuracy: 0,
    jointScores: {}
  });
  const { startSession, endSession, updateSessionAccuracy } = usePractice();
  const { poses } = usePoses();
  const [referenceKeypoints, setReferenceKeypoints] = useState<poseDetection.Keypoint[] | null>(null);

  // Timer state
  const [timer, setTimer] = useState<PoseTimer>({
    startTime: 0,
    elapsedTime: 0,
    isActive: false
  });

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
  const drawKeypoint = (ctx: CanvasRenderingContext2D, keypoint: poseDetection.Keypoint) => {
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
  const drawConnection = (ctx: CanvasRenderingContext2D, from: poseDetection.Keypoint, to: poseDetection.Keypoint) => {
    if (from.score && to.score && from.score > 0.3 && to.score > 0.3) {
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

  // Format time in MM:SS format
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
          
          if (result.overallAccuracy) {
            updateSessionAccuracy(result.overallAccuracy);
          }
          
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
      animationFrame = requestAnimationFrame(detectPoseFrame);
    };

    detectPoseFrame();
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isRecording, poseId, updateSessionAccuracy]);

  // Timer effect - Moved outside pose detection for independent operation
  useEffect(() => {
    let intervalId: number;

    if (timer.isActive) {
      // Update timer immediately
      setTimer(prev => ({
        ...prev,
        elapsedTime: (Date.now() - prev.startTime) / 1000
      }));

      // Then set up interval
      intervalId = window.setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsedTime: (Date.now() - prev.startTime) / 1000
        }));
      }, 100); // Update more frequently for smoother display
    }

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [timer.isActive, timer.startTime]);

  // Start/stop recording and timer
  const toggleRecording = () => {
    if (!isRecording && poseId) {
      const startTime = Date.now();
      startSession(poseId);
      setTimer({
        startTime,
        elapsedTime: 0,
        isActive: true
      });
      setIsRecording(true);
    } else {
      if (poseState.overallAccuracy) {
        endSession(poseState.overallAccuracy);
      }
      setTimer(prev => ({
        ...prev,
        isActive: false
      }));
      setIsRecording(false);
    }
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
    <div className="relative">
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Back button and pose name */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>
              <h1 className="text-2xl font-bold ml-4">
                {poses.find(p => p.id === poseId)?.name || 'Practice Session'}
              </h1>
            </div>
          </div>

          {/* Main content */}
          <div className="flex flex-col h-full">
            {/* Main content area */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Left column - Camera view and timer */}
              <div className="relative flex flex-col">
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                  {!isRecording && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                      <Camera className="w-16 h-16 text-white opacity-50" />
                    </div>
                  )}
                </div>
                
                {/* Timer display below camera */}
                <div className="mt-4 p-4 bg-gray-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-primary-400 mr-2" />
                    <span className="text-2xl font-mono text-white">
                      {formatTime(timer.elapsedTime)}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={toggleRecording}
                      className="p-2 rounded-full bg-primary-500 hover:bg-primary-600 transition-colors"
                    >
                      {isRecording ? (
                        <Pause className="w-5 h-5 text-white" />
                      ) : (
                        <Play className="w-5 h-5 text-white" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setTimer({ startTime: Date.now(), elapsedTime: 0, isActive: false });
                        setIsRecording(false);
                      }}
                      className="p-2 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right column - Reference pose and feedback */}
              <div className="flex flex-col space-y-4">
                <PoseReferenceImage
                  poseId={poseId || ''}
                  onPoseDetected={handleReferenceDetected}
                />
                <PoseFeedback
                  accuracy={poseState.overallAccuracy || 0}
                  feedback={poseState.feedback}
                  jointScores={poseState.jointScores || {}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticePage; 