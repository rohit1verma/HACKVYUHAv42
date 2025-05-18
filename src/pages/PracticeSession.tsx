import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Camera, Play, Pause, RefreshCw, Clock, Activity, X } from 'lucide-react';
import { usePoses } from '../contexts/PoseContext';
import { usePractice } from '../contexts/PracticeContext';
import { detectPose } from '../utils/poseDetection';
import PoseFeedback from '../components/PoseFeedback';

interface ConfidenceLevel {  level: 'high' | 'medium' | 'low';  color: string;  message: string;}

const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= 0.9) {
    return {
      level: 'high',
      color: 'text-green-500',
      message: 'Perfect form'
    };
  } else if (score >= 0.7) {
    return {
      level: 'medium',
      color: 'text-yellow-500',
      message: 'Good form'
    };
  } else {
    return {
      level: 'low',
      color: 'text-red-500',
      message: 'Keep practicing'
    };
  }
};

interface JointScore {  score: number;  currentAngle?: number;  targetAngle?: number;  tolerance?: number;}

interface JointFeedback {  name: string;  score: number;  message: string;  confidence?: ConfidenceLevel;  currentAngle?: number;  targetAngle?: number;  tolerance?: number;}

interface PoseResult {
  score: number;
  feedback: string[];
  jointScores: { [key: string]: JointScore };
  keypoints?: Array<{
    name: string;
    x: number;
    y: number;
    score: number;
  }>;
  overallAccuracy: number;
  referenceImage?: string;
}

interface PoseAccuracy {
  timestamp: number;
  score: number;
  feedback: string[];
  sessionData?: {
    duration: number;
    stablePercentage: number;
    environmentScore: number;
    jointScores: Record<string, number>;
  };
}

interface PosePoint {
  x: number;
  y: number;
  name: string;
  score?: number;
}

interface PoseConnections {
  points: PosePoint[];
  connections: string[][];
}

interface PoseReferencePoints {
  'standing-forward-bend': PoseConnections;
  'tree': PoseConnections;
  [key: string]: PoseConnections;
}

const POSE_REFERENCE_POINTS: PoseReferencePoints = {
  'standing-forward-bend': {
    points: [
      { x: 50, y: 30, name: 'head' },
      { x: 50, y: 40, name: 'neck' },
      { x: 35, y: 45, name: 'leftShoulder' },
      { x: 65, y: 45, name: 'rightShoulder' },
      { x: 25, y: 55, name: 'leftElbow' },
      { x: 75, y: 55, name: 'rightElbow' },
      { x: 20, y: 65, name: 'leftWrist' },
      { x: 80, y: 65, name: 'rightWrist' },
      { x: 45, y: 60, name: 'leftHip' },
      { x: 55, y: 60, name: 'rightHip' },
      { x: 40, y: 75, name: 'leftKnee' },
      { x: 60, y: 75, name: 'rightKnee' },
      { x: 35, y: 90, name: 'leftAnkle' },
      { x: 65, y: 90, name: 'rightAnkle' }
    ],
    connections: [
      ['head', 'neck'],
      ['neck', 'leftShoulder'],
      ['neck', 'rightShoulder'],
      ['leftShoulder', 'leftElbow'],
      ['rightShoulder', 'rightElbow'],
      ['leftElbow', 'leftWrist'],
      ['rightElbow', 'rightWrist'],
      ['leftShoulder', 'leftHip'],
      ['rightShoulder', 'rightHip'],
      ['leftHip', 'rightHip'],
      ['leftHip', 'leftKnee'],
      ['rightHip', 'rightKnee'],
      ['leftKnee', 'leftAnkle'],
      ['rightKnee', 'rightAnkle']
    ]
  },
  'tree': {
    points: [
      { x: 50, y: 10, name: 'head' },
      { x: 50, y: 20, name: 'neck' },
      { x: 35, y: 30, name: 'leftShoulder' },
      { x: 65, y: 30, name: 'rightShoulder' },
      { x: 20, y: 45, name: 'leftElbow' },
      { x: 80, y: 45, name: 'rightElbow' },
      { x: 15, y: 60, name: 'leftWrist' },
      { x: 85, y: 60, name: 'rightWrist' },
      { x: 45, y: 50, name: 'leftHip' },
      { x: 55, y: 50, name: 'rightHip' },
      { x: 45, y: 70, name: 'leftKnee' },
      { x: 65, y: 60, name: 'rightKnee' },
      { x: 45, y: 90, name: 'leftAnkle' },
      { x: 55, y: 45, name: 'rightAnkle' }
    ],
    connections: [
      ['head', 'neck'],
      ['neck', 'leftShoulder'],
      ['neck', 'rightShoulder'],
      ['leftShoulder', 'leftElbow'],
      ['rightShoulder', 'rightElbow'],
      ['leftElbow', 'leftWrist'],
      ['rightElbow', 'rightWrist'],
      ['leftShoulder', 'leftHip'],
      ['rightShoulder', 'rightHip'],
      ['leftHip', 'rightHip'],
      ['leftHip', 'leftKnee'],
      ['rightHip', 'rightKnee'],
      ['leftKnee', 'leftAnkle'],
      ['rightKnee', 'rightAnkle']
    ]
  },
  // Add other poses here...
};

interface PoseReferenceOverlayProps {
  poseType: keyof typeof POSE_REFERENCE_POINTS;
  opacity?: number;
}

const PoseReferenceOverlay: React.FC<PoseReferenceOverlayProps> = ({ poseType, opacity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const referencePoints = POSE_REFERENCE_POINTS[poseType];
    if (!referencePoints) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Set transparency
    ctx.globalAlpha = opacity;

    // Draw reference points
    referencePoints.points.forEach(point => {
      ctx.fillStyle = '#4CAF50';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw connections
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    referencePoints.connections.forEach(([start, end]) => {
      const startPoint = referencePoints.points.find(p => p.name === start);
      const endPoint = referencePoints.points.find(p => p.name === end);

      if (startPoint && endPoint) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
      }
    });

    // Reset transparency
    ctx.globalAlpha = 1;
  }, [poseType, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
};

interface PoseState {
  score: number;
  feedback: string[];
  overallAccuracy: number;
  jointScores: Record<string, number>;
  keypoints?: Array<{
    name: string;
    x: number;
    y: number;
    score: number;
  }>;
  metadata?: {
    poseId: string;
    startTime: number;
    environmentData: {
      deviceType: string;
      lightingScore: number;
      frameRate: number;
      resolution: {
        width: number;
        height: number;
      };
    };
  };
  lastUpdate?: number;
}

interface Pose {
  id: string;
  name: string;
  difficulty: string;
  benefits?: string[];
  imageUrl?: string;
  description?: string;
  level?: string;
}

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface CameraSettings {
  resolution: 'sd' | 'hd' | 'fullHd';
  frameRate: number;
  facingMode: 'user' | 'environment';
}

interface VideoConstraints {
  width: { exact: number };
  height: { exact: number };
  frameRate: { exact: number };
  deviceId?: { exact: string };
}

interface PoseMatchingMetrics {
  overallAccuracy: number;
  jointAccuracies: Record<string, number>;
  angleDeviations: Record<string, number>;
  stabilityScore: number;
  alignmentScore: number;
}

interface PoseDetectionResult {
  keypoints: Array<{
    name: string;
    x: number;
    y: number;
    score: number;
  }>;
  score: number;
  angles: {
    [key: string]: {
      angle: number;
      confidence: number;
    };
  };
}

// Helper function to calculate variance for stability check
const calculateVariance = (numbers: number[]): number => {
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
};

const PracticeSession: React.FC = () => {
  const { poseId } = useParams<{ poseId: string }>();
  const navigate = useNavigate();
  const { getPoseById, updatePoseAccuracy } = usePoses();
  const { startSession, updateSessionAccuracy, endSession, sessions } = usePractice();
  
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);
  const [poseState, setPoseState] = useState<PoseState>({
    score: 0,
    feedback: [],
    overallAccuracy: 0,
    jointScores: {}
  });

  const pose = getPoseById(poseId || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [jointFeedback, setJointFeedback] = useState<JointFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Add stability tracking
  const [confidenceHistory, setConfidenceHistory] = useState<number[]>([]);
  const [stableScore, setStableScore] = useState<number>(0);
  const [isStable, setIsStable] = useState<boolean>(false);
  const confidenceWindowSize = 10; // Number of frames to consider for stability

  // Enhanced accuracy calculation with weighted scoring and stability
  const calculateWeightedAccuracy = (scores: number[]): number => {
    if (scores.length === 0) return 0;
    
    // Apply exponential moving average for smoother transitions
    const alpha = 0.3; // Smoothing factor
    let smoothedScore = scores[0];
    
    for (let i = 1; i < scores.length; i++) {
      smoothedScore = alpha * scores[i] + (1 - alpha) * smoothedScore;
    }
    
    // Apply confidence threshold
    const confidenceThreshold = 0.3;
    if (smoothedScore < confidenceThreshold * 100) {
      return 0;
    }
    
    return Math.min(Math.max(smoothedScore, 0), 100);
  };

  // Enhanced stability tracking with improved thresholds
  const updateConfidenceHistory = (newScore: number) => {
    setConfidenceHistory(prev => {
      const newHistory = [...prev, newScore].slice(-confidenceWindowSize);
      
      if (newHistory.length === confidenceWindowSize) {
        const mean = newHistory.reduce((a, b) => a + b) / confidenceWindowSize;
        const variance = calculateVariance(newHistory);
        
        // Adaptive stability threshold based on mean score
        const stabilityThreshold = mean > 80 ? 15 : mean > 60 ? 20 : 25;
        const isStableNow = variance < stabilityThreshold;
        
        setIsStable(isStableNow);
        if (isStableNow) {
          // Use exponential moving average for stable score
          const stableScoreValue = calculateWeightedAccuracy(newHistory);
          setStableScore(stableScoreValue);
          
          // Only update session accuracy when pose is stable and score is good
          if (stableScoreValue > 50) {
            updateSessionAccuracy(stableScoreValue / 100);
          }
        }
      }
      
      return newHistory;
    });
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        stream.removeTrack(track);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Force reload of video element
    }
  };

  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isCameraDialogOpen, setIsCameraDialogOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraSettings, setCameraSettings] = useState<CameraSettings>({
    resolution: 'hd',
    frameRate: 30,
    facingMode: 'user'
  });

  // Refresh available cameras
  const refreshCameraList = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 4)}`
        }));
      
      setAvailableCameras(videoDevices);
      
      // Select first camera if none selected
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error accessing cameras:', error);
      setError('Failed to access cameras. Please check your camera permissions.');
    }
  };

  // Initialize camera options when component mounts
  useEffect(() => {
    refreshCameraList();
  }, []);

  const getVideoConstraints = () => {
    const resolutionSettings = {
      sd: { width: { exact: 640 }, height: { exact: 480 } },
      hd: { width: { exact: 1280 }, height: { exact: 720 } },
      fullHd: { width: { exact: 1920 }, height: { exact: 1080 } }
    };

    // Start with resolution settings
    const constraints: VideoConstraints = {
      ...resolutionSettings[cameraSettings.resolution],
      frameRate: { exact: cameraSettings.frameRate }
    };

    // Add deviceId if a specific camera is selected
    if (selectedCamera) {
      constraints.deviceId = { exact: selectedCamera };
    }

    return constraints;
  };

  // Setup canvas after video is ready
  const setupCanvas = (videoElement: HTMLVideoElement) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    if (videoElement.videoWidth && videoElement.videoHeight) {
      const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
      canvas.width = Math.round(videoElement.videoHeight * aspectRatio);
      canvas.height = videoElement.videoHeight;
    }
  };

  // Add video element initialization check
  useEffect(() => {
    if (videoRef.current) {
      // Set initial video element properties
      videoRef.current.setAttribute('playsinline', 'true');
      videoRef.current.setAttribute('autoplay', 'true');
      videoRef.current.setAttribute('muted', 'true');
      
      // Add error handling for video element
      const handleVideoError = (e: Event) => {
        const error = (e.target as HTMLVideoElement).error;
        console.error('Video element error:', error);
        setError(`Video element error: ${error?.message}. Please refresh the page.`);
      };

      videoRef.current.addEventListener('error', handleVideoError);

      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('error', handleVideoError);
        }
      };
    }
  }, []);

  // Add video element ready check
  const checkVideoReady = async (videoElement: HTMLVideoElement): Promise<boolean> => {
    return new Promise((resolve) => {
      if (videoElement.readyState >= 2) {
        resolve(true);
        return;
      }

      const handleLoadedData = () => {
        videoElement.removeEventListener('loadeddata', handleLoadedData);
        resolve(true);
      };

      videoElement.addEventListener('loadeddata', handleLoadedData);
    });
  };

  // Update initializeCamera function to use video ready check
  const initializeCamera = async (): Promise<void> => {
    if (!videoRef.current) {
      throw new Error('Video element not found');
    }

    try {
      // Stop any existing streams
      stopCamera();
      
      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      // Request camera access
      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Apply stream to video element
      videoRef.current.srcObject = mediaStream;
      
      // Wait for video to be ready
      const isReady = await checkVideoReady(videoRef.current);
      if (!isReady) {
        throw new Error('Video element not ready');
      }

      // Setup canvas
      if (canvasRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
        const aspectRatio = videoRef.current.videoWidth / videoRef.current.videoHeight;
        canvasRef.current.width = Math.round(videoRef.current.videoHeight * aspectRatio);
        canvasRef.current.height = videoRef.current.videoHeight;
      }

      // Update state
      setStream(mediaStream);
      setError(null);
      setIsCameraDialogOpen(false);
    } catch (err) {
      console.error('Camera initialization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize camera';
      setError(`${errorMessage}. Please refresh the page or try a different browser.`);
      stopCamera();
      throw err;
    }
  };

  // Add browser compatibility check
  useEffect(() => {
    const checkBrowserCompatibility = () => {
      // Check for camera API support
      const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      
      // Check for Safari specifically due to known camera API limitations
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (!hasGetUserMedia) {
        setError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Edge.');
      } else if (isSafari) {
        setError('Safari may have limited camera support. For best results, please use Chrome, Firefox, or Edge.');
      }
    };

    checkBrowserCompatibility();
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Add automatic camera reinitialization when settings change
  useEffect(() => {
    if (isSessionStarted && selectedCamera) {
      initializeCamera();
    }
  }, [selectedCamera, cameraSettings]);

  // Timer management functions
  const startTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    
    console.log('Starting timer');
    const now = Date.now();
    sessionStartTimeRef.current = now;
    setIsTimerActive(true);

    timerIntervalRef.current = setInterval(() => {
      const currentTime = Date.now();
      if (sessionStartTimeRef.current) {
        const elapsedSeconds = Math.floor((currentTime - sessionStartTimeRef.current) / 1000);
        console.log('Timer update:', elapsedSeconds);
        setSessionTime(elapsedSeconds);
      }
    }, 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    console.log('Pausing timer');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerActive(false);
    pausedTimeRef.current = sessionTime;
  }, [sessionTime]);

  const resetTimer = useCallback(() => {
    console.log('Resetting timer');
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerActive(false);
    setSessionTime(0);
    sessionStartTimeRef.current = null;
    pausedTimeRef.current = 0;
  }, []);

  // Handle session state changes
  useEffect(() => {
    if (isSessionStarted) {
      if (isPaused) {
        pauseTimer();
      } else {
        if (sessionTime === 0) {
          // Starting new session
          const now = Date.now();
          sessionStartTimeRef.current = now;
          startTimer();
        } else {
          // Resuming from pause
          startTimer();
        }
      }
    } else {
      // Session ended or not started
      resetTimer();
    }

    // Cleanup on unmount or session end
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isSessionStarted, isPaused, pauseTimer, resetTimer, sessionTime, startTimer]);

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Enhanced cleanup
  useEffect(() => {
    return () => {
      // Clear all intervals and timeouts
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Reset all refs
      sessionStartTimeRef.current = null;
      pausedTimeRef.current = 0;
      // Clear state
      setSessionTime(0);
      setIsTimerActive(false);
      setConfidenceHistory([]);
      setPoseState({
        score: 0,
        feedback: [],
        overallAccuracy: 0,
        jointScores: {}
      });
    };
  }, []);

  const handleStartSession = async () => {
    if (!poseId) return;

    try {
      console.log('Starting new session');
      
      // Reset states
      resetTimer();
      setCurrentScore(0);
      setFeedback([]);
      setJointFeedback([]);
      setConfidenceHistory([]);
      
      // Initialize camera
      await initializeCamera();
      
      if (!error) {
        // Start session
        startSession(poseId);
        setIsSessionStarted(true);
        
        // Start timer
        startTimer();
        
        // Start pose detection
        console.log('Starting pose detection');
        requestAnimationFrame(startPoseDetection);
      }
    } catch (err) {
      console.error('Failed to start session:', err);
      setError('Failed to start practice session. Please try again.');
      resetTimer();
    }
  };

  const handlePauseSession = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    if (newPausedState) {
      // Pausing
      pauseTimer();
    } else {
      // Resuming
      startTimer();
      requestAnimationFrame(startPoseDetection);
    }
  };

  const handleEndSession = () => {
    console.log('Ending session');
    resetTimer();
    stopCamera();
    setIsSessionStarted(false);
    setIsPaused(false);
    navigate('/dashboard');
  };

  const startPoseDetection = async () => {
    if (!videoRef.current || !pose || isPaused) {
      console.log('Skipping pose detection - conditions not met:', {
        videoReady: !!videoRef.current,
        poseExists: !!pose,
        isPaused
      });
      return;
    }

    try {
      const result = await detectPose(videoRef.current, pose.id);
      console.log('Raw pose detection result:', result);
      
      if (result && result.keypoints && result.keypoints.length > 0) {
        // Calculate valid score - ensure it's a number between 0 and 1
        const rawScore = result.overallAccuracy || result.score || 0;
        const validScore = Math.min(Math.max(rawScore, 0), 1);
        const scorePercentage = Math.round(validScore * 100);
        
        console.log('Processed score:', {
          raw: rawScore,
          valid: validScore,
          percentage: scorePercentage
        });

        // Normalize keypoints to match expected type
        const normalizedKeypoints = result.keypoints.map(kp => ({
          name: kp.name || '',
          x: kp.x,
          y: kp.y,
          score: kp.score || 0
        }));

        // Update current score for display
        setCurrentScore(scorePercentage);
        
        // Update pose state
        setPoseState(prev => ({
          ...prev,
          score: validScore,
          overallAccuracy: scorePercentage,
          feedback: result.feedback || [],
          jointScores: Object.fromEntries(
            Object.entries(result.jointScores || {}).map(([key, value]) => [
              key,
              typeof value === 'number' ? value : value.score
            ])
          ),
          keypoints: normalizedKeypoints,
          lastUpdate: Date.now()
        }));

        // Update confidence history
        updateConfidenceHistory(scorePercentage);
      }
    } catch (err) {
      console.error('Pose detection error:', err);
    }
    
    // Continue detection loop if session is active
    if (isSessionStarted && !isPaused) {
      requestAnimationFrame(startPoseDetection);
    }
  };

  // Enhanced joint feedback function
  const getEnhancedJointFeedback = (joint: string, score: number, poseId: string): string => {
    const jointName = joint.replace(/_/g, ' ');
    
    // Pose-specific joint feedback
    switch (poseId) {
      case 'standing-forward-bend':
        switch (joint) {
          case 'spine':
            if (score >= 0.8) return `${jointName}: Perfect forward fold, spine long`;
            if (score >= 0.6) return `${jointName}: Lengthen through your spine more`;
            return `${jointName}: Hinge from hips, keep back flat`;
          case 'knees':
            if (score >= 0.8) return `${jointName}: Perfect micro-bend`;
            if (score >= 0.6) return `${jointName}: Slightly adjust knee bend`;
            return `${jointName}: Keep soft bend in knees`;
          case 'hips':
            if (score >= 0.8) return `${jointName}: Excellent hip hinge`;
            if (score >= 0.6) return `${jointName}: Fold more from the hips`;
            return `${jointName}: Focus on hinging at hip joints`;
          case 'shoulders':
            if (score >= 0.8) return `${jointName}: Shoulders relaxed perfectly`;
            if (score >= 0.6) return `${jointName}: Soften your shoulders`;
            return `${jointName}: Let shoulders hang heavy`;
          case 'neck':
            if (score >= 0.8) return `${jointName}: Perfect neck alignment`;
            if (score >= 0.6) return `${jointName}: Relax neck more`;
            return `${jointName}: Let head hang heavy`;
        }
        break;

      case 'lotus':
        switch (joint) {
          case 'spine':
            if (score >= 0.8) return `${jointName}: Excellent upright posture`;
            if (score >= 0.6) return `${jointName}: Lift through crown more`;
            return `${jointName}: Lengthen spine upward`;
          case 'hips':
            if (score >= 0.8) return `${jointName}: Perfect hip opening`;
            if (score >= 0.6) return `${jointName}: Open hips more`;
            return `${jointName}: Work on hip flexibility`;
          case 'knees':
            if (score >= 0.8) return `${jointName}: Knees well-grounded`;
            if (score >= 0.6) return `${jointName}: Lower knees if possible`;
            return `${jointName}: Support knees if needed`;
          case 'shoulders':
            if (score >= 0.8) return `${jointName}: Shoulders well-balanced`;
            if (score >= 0.6) return `${jointName}: Draw shoulders back`;
            return `${jointName}: Relax shoulders down`;
          case 'neck':
            if (score >= 0.8) return `${jointName}: Neck perfectly aligned`;
            if (score >= 0.6) return `${jointName}: Lengthen neck more`;
            return `${jointName}: Keep neck in line with spine`;
        }
        break;

      case 'tree':
        switch (joint) {
          case 'standing_leg':
            if (score >= 0.8) return `${jointName}: Strong and stable base`;
            if (score >= 0.6) return `${jointName}: Engage standing leg more`;
            return `${jointName}: Ground through standing foot`;
          case 'raised_knee':
            if (score >= 0.8) return `${jointName}: Perfect knee position`;
            if (score >= 0.6) return `${jointName}: Rotate knee out more`;
            return `${jointName}: Open hip for knee rotation`;
          case 'hips':
            if (score >= 0.8) return `${jointName}: Hips perfectly level`;
            if (score >= 0.6) return `${jointName}: Level hips more`;
            return `${jointName}: Keep hips square and level`;
          case 'spine':
            if (score >= 0.8) return `${jointName}: Perfect vertical alignment`;
            if (score >= 0.6) return `${jointName}: Lengthen spine more`;
            return `${jointName}: Keep spine tall`;
          case 'shoulders':
            if (score >= 0.8) return `${jointName}: Shoulders well-balanced`;
            if (score >= 0.6) return `${jointName}: Even out shoulders`;
            return `${jointName}: Keep shoulders level`;
        }
        break;

      case 'headstand':
        switch (joint) {
          case 'forearms':
            if (score >= 0.8) return `${jointName}: Strong foundation`;
            if (score >= 0.6) return `${jointName}: Press forearms down`;
            return `${jointName}: Ground through forearms`;
          case 'shoulders':
            if (score >= 0.8) return `${jointName}: Perfect shoulder stack`;
            if (score >= 0.6) return `${jointName}: Stack shoulders more`;
            return `${jointName}: Align shoulders over elbows`;
          case 'spine':
            if (score >= 0.8) return `${jointName}: Perfect vertical line`;
            if (score >= 0.6) return `${jointName}: Straighten spine more`;
            return `${jointName}: Stack spine vertically`;
          case 'hips':
            if (score >= 0.8) return `${jointName}: Hips perfectly stacked`;
            if (score >= 0.6) return `${jointName}: Stack hips more`;
            return `${jointName}: Align hips over shoulders`;
          case 'legs':
            if (score >= 0.8) return `${jointName}: Legs perfectly straight`;
            if (score >= 0.6) return `${jointName}: Straighten legs more`;
            return `${jointName}: Point toes and engage legs`;
        }
        break;

      case 'corpse':
        switch (joint) {
          case 'spine':
            if (score >= 0.8) return `${jointName}: Perfectly flat back`;
            if (score >= 0.6) return `${jointName}: Release lower back`;
            return `${jointName}: Let spine rest on mat`;
          case 'shoulders':
            if (score >= 0.8) return `${jointName}: Shoulders fully relaxed`;
            if (score >= 0.6) return `${jointName}: Release shoulders more`;
            return `${jointName}: Let shoulders melt down`;
          case 'hips':
            if (score >= 0.8) return `${jointName}: Hips fully released`;
            if (score >= 0.6) return `${jointName}: Release hip tension`;
            return `${jointName}: Let hips be heavy`;
          case 'legs':
            if (score >= 0.8) return `${jointName}: Legs perfectly relaxed`;
            if (score >= 0.6) return `${jointName}: Release leg tension`;
            return `${jointName}: Let legs fall open`;
          case 'neck':
            if (score >= 0.8) return `${jointName}: Neck perfectly aligned`;
            if (score >= 0.6) return `${jointName}: Release neck more`;
            return `${jointName}: Let neck be long`;
        }
        break;
    }
    
    // Default feedback for other joints
    if (score >= 0.8) return `${jointName}: Excellent alignment`;
    if (score >= 0.6) return `${jointName}: Minor adjustment needed`;
    return `${jointName}: Needs adjustment`;
  };

  // Update the drawPoseSkeleton function
  const drawPoseSkeleton = (
    keypoints: Array<{ name: string; x: number; y: number; score: number }>,
    jointScores: Record<string, number>
  ) => {
    if (!canvasRef.current || !videoRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Scale factors for the canvas
    const scaleX = canvasRef.current.width / videoRef.current.videoWidth;
    const scaleY = canvasRef.current.height / videoRef.current.videoHeight;

    // Clear previous frame
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Draw keypoints
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.3) {
        const score = jointScores[keypoint.name] || 0;
        ctx.fillStyle = getEnhancedJointColor(score);
        ctx.beginPath();
        ctx.arc(keypoint.x * scaleX, keypoint.y * scaleY, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw connections
    if (pose?.id) {
      const connections = POSE_REFERENCE_POINTS[pose.id as keyof typeof POSE_REFERENCE_POINTS]?.connections || [];
      connections.forEach(([start, end]) => {
        const startPoint = keypoints.find(kp => kp.name === start);
        const endPoint = keypoints.find(kp => kp.name === end);

        if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
          const avgScore = ((jointScores[start] || 0) + (jointScores[end] || 0)) / 2;
          ctx.strokeStyle = getEnhancedJointColor(avgScore);
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(startPoint.x * scaleX, startPoint.y * scaleY);
          ctx.lineTo(endPoint.x * scaleX, endPoint.y * scaleY);
          ctx.stroke();
        }
      });
    }
  };

  // Enhanced color feedback
  const getEnhancedJointColor = (score: number): string => {
    if (score >= 0.8) return 'rgba(34, 197, 94, 0.9)'; // green with opacity
    if (score >= 0.6) return 'rgba(234, 179, 8, 0.9)'; // yellow with opacity
    return 'rgba(239, 68, 68, 0.9)'; // red with opacity
  };

  const processJointScores = (result: PoseResult) => {
    // Convert joint scores to feedback format
    const newJointFeedback: JointFeedback[] = Object.entries(result.jointScores).map(([joint, score]) => ({
      name: joint,
      score: score.score,
      message: getJointFeedback(joint, score.score),
      currentAngle: score.currentAngle,
      targetAngle: score.targetAngle,
      tolerance: score.tolerance
    }));

    setJointFeedback(newJointFeedback);
    setCurrentScore(result.score);
    setFeedback(result.feedback);
    
    if (result.overallAccuracy && pose?.id) {
      const poseAccuracy: PoseAccuracy = {
        timestamp: Date.now(),
        score: result.overallAccuracy,
        feedback: result.feedback,
        sessionData: {
          duration: sessionTime,
          stablePercentage: (confidenceHistory.filter(score => score >= 70).length / confidenceHistory.length) * 100,
          environmentScore: poseState.metadata?.environmentData.lightingScore || 0,
          jointScores: Object.fromEntries(
            Object.entries(result.jointScores).map(([key, value]) => [
              key,
              typeof value === 'number' ? value : value.score * 100
            ])
          )
        }
      };
      updatePoseAccuracy(pose.id, poseAccuracy);
    }
  };

  const getJointFeedback = (joint: string, score: number): string => {
    if (score >= 90) {
      return "Perfect alignment!";
    } else if (score >= 70) {
      return "Good position, minor adjustments needed";
    } else if (score >= 50) {
      return "Needs some adjustment";
    } else {
      return "Significant correction needed";
    }
  };

  const CameraSettingsDialog = () => (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isCameraDialogOpen ? '' : 'hidden'}`}>
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Camera Settings</h2>
          <button
            onClick={() => refreshCameraList()}
            className="text-sm px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </button>
        </div>

        {/* Camera Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Camera
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
          >
            <option value="">Choose a camera...</option>
            {availableCameras.map((camera) => (
              <option key={camera.deviceId} value={camera.deviceId}>
                {camera.label}
              </option>
            ))}
          </select>
          {availableCameras.length === 0 && (
            <p className="text-sm text-red-500 mt-1">No cameras found. Please check your camera connection.</p>
          )}
        </div>

        {/* Resolution Setting */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resolution
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                cameraSettings.resolution === 'sd'
                  ? 'bg-purple-100 text-purple-700 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCameraSettings(prev => ({ ...prev, resolution: 'sd' }))}
            >
              SD (480p)
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                cameraSettings.resolution === 'hd'
                  ? 'bg-purple-100 text-purple-700 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCameraSettings(prev => ({ ...prev, resolution: 'hd' }))}
            >
              HD (720p)
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                cameraSettings.resolution === 'fullHd'
                  ? 'bg-purple-100 text-purple-700 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCameraSettings(prev => ({ ...prev, resolution: 'fullHd' }))}
            >
              Full HD (1080p)
            </button>
          </div>
        </div>

        {/* Frame Rate Setting */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Frame Rate
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                cameraSettings.frameRate === 24
                  ? 'bg-purple-100 text-purple-700 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCameraSettings(prev => ({ ...prev, frameRate: 24 }))}
            >
              24 FPS
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                cameraSettings.frameRate === 30
                  ? 'bg-purple-100 text-purple-700 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCameraSettings(prev => ({ ...prev, frameRate: 30 }))}
            >
              30 FPS
            </button>
            <button
              className={`px-3 py-2 rounded-md text-sm ${
                cameraSettings.frameRate === 60
                  ? 'bg-purple-100 text-purple-700 border-purple-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setCameraSettings(prev => ({ ...prev, frameRate: 60 }))}
            >
              60 FPS
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setIsCameraDialogOpen(false)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              initializeCamera();
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
          >
            <Camera className="w-4 h-4 mr-2" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );

  if (!pose) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Pose not found</h1>
          <button
            onClick={() => navigate('/poses')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back to Poses
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <CameraSettingsDialog />
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Link
              to="/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold ml-4">{pose?.name || 'Practice Session'}</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* Timer Display */}
            <div className="text-lg font-medium bg-white rounded-lg px-4 py-2 shadow">
              <Clock className="w-5 h-5 inline mr-2 text-primary-500" />
              {formatTime(sessionTime)}
            </div>
            {/* Session Controls */}
            {isSessionStarted ? (
              <>
                <button
                  onClick={handlePauseSession}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center"
                >
                  {isPaused ? (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Resume
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5 mr-2" />
                      Pause
                    </>
                  )}
                </button>
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center"
                >
                  <X className="w-5 h-5 mr-2" />
                  End Session
                </button>
              </>
            ) : (
              <button
                onClick={handleStartSession}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors flex items-center"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Session
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Camera Feed */}
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg p-6">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <div ref={videoContainerRef} className="absolute inset-0">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-contain"
                    playsInline
                    autoPlay
                    muted
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                {isSessionStarted ? (
                  <>
                    {pose?.id && (
                      <PoseReferenceOverlay
                        poseType={pose.id as keyof typeof POSE_REFERENCE_POINTS}
                        opacity={0.3}
                      />
                    )}
                    {/* Accuracy Display */}
                    <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-white">
                        {Math.round(currentScore)}%
                      </div>
                      <div className="text-sm text-gray-300">Accuracy</div>
                    </div>
                    {/* Camera Settings Button */}
                    <button
                      onClick={() => setIsCameraDialogOpen(true)}
                      className="absolute top-4 left-4 bg-black bg-opacity-50 p-2 rounded-lg text-white hover:bg-opacity-75"
                      title="Camera Settings"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <p>Click Start Session to begin practice</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Feedback and Analysis */}
          <div className="space-y-6">
            {isSessionStarted && (
              <>
                <PoseFeedback
                  accuracy={currentScore / 100}
                  feedback={feedback}
                  jointScores={Object.fromEntries(
                    Object.entries(poseState.jointScores).map(([key, value]) => [
                      key,
                      {
                        score: typeof value === 'number' ? value : value,
                        currentAngle: undefined,
                        targetAngle: undefined,
                        tolerance: undefined
                      }
                    ])
                  )}
                />
                
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Session Progress</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Duration</h3>
                      <div className="text-2xl font-bold text-primary-600">
                        {formatTime(sessionTime)}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Stability</h3>
                      <div className="text-2xl font-bold text-primary-600">
                        {isStable ? 'Stable' : 'Adjusting'}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-700 mb-2">Environment</h3>
                      <div className="text-2xl font-bold text-primary-600">
                        {Math.round(poseState.metadata?.environmentData.lightingScore || 0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeSession;