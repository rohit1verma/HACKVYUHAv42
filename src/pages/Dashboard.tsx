import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Clock, Star, Activity, TrendingUp, Calendar, BarChart2, Target, ChevronRight } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, BarElement, ChartData } from 'chart.js';
import { Line, Radar, Bar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { usePoses } from '../contexts/PoseContext';
import { usePractice } from '../contexts/PracticeContext';
import { TestDashboard } from '../components/TestDashboard';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface JointScores {
  [key: string]: {
    score: number;
  };
}

interface PracticeSession {
  poseId: string;
  startTime: number;
  endTime?: number;
  accuracyHistory: number[];
  averageAccuracy: number;
  duration: number;
}

interface LineChartData extends ChartData<'line'> {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

interface RadarChartData extends ChartData<'radar'> {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    pointBackgroundColor: string;
  }[];
}

interface BarChartData extends ChartData<'bar'> {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
  }[];
}

interface PoseProgress {
  attempted: boolean;
  mastered: boolean;
  accuracy?: Array<{
    score: number;
    timestamp: number;
    feedback: string[];
  }>;
}

const POSE_CATEGORIES = ['Standing Poses', 'Balancing Poses', 'Seated Poses', 'Resting Poses', 'Inverted Poses'];

const JOINT_CATEGORIES = {
  'Head & Neck': ['neck', 'spine_upper'],
  'Upper Body': ['left_shoulder', 'right_shoulder', 'chest'],
  'Arms': ['left_elbow', 'right_elbow', 'left_wrist', 'right_wrist'],
  'Core': ['spine_middle', 'waist', 'pelvis'],
  'Legs': ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle']
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { poses, userProgress } = usePoses();
  const { getDailyStats, getTotalStats, sessions } = usePractice();
  
  const [progressData, setProgressData] = useState<LineChartData>({
    labels: [],
    datasets: []
  });
  
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const [radarData, setRadarData] = useState<RadarChartData>({
    labels: POSE_CATEGORIES,
    datasets: [
      {
        label: 'Category Accuracy',
        data: [0, 0, 0, 0, 0],
        backgroundColor: 'rgba(126, 87, 194, 0.2)',
        borderColor: '#7e57c2',
        pointBackgroundColor: '#7e57c2',
      }
    ],
  });

  const [jointProgressData, setJointProgressData] = useState<any>({
    labels: [],
    datasets: []
  });

  // Generate recommendations
  useEffect(() => {
    const generateRecommendations = () => {
      const recommendations: string[] = [];
      const { totalSessions, averageAccuracy } = getTotalStats();

      // Recommend based on practice frequency
      if (totalSessions < 5) {
        recommendations.push("Try to practice at least 3 times this week to build a habit");
      }

      // Recommend based on accuracy
      if (averageAccuracy < 70) {
        recommendations.push("Focus on basic poses to improve your form");
      }

      // Recommend based on pose mastery
      const unmastered = poses.filter(pose => !userProgress[pose.id]?.mastered);
      if (unmastered.length > 0) {
        const nextPose = unmastered[0];
        recommendations.push(`Practice ${nextPose.name} to expand your pose repertoire`);
      }

      setRecommendations(recommendations);
    };

    generateRecommendations();
  }, [poses, userProgress, getTotalStats]);

  useEffect(() => {
    // Get real data for the last 7 days
    const { dates, accuracies, minutes } = getDailyStats(7);

    setProgressData({
      labels: dates,
      datasets: [
        {
          label: 'Pose Accuracy (%)',
          data: accuracies,
          borderColor: '#7e57c2',
          backgroundColor: 'rgba(126, 87, 194, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Practice Minutes',
          data: minutes,
          borderColor: '#4dd0e1',
          backgroundColor: 'rgba(77, 208, 225, 0.1)',
          tension: 0.3,
        },
      ],
    });
  }, [getDailyStats]);

  // Calculate average accuracy for each pose category
  useEffect(() => {
    const categoryAccuracies = POSE_CATEGORIES.map(category => {
      const categoryPoses = poses.filter(pose => 
        pose.category?.basic === category && (userProgress[pose.id] as PoseProgress)?.accuracy
      );
      
      if (categoryPoses.length === 0) return 0;

      const totalAccuracy = categoryPoses.reduce((sum, pose) => {
        const poseAccuracies = (userProgress[pose.id] as PoseProgress)?.accuracy || [];
        if (poseAccuracies.length === 0) return sum;
        
        const poseAverage = poseAccuracies.reduce((acc: number, curr: { score: number }) => acc + curr.score, 0) / poseAccuracies.length;
        return sum + poseAverage;
      }, 0);

      return Math.round((totalAccuracy / categoryPoses.length) * 100);
    });

    setRadarData(prev => ({
      ...prev,
      datasets: [{
        ...prev.datasets[0],
        data: categoryAccuracies
      }]
    }));
  }, [poses, userProgress]);

  // Calculate joint-specific progress
  useEffect(() => {
    if (!sessions.length) return;

    // Get the last 5 sessions
    const recentSessions = sessions.slice(-5);
    
    // Calculate average joint scores for each session
    const jointData = recentSessions.map(session => {
      const jointScores: { [key: string]: number } = {};
      
      // Calculate average scores for each joint category
      Object.entries(JOINT_CATEGORIES).forEach(([category, joints]) => {
        // Use averageAccuracy as a fallback when joint scores are not available
        const categoryScore = session.averageAccuracy || 0;
        jointScores[category] = categoryScore;
      });
      
      return {
        date: new Date(session.startTime).toLocaleDateString(),
        scores: jointScores
      };
    });

    setJointProgressData({
      labels: jointData.map(d => d.date),
      datasets: Object.keys(JOINT_CATEGORIES).map((category, index) => ({
        label: category,
        data: jointData.map(d => Math.round(d.scores[category] * 100)),
        backgroundColor: [
          'rgba(126, 87, 194, 0.8)',
          'rgba(77, 208, 225, 0.8)',
          'rgba(255, 167, 38, 0.8)',
          'rgba(102, 187, 106, 0.8)',
          'rgba(240, 98, 146, 0.8)'
        ][index],
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1
      }))
    });
  }, [sessions]);

  // Get real stats
  const { totalSessions, totalMinutes, averageAccuracy } = getTotalStats();
  const masteredPoses = Object.entries(userProgress).filter(([_, status]) => status.mastered).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name}!</h1>
          <p className="text-gray-600">Here's your yoga journey at a glance</p>
        </div>
        <Link
          to="/practice"
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
        >
          Start Practice
        </Link>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-purple-50 rounded-lg p-4 flex items-start">
          <Award className="w-8 h-8 text-purple-600 bg-purple-100 p-1.5 rounded-lg" />
          <div className="ml-3">
            <p className="text-sm text-gray-600">Average Accuracy</p>
            <p className="text-xl font-semibold">{Math.round(averageAccuracy)}%</p>
            <p className="text-xs text-gray-500">Last 7 days</p>
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 flex items-start">
          <Clock className="w-8 h-8 text-orange-600 bg-orange-100 p-1.5 rounded-lg" />
          <div className="ml-3">
            <p className="text-sm text-gray-600">Practice Time</p>
            <p className="text-xl font-semibold">{Math.round(totalMinutes)} mins</p>
            <p className="text-xs text-gray-500">Total practice time</p>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 flex items-start">
          <Calendar className="w-8 h-8 text-green-600 bg-green-100 p-1.5 rounded-lg" />
          <div className="ml-3">
            <p className="text-sm text-gray-600">Sessions</p>
            <p className="text-xl font-semibold">{totalSessions}</p>
            <p className="text-xs text-gray-500">Total practice sessions</p>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 flex items-start">
          <Target className="w-8 h-8 text-yellow-600 bg-yellow-100 p-1.5 rounded-lg" />
          <div className="ml-3">
            <p className="text-sm text-gray-600">Mastered Poses</p>
            <p className="text-xl font-semibold">{masteredPoses}/{poses.length}</p>
            <p className="text-xs text-gray-500">Progress to mastery</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Weekly Progress */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Weekly Progress</h2>
          <div className="h-[300px]">
            <Line
              data={progressData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                  }
                },
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          </div>
        </div>

        {/* Pose Category Progress */}
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Pose Categories</h2>
          <div className="h-[300px]">
            <Radar
              data={radarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 20 }
                  }
                },
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          </div>
        </div>

        {/* Joint Progress */}
        <div className="bg-white rounded-lg p-6 col-span-2">
          <h2 className="text-lg font-semibold mb-4">Joint Alignment Progress</h2>
          <div className="h-[300px]">
            <Bar
              data={jointProgressData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                  }
                },
                plugins: {
                  legend: { position: 'bottom' }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recent Practice Sessions</h2>
          <Link
            to="/practice"
            className="text-purple-600 hover:text-purple-700 flex items-center"
          >
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
        <div className="space-y-4">
          {sessions.slice(-5).reverse().map((session, index) => (
            <Link
              key={index}
              to={`/practice/${session.poseId}`}
              className="block border-b pb-4 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-purple-500 mr-2" />
                  <span className="font-medium">
                    {new Date(session.startTime).toLocaleDateString()}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-sm ${
                  session.averageAccuracy >= 0.85 ? 'bg-green-100 text-green-800' :
                  session.averageAccuracy >= 0.52 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {Math.round(session.averageAccuracy * 100)}% Accuracy
                </span>
              </div>
              <div className="text-sm text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Duration: {Math.round(session.duration)} minutes
              </div>
            </Link>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="mb-2">No practice sessions yet</p>
              <Link
                to="/practice"
                className="text-purple-600 hover:text-purple-700 font-medium"
              >
                Start your first practice
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4">Personalized Recommendations</h2>
          <div className="space-y-3">
            {recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-center text-gray-700">
                <TrendingUp className="h-5 w-5 text-purple-500 mr-2" />
                <span>{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add TestDashboard for simulation */}
      <TestDashboard />
    </div>
  );
};

export default Dashboard;