import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Camera, Play, Pause, RefreshCw } from 'lucide-react';
import { usePoses } from '../contexts/PoseContext';
import { detectPose } from '../utils/poseDetection';

interface JointFeedback {
  joint: string;
  score: number;
  feedback: string;
}

const PracticeSession: React.FC = () => {
  const { poseId } = useParams<{ poseId: string }>();
  const navigate = useNavigate();
  const { getPoseById, updatePoseAccuracy } = usePoses();
  const pose = getPoseById(poseId || '');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [jointFeedback, setJointFeedback] = useState<JointFeedback[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!pose) return;
    initializeCamera();
    return () => {
      stopCamera();
    };
  }, [pose]);

  const initializeCamera = async () => {
    try {
      // Try to get the best possible camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          aspectRatio: { ideal: 4/3 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 24 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current && canvasRef.current) {
            // Set video dimensions
            videoRef.current.width = videoRef.current.videoWidth;
            videoRef.current.height = videoRef.current.videoHeight;
            
            // Set canvas dimensions to match video
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            
            console.log('Camera initialized with resolution:', {
              width: videoRef.current.videoWidth,
              height: videoRef.current.videoHeight,
              frameRate: stream.getVideoTracks()[0].getSettings().frameRate
            });
          }
          videoRef.current?.play();
        };
      }
      setStream(stream);
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check your permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startSession = () => {
    setIsSessionStarted(true);
    setIsPaused(false);
    startPoseDetection();
  };

  const pauseSession = () => {
    setIsPaused(true);
  };

  const resumeSession = () => {
    setIsPaused(false);
    startPoseDetection();
  };

  const resetSession = () => {
    setIsSessionStarted(false);
    setIsPaused(false);
    setCurrentScore(0);
    setFeedback([]);
    setJointFeedback([]);
    initializeCamera();
  };

  const startPoseDetection = async () => {
    if (!videoRef.current || !pose || isPaused) return;

    try {
      const result = await detectPose(videoRef.current, pose.id);
      
      if (result) {
        setCurrentScore(result.score);
        
        // Enhanced feedback system
        const enhancedFeedback = [];
        
        // Overall score feedback
        if (result.score >= 90) {
          enhancedFeedback.push("Excellent form! Your alignment is nearly perfect.");
        } else if (result.score >= 70) {
          enhancedFeedback.push("Good form! A few minor adjustments needed.");
        } else if (result.score >= 50) {
          enhancedFeedback.push("Keep practicing! Focus on the main alignment points.");
        } else {
          enhancedFeedback.push("Let's work on the basic alignment first. Take it step by step.");
        }

        // Add pose-specific feedback
        if (result.feedback && result.feedback.length > 0) {
          enhancedFeedback.push(...result.feedback);
        }

        // Add safety reminders based on pose type
        if (pose.id === 'headstand') {
          enhancedFeedback.push("Remember to maintain core engagement for stability.");
          enhancedFeedback.push("If you feel any neck strain, come down slowly.");
        } else if (pose.id === 'standing-forward-bend') {
          enhancedFeedback.push("Keep your knees slightly bent to protect your lower back.");
        }

        setFeedback(enhancedFeedback);
        
        // Enhanced joint feedback with detailed explanations
        if (result.jointScores) {
          const joints = Object.entries(result.jointScores).map(([joint, score]) => {
            const feedback = getEnhancedJointFeedback(joint, score, pose.id);
            return {
              joint,
              score,
              feedback
            };
          });
          setJointFeedback(joints);
        }

        // Draw pose skeleton with improved visual feedback
        if (canvasRef.current && result.keypoints) {
          drawPoseSkeleton(result.keypoints, result.jointScores || {});
        }

        // Save progress if score is good
        if (result.score >= 60) {
          updatePoseAccuracy(pose.id, {
            timestamp: Date.now(),
            score: result.score,
            feedback: enhancedFeedback
          });
        }

        // Continue detection if session is active
        if (isSessionStarted && !isPaused) {
          requestAnimationFrame(() => startPoseDetection());
        }
      }
    } catch (err) {
      console.error('Error in pose detection:', err);
      setError('Error detecting pose. Please ensure you are fully visible in the camera frame.');
      // Don't stop the session immediately, try to recover
      if (isSessionStarted && !isPaused) {
        setTimeout(() => startPoseDetection(), 1000); // Retry after 1 second
      }
    }
  };

  // Enhanced joint feedback function
  const getEnhancedJointFeedback = (joint: string, score: number, poseId: string): string => {
    const jointName = joint.replace(/_/g, ' ');
    
    // Pose-specific joint feedback
    if (poseId === 'standing-forward-bend') {
      switch (joint) {
        case 'spine':
          if (score >= 0.8) return `${jointName}: Excellent spine alignment, maintaining length`;
          if (score >= 0.6) return `${jointName}: Try to lengthen through your spine more`;
          return `${jointName}: Focus on hinging from your hips, not rounding your back`;
        case 'knees':
          if (score >= 0.8) return `${jointName}: Perfect micro-bend in knees`;
          if (score >= 0.6) return `${jointName}: Adjust knee bend slightly`;
          return `${jointName}: Keep a soft bend in your knees to protect your hamstrings`;
        default:
          break;
      }
    } else if (poseId === 'tree') {
      switch (joint) {
        case 'standing_leg':
          if (score >= 0.8) return `${jointName}: Strong and stable foundation`;
          if (score >= 0.6) return `${jointName}: Engage your standing leg more`;
          return `${jointName}: Ground down through your standing foot`;
        case 'hips':
          if (score >= 0.8) return `${jointName}: Hips are well-aligned`;
          if (score >= 0.6) return `${jointName}: Try to level your hips more`;
          return `${jointName}: Keep your hips level and facing forward`;
        default:
          break;
      }
    }
    
    // Default feedback for other joints
    if (score >= 0.8) return `${jointName}: Excellent alignment`;
    if (score >= 0.6) return `${jointName}: Minor adjustment needed`;
    return `${jointName}: Needs significant adjustment`;
  };

  // Enhanced skeleton drawing with better visual feedback
  const drawPoseSkeleton = (keypoints: any[], jointScores: Record<string, number>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;

    // Scale factors for the canvas
    const scaleX = canvasRef.current.width / videoRef.current!.videoWidth;
    const scaleY = canvasRef.current.height / videoRef.current!.videoHeight;

    // Clear previous frame
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Define pose connections for skeleton with improved visibility
    const connections = [
      ['nose', 'left_shoulder'],
      ['nose', 'right_shoulder'],
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

    // Draw connections with improved visibility
    ctx.lineWidth = 3;
    connections.forEach(([from, to]) => {
      const fromPoint = keypoints.find(kp => kp.name === from);
      const toPoint = keypoints.find(kp => kp.name === to);
      
      if (fromPoint && toPoint && fromPoint.score > 0.3 && toPoint.score > 0.3) {
        ctx.beginPath();
        ctx.moveTo(fromPoint.x * scaleX, fromPoint.y * scaleY);
        ctx.lineTo(toPoint.x * scaleX, toPoint.y * scaleY);
        
        // Enhanced color feedback
        const jointScore = Math.min(
          jointScores[from] || 0,
          jointScores[to] || 0
        );
        ctx.strokeStyle = getEnhancedJointColor(jointScore);
        ctx.stroke();
      }
    });

    // Draw joints with improved visibility
    keypoints.forEach(keypoint => {
      if (keypoint.score > 0.3) {
        ctx.beginPath();
        ctx.arc(keypoint.x * scaleX, keypoint.y * scaleY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = getEnhancedJointColor(jointScores[keypoint.name] || 0);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  // Enhanced color feedback
  const getEnhancedJointColor = (score: number): string => {
    if (score >= 0.8) return 'rgba(34, 197, 94, 0.9)'; // green with opacity
    if (score >= 0.6) return 'rgba(234, 179, 8, 0.9)'; // yellow with opacity
    return 'rgba(239, 68, 68, 0.9)'; // red with opacity
  };

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
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-[1920px] mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate(`/pose/${pose.id}`)}
              className="mr-4 p-2 rounded-full hover:bg-gray-200"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{pose.name}</h1>
              {pose.sanskritName && (
                <p className="text-lg text-gray-500 italic">{pose.sanskritName}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Pose Instructions and Reference */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Reference Pose</h2>
                <img
                  src={pose.imageUrl || '/placeholder-pose.jpg'}
                  alt={pose.name}
                  className="w-full h-auto rounded-lg mb-4"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Instructions</h2>
                <div className="space-y-6">
                  {/* Basic Instructions */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">How to Practice</h3>
                    <ol className="list-decimal pl-5 space-y-3">
                      {pose.id === 'standing-forward-bend' && (
                        <>
                          <li className="text-gray-700">Stand at the top of your mat with feet hip-width apart.</li>
                          <li className="text-gray-700">Engage your core and lengthen your spine.</li>
                          <li className="text-gray-700">Hinge at your hips and fold forward with a flat back.</li>
                          <li className="text-gray-700">Let your head and neck relax, allowing arms to hang down.</li>
                          <li className="text-gray-700">Keep a micro-bend in your knees to protect your hamstrings.</li>
                        </>
                      )}
                      {pose.id === 'lotus' && (
                        <>
                          <li className="text-gray-700">Start in a comfortable seated position.</li>
                          <li className="text-gray-700">Bend your right knee and place your right foot on your left thigh.</li>
                          <li className="text-gray-700">Bend your left knee and place your left foot on your right thigh.</li>
                          <li className="text-gray-700">Keep your spine straight and shoulders relaxed.</li>
                          <li className="text-gray-700">Place your hands in a comfortable position on your knees or lap.</li>
                        </>
                      )}
                      {pose.id === 'tree' && (
                        <>
                          <li className="text-gray-700">Begin standing with feet together and arms at your sides.</li>
                          <li className="text-gray-700">Shift your weight onto your left foot and lift your right foot.</li>
                          <li className="text-gray-700">Place your right foot on your left inner thigh or calf (avoid the knee).</li>
                          <li className="text-gray-700">Bring your hands to heart center or raise them overhead like branches.</li>
                          <li className="text-gray-700">Fix your gaze on a steady point to maintain balance.</li>
                        </>
                      )}
                      {pose.id === 'headstand' && (
                        <>
                          <li className="text-gray-700">Start in a kneeling position with forearms on the mat.</li>
                          <li className="text-gray-700">Interlace your fingers and cup the back of your head.</li>
                          <li className="text-gray-700">Walk your feet in closer, lifting your hips high.</li>
                          <li className="text-gray-700">Engage your core and slowly lift your legs up.</li>
                          <li className="text-gray-700">Keep your body in a straight line, maintaining steady breath.</li>
                        </>
                      )}
                      {pose.id === 'corpse' && (
                        <>
                          <li className="text-gray-700">Lie flat on your back with legs extended.</li>
                          <li className="text-gray-700">Allow your feet to fall out to the sides naturally.</li>
                          <li className="text-gray-700">Place arms alongside your body, palms facing up.</li>
                          <li className="text-gray-700">Close your eyes and relax your whole body.</li>
                          <li className="text-gray-700">Focus on deep, natural breathing.</li>
                        </>
                      )}
                    </ol>
              </div>
              
                  {/* Safety Tips */}
                <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Safety Tips</h3>
                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      {pose.id === 'headstand' && (
                        <>
                          <li>Always warm up your neck and shoulders first</li>
                          <li>Practice near a wall for support if needed</li>
                          <li>Come down immediately if you feel any neck strain</li>
                        </>
                      )}
                      {pose.id === 'standing-forward-bend' && (
                        <>
                          <li>Keep a slight bend in your knees</li>
                          <li>Don't force the stretch</li>
                          <li>Roll up slowly when coming up</li>
                        </>
                      )}
                      <li>Listen to your body and don't force any movements</li>
                      <li>Maintain steady, deep breathing throughout</li>
                    </ul>
                </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Camera Feed */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="relative" style={{ paddingTop: '75%' }}> {/* 4:3 aspect ratio for better pose visibility */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  style={{
                    minHeight: '720px',
                    maxHeight: '1080px'
                  }}
                />
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full"
                  width={1920}
                  height={1080}
                />
                
                {/* Score Overlay */}
                {isSessionStarted && (
                  <div className="absolute top-4 right-4 bg-black bg-opacity-75 rounded-xl p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`text-5xl font-bold ${
                        currentScore >= 90 ? 'text-green-500' :
                        currentScore >= 70 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {Math.round(currentScore)}%
                      </div>
                      <div className="text-white text-xl">Accuracy</div>
                    </div>
                  </div>
                )}

                {/* Feedback Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black bg-opacity-75 rounded-xl p-4">
                    <div className="text-white space-y-2">
                      {feedback.map((msg, index) => (
                        <p key={index} className="text-lg">• {msg}</p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="absolute top-4 left-4 right-4 bg-red-500 text-white px-6 py-3 rounded-xl text-lg">
                    {error}
                </div>
              )}
              
                {/* Controls */}
                <div className="absolute bottom-4 right-4 flex space-x-4">
                  <button
                    onClick={isSessionStarted ? (isPaused ? resumeSession : pauseSession) : startSession}
                    className="bg-white rounded-full p-4 shadow-lg hover:bg-gray-100 transform transition-transform hover:scale-110"
                  >
                    {isSessionStarted && !isPaused ? (
                      <Pause className="w-8 h-8 text-red-500" />
                    ) : (
                      <Play className="w-8 h-8 text-green-500" />
                    )}
                  </button>
                  <button
                    onClick={resetSession}
                    className="bg-white rounded-full p-4 shadow-lg hover:bg-gray-100 transform transition-transform hover:scale-110"
                  >
                    <RefreshCw className="w-8 h-8 text-blue-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Joint Analysis */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Joint Analysis</h2>
              <div className="space-y-4">
                {jointFeedback.map((joint, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">{joint.joint}</span>
                      <span className={`font-bold ${
                        joint.score >= 0.8 ? 'text-green-500' :
                        joint.score >= 0.6 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {Math.round(joint.score * 100)}%
                            </span>
                    </div>
                    <p className="text-gray-600">{joint.feedback}</p>
                  </div>
                ))}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeSession;