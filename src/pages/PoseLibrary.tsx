import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Filter, ChevronLeft, ChevronRight, Award, Play, Download, AlertCircle } from 'lucide-react';
import { usePoses, Pose } from '../contexts/PoseContext.tsx';

interface PoseCardProps {
  pose: Pose;
  onClick: () => void;
  userProgress: Record<string, { attempted: boolean; mastered: boolean }>;
  getAccuracyColor: (accuracy: number | null) => string;
  getAverageAccuracy: (accuracyData?: { timestamp: number; score: number; feedback: string[] }[]) => number | null;
}

const PoseCard: React.FC<PoseCardProps> = ({ 
  pose, 
  onClick, 
  userProgress,
  getAccuracyColor,
  getAverageAccuracy 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow overflow-hidden"
    >
      <div className="cursor-pointer" onClick={onClick}>
        <div className="h-48 w-full overflow-hidden relative group">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}
          <img
            src={imageError ? '/images/placeholder.jpg' : (pose.imageUrl || pose.image)}
            alt={pose.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onError={() => {
              setImageError(true);
              setImageLoaded(true);
            }}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-medium text-gray-900">{pose.name}</h3>
          <p className="mt-1 text-sm text-gray-500">{pose.description}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {userProgress[pose.id]?.mastered && (
                <Award className="h-5 w-5 text-yellow-500" />
              )}
              {pose.accuracy && pose.accuracy.length > 0 && (
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${getAccuracyColor(
                    getAverageAccuracy(pose.accuracy)
                  )}`}
                >
                  {Math.round(getAverageAccuracy(pose.accuracy) || 0)}%
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {pose.category?.basic}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PoseLibrary: React.FC = () => {
  const navigate = useNavigate();
  const { poses, loading, userProgress, datasetStatus, downloadDatasetImages } = usePoses();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Group poses by category
  const posesByCategory = poses.reduce((acc, pose) => {
    const category = pose.category?.basic || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(pose);
    return acc;
  }, {} as Record<string, Pose[]>);

  const filteredPoses = poses.filter(pose => {
    const matchesSearch = pose.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || pose.category?.basic === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getAccuracyColor = (accuracy: number | null) => {
    if (!accuracy) return 'bg-gray-100 text-gray-600';
    if (accuracy >= 90) return 'bg-green-100 text-green-800';
    if (accuracy >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getAverageAccuracy = (accuracyData?: { timestamp: number; score: number; feedback: string[] }[]) => {
    if (!accuracyData || accuracyData.length === 0) return null;
    const sum = accuracyData.reduce((acc, curr) => acc + curr.score, 0);
    return sum / accuracyData.length;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pose Library</h1>
          <p className="mt-1 text-lg text-gray-500">
            Explore and practice different yoga poses
          </p>
        </div>
        {datasetStatus !== 'ready' && (
          <button
            onClick={downloadDatasetImages}
            disabled={datasetStatus === 'downloading'}
            className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300"
          >
            <Download className="h-5 w-5 mr-2" />
            {datasetStatus === 'downloading' ? 'Downloading...' : 'Download Dataset'}
          </button>
        )}
      </div>

      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search poses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            />
          </div>
          <div className="flex-shrink-0">
            <div className="relative inline-block text-left">
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="">All Categories</option>
                {Object.keys(posesByCategory).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPoses.map((pose) => (
            <PoseCard
              key={pose.id}
              pose={pose}
              onClick={() => navigate(`/pose/${pose.id}`)}
              userProgress={userProgress}
              getAccuracyColor={getAccuracyColor}
              getAverageAccuracy={getAverageAccuracy}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PoseLibrary;