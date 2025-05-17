import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Calendar, Award, BarChart2 } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, RadialLinearScale, ArcElement, Filler } from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';
import { useAuth } from '../contexts/AuthContext';
import { usePoses } from '../contexts/PoseContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

// Define chart data types
interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension?: number;
    pointBackgroundColor?: string;
  }[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { poses, userProgress, currentPose, setCurrentPose } = usePoses();
  
  const [progressData, setProgressData] = useState<ChartData>({
    labels: [],
    datasets: []
  });
  
  const [flexibilityData, setFlexibilityData] = useState<ChartData>({
    labels: [],
    datasets: []
  });

  useEffect(() => {
    // Generate dates for the last 7 days
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    });

    // Update progress data
    setProgressData({
      labels: dates,
      datasets: [
        {
          label: 'Pose Accuracy (%)',
          data: [65, 72, 75, 76, 80, 85, 88],
          borderColor: '#7e57c2',
          backgroundColor: 'rgba(126, 87, 194, 0.1)',
          tension: 0.3,
        },
        {
          label: 'Practice Minutes',
          data: [15, 20, 25, 15, 30, 35, 40],
          borderColor: '#4dd0e1',
          backgroundColor: 'rgba(77, 208, 225, 0.1)',
          tension: 0.3,
        },
      ],
    });

    // Update flexibility data based on LSP categories
    setFlexibilityData({
      labels: ['Standing', 'Sitting', 'Balancing', 'Inverted', 'Reclining'],
      datasets: [
        {
          label: 'Current Progress',
          data: [75, 65, 80, 70, 90],
          backgroundColor: 'rgba(126, 87, 194, 0.2)',
          borderColor: '#7e57c2',
          pointBackgroundColor: '#7e57c2',
        },
        {
          label: 'Starting Level',
          data: [60, 50, 70, 55, 75],
          backgroundColor: 'rgba(77, 208, 225, 0.2)',
          borderColor: '#4dd0e1',
          pointBackgroundColor: '#4dd0e1',
        },
      ],
    });
  }, []);

  // Calculate stats
  const masteredPoses = Object.entries(userProgress).filter(([_, status]) => status.mastered).length;
  const attemptedPoses = Object.entries(userProgress).filter(([_, status]) => status.attempted).length;
  const streak = 5; // Mock streak days
  const totalSessions = 15; // Mock total sessions
  const totalMinutes = 320; // Mock total practice minutes

  // Group poses by category
  const posesByCategory = poses.reduce((acc, pose) => {
    const category = pose.category?.basic || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pose);
    return acc;
  }, {} as Record<string, typeof poses>);
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-1 text-lg text-gray-500">
            Here's your yoga journey at a glance
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/practice"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600"
          >
            Start Practice
          </Link>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-primary-100 rounded-md p-3">
                <Calendar className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Current Streak
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{streak} days</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-secondary-100 rounded-md p-3">
                <Activity className="h-6 w-6 text-secondary-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Sessions
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{totalSessions}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-accent-100 rounded-md p-3">
                <BarChart2 className="h-6 w-6 text-accent-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Minutes
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">{totalMinutes}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Mastered Poses
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {masteredPoses}/{poses.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Your Progress</h2>
          <div className="h-80">
            <Line
              data={progressData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: '#6b7280',
                    },
                    grid: {
                      color: '#e5e7eb',
                    },
                  },
                  x: {
                    ticks: {
                      color: '#6b7280',
                    },
                    grid: {
                      display: false,
                    },
                  },
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      padding: 20,
                      boxWidth: 10,
                      usePointStyle: true,
                    },
                  },
                  tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 10,
                    bodyFont: {
                      size: 12,
                    },
                    titleFont: {
                      size: 14,
                    },
                  },
                },
                elements: {
                  line: {
                    borderWidth: 2,
                  },
                  point: {
                    radius: 4,
                    hoverRadius: 6,
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Category Progress</h2>
          <div className="h-80">
            <Radar
              data={flexibilityData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  r: {
                    angleLines: {
                      display: true,
                      color: '#e5e7eb',
                    },
                    grid: {
                      color: '#e5e7eb',
                    },
                    ticks: {
                      display: false,
                      stepSize: 20,
                    },
                    pointLabels: {
                      font: {
                        size: 12,
                      },
                      color: '#4b5563',
                    },
                    suggestedMin: 0,
                    suggestedMax: 100,
                  },
                },
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      padding: 20,
                      boxWidth: 10,
                      usePointStyle: true,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Personalized Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(posesByCategory).slice(0, 3).map(([category, categoryPoses]) => (
            <div key={category} className="rounded-lg border border-gray-200 p-5">
              <h3 className="font-medium text-gray-900 mb-2">{category}</h3>
              <p className="text-gray-600 text-sm mb-4">
                Try these poses to improve your {category.toLowerCase()} practice:
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                {categoryPoses.slice(0, 3).map(pose => (
                  <li key={pose.id}>• {pose.name}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="flow-root">
          <ul className="-mb-8">
            <li>
              <div className="relative pb-8">
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center ring-8 ring-white">
                      <span className="h-5 w-5 rounded-full bg-green-500"></span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">Completed <span className="font-medium text-gray-900">20-minute practice</span></p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <time dateTime="2024-01-14">Today</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            <li>
              <div className="relative pb-8">
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center ring-8 ring-white">
                      <span className="h-5 w-5 rounded-full bg-primary-500"></span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">Mastered <span className="font-medium text-gray-900">{poses[0]?.name || 'Standing Forward Bend'}</span></p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <time dateTime="2024-01-13">Yesterday</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
            <li>
              <div className="relative pb-8">
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-secondary-100 flex items-center justify-center ring-8 ring-white">
                      <span className="h-5 w-5 rounded-full bg-secondary-500"></span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                    <div>
                      <p className="text-sm text-gray-500">Completed <span className="font-medium text-gray-900">30-minute practice</span></p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <time dateTime="2024-01-12">2 days ago</time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;