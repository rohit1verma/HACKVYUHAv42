import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Award, Info, List, User, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePoses } from '../contexts/PoseContext.tsx';
import { useAuth } from '../contexts/AuthContext';

const PoseDetail: React.FC = () => {
  const { poseId } = useParams<{ poseId: string }>();
  const { getPoseById, userProgress, updateProgress } = usePoses();
  const { user } = useAuth();
  
  const pose = getPoseById(poseId || '');
  const [activeTab, setActiveTab] = useState('instructions');
  
  if (!pose) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Pose not found</h2>
        <p className="mt-2 text-gray-600">The pose you're looking for doesn't exist.</p>
        <Link
          to="/poses"
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600"
        >
          Back to Pose Library
        </Link>
      </div>
    );
  }
  
  const progress = userProgress[pose.id] || { attempted: false, mastered: false };
  
  const handleMarkAttempted = () => {
    updateProgress(pose.id, { attempted: true });
  };
  
  const handleMarkMastered = () => {
    updateProgress(pose.id, { attempted: true, mastered: true });
  };

  const getLevelColor = (level?: string) => {
    if (!level) return '';
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <Link
          to="/poses"
          className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Pose Library
        </Link>
      </div>
      
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="md:order-2 h-96 md:h-auto"
          >
            <img
              src={pose.imageUrl || pose.image}
              alt={pose.name}
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="p-6 md:p-8 md:order-1"
          >
            <div className="flex flex-wrap gap-2 mb-4">
              {pose.level && (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getLevelColor(pose.level)}`}>
                  {pose.level.charAt(0).toUpperCase() + pose.level.slice(1)}
                </span>
              )}
              
              {pose.targetAreas?.map((area, index) => (
                <span
                  key={`${area}-${index}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {area.charAt(0).toUpperCase() + area.slice(1)}
                </span>
              ))}
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{pose.name}</h1>
            {pose.sanskritName && (
              <p className="text-lg text-gray-500 italic mb-6">{pose.sanskritName}</p>
            )}
            
            <p className="text-gray-700 mb-6">{pose.description}</p>
            
            {/* Pose-specific Details */}
            {pose.id === 'standing-forward-bend' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Alignment Points</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Hinge from the hips, not the waist</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Keep a micro-bend in the knees</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Lengthen the spine with each exhale</span>
                  </li>
                </ul>
              </div>
            )}

            {pose.id === 'tree' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Balance Tips</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Find a steady drishti (gaze point)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Root down through the standing foot</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Engage your core for stability</span>
                  </li>
                </ul>
              </div>
            )}

            {pose.id === 'warrior1' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Power Points</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Square hips to the front of the mat</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Back heel grounded at 45 degrees</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Strong arms reaching skyward</span>
                  </li>
                </ul>
              </div>
            )}

            {pose.id === 'lotus' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Meditation Setup</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Sit on a cushion for hip elevation</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Keep spine naturally aligned</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Relax shoulders away from ears</span>
                  </li>
                </ul>
              </div>
            )}

            {pose.id === 'headstand' && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Safety First</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Practice near a wall for support</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Build shoulder and core strength first</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Always warm up neck and shoulders</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Default pose details for poses without specific details */}
            {!['standing-forward-bend', 'tree', 'warrior1', 'lotus', 'headstand'].includes(pose.id) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Points</h3>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Focus on proper alignment</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Breathe steadily and deeply</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-gray-700">Listen to your body's limits</span>
                  </li>
                </ul>
              </div>
            )}

            {pose.benefits && pose.benefits.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Benefits</h3>
                <ul className="mb-6">
                  {pose.benefits.map((benefit, index) => (
                    <li key={`benefit-${index}`} className="flex items-start mb-2">
                      <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-600 mr-2">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {pose.modifications && (
              <>
                <h3 className="font-semibold mb-2">Modifications:</h3>
                <div className="space-y-2 text-gray-600">
                  {pose.modifications.general && (
                    <p><span className="font-medium">General:</span> {pose.modifications.general}</p>
                  )}
                  {pose.modifications.male && user?.gender === 'male' && (
                    <p><span className="font-medium">For men:</span> {pose.modifications.male}</p>
                  )}
                  {pose.modifications.female && user?.gender === 'female' && (
                    <p><span className="font-medium">For women:</span> {pose.modifications.female}</p>
                  )}
                </div>
              </>
            )}
            
            <div className="flex space-x-4 mt-8">
              <button
                onClick={handleMarkAttempted}
                disabled={progress.attempted}
                className={`
                  flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm
                  ${progress.attempted
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : 'text-white bg-secondary-500 hover:bg-secondary-600'}
                `}
              >
                {progress.attempted ? 'Attempted' : 'Mark as Attempted'}
              </button>
              
              <button
                onClick={handleMarkMastered}
                disabled={progress.mastered}
                className={`
                  flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm
                  ${progress.mastered
                    ? 'bg-gray-200 text-gray-600 cursor-not-allowed'
                    : 'text-white bg-primary-500 hover:bg-primary-600'}
                `}
              >
                {progress.mastered ? 'Mastered' : 'Mark as Mastered'}
              </button>
            </div>
          </motion.div>
        </div>
        
        {/* Tabs Section */}
        <div className="border-t border-gray-200">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex items-center py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'instructions'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-5 w-5 mr-2" />
              Instructions
            </button>
            
            <button
              onClick={() => setActiveTab('modifications')}
              className={`flex items-center py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'modifications'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="h-5 w-5 mr-2" />
              Modifications
            </button>
            
            <button
              onClick={() => setActiveTab('tips')}
              className={`flex items-center py-4 px-6 text-sm font-medium border-b-2 ${
                activeTab === 'tips'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Info className="h-5 w-5 mr-2" />
              Tips
            </button>
          </div>
          
          <div className="p-6">
            {activeTab === 'instructions' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">How to Practice</h3>
                <ol className="list-decimal pl-5 space-y-4">
                  {pose.id === 'standing-forward-bend' && (
                    <>
                      <li className="text-gray-700">
                        Stand with feet hip-width apart, grounding all four corners of your feet.
                      </li>
                      <li className="text-gray-700">
                        Inhale deeply, lengthening your spine and lifting your chest.
                      </li>
                      <li className="text-gray-700">
                        Exhale and hinge at your hips, keeping your spine long as you fold forward.
                      </li>
                      <li className="text-gray-700">
                        Allow your head and neck to relax, keeping a micro-bend in your knees.
                      </li>
                      <li className="text-gray-700">
                        Hold for 5-8 breaths, lengthening your spine with each exhale.
                      </li>
                      <li className="text-gray-700">
                        To come up, engage your core and roll up slowly, stacking vertebrae by vertebrae.
                      </li>
                    </>
                  )}

                  {pose.id === 'tree' && (
                    <>
                      <li className="text-gray-700">
                        Begin in Mountain Pose, finding a steady point of focus ahead of you.
                      </li>
                      <li className="text-gray-700">
                        Shift your weight onto your left foot, grounding down through all four corners.
                      </li>
                      <li className="text-gray-700">
                        Lift your right foot and place it either above or below your knee (never on the knee).
                      </li>
                      <li className="text-gray-700">
                        Press your foot and inner thigh together, engaging your core for stability.
                      </li>
                      <li className="text-gray-700">
                        Bring your hands to heart center or raise them overhead like branches.
                      </li>
                      <li className="text-gray-700">
                        Hold for 5-10 breaths, then switch sides.
                      </li>
                    </>
                  )}

                  {pose.id === 'warrior1' && (
                    <>
                      <li className="text-gray-700">
                        Step your left foot back 3-4 feet, turning it out at a 45-degree angle.
                      </li>
                      <li className="text-gray-700">
                        Bend your right knee directly over your ankle, keeping your back leg straight.
                      </li>
                      <li className="text-gray-700">
                        Square your hips and shoulders to the front of your mat.
                      </li>
                      <li className="text-gray-700">
                        Raise your arms overhead, palms facing each other or touching.
                      </li>
                      <li className="text-gray-700">
                        Draw your shoulder blades down your back, lifting through your chest.
                      </li>
                      <li className="text-gray-700">
                        Hold for 5-8 breaths, then repeat on the other side.
                      </li>
                    </>
                  )}

                  {pose.id === 'lotus' && (
                    <>
                      <li className="text-gray-700">
                        Sit on a cushion or folded blanket to elevate your hips.
                      </li>
                      <li className="text-gray-700">
                        Cross your legs, bringing your right foot onto your left thigh.
                      </li>
                      <li className="text-gray-700">
                        Slowly bring your left foot onto your right thigh (if accessible).
                      </li>
                      <li className="text-gray-700">
                        Sit tall, lengthening through your spine and relaxing your shoulders.
                      </li>
                      <li className="text-gray-700">
                        Rest your hands on your knees, palms up or down.
                      </li>
                      <li className="text-gray-700">
                        Hold for 1-5 minutes, focusing on steady breathing.
                      </li>
                    </>
                  )}

                  {pose.id === 'headstand' && (
                    <>
                      <li className="text-gray-700">
                        Start in a kneeling position facing a wall, about 6 inches away.
                      </li>
                      <li className="text-gray-700">
                        Interlace your fingers, creating a firm base with your forearms on the mat.
                      </li>
                      <li className="text-gray-700">
                        Place the crown of your head on the mat, cradled by your hands.
                      </li>
                      <li className="text-gray-700">
                        Walk your feet in closer, lifting your hips above your shoulders.
                      </li>
                      <li className="text-gray-700">
                        Engage your core and slowly lift one leg at a time to vertical.
                      </li>
                      <li className="text-gray-700">
                        Hold for 10-60 seconds, maintaining steady breath and alignment.
                      </li>
                    </>
                  )}

                  {pose.id === 'downward-dog' && (
                    <>
                      <li className="text-gray-700">
                        Start on hands and knees in a tabletop position.
                      </li>
                      <li className="text-gray-700">
                        Spread your fingers wide and tuck your toes under.
                      </li>
                      <li className="text-gray-700">
                        Lift your knees off the mat, pressing your hips up and back.
                      </li>
                      <li className="text-gray-700">
                        Keep a micro-bend in your knees if hamstrings are tight.
                      </li>
                      <li className="text-gray-700">
                        Press firmly through your hands, rotating your upper arms outward.
                      </li>
                      <li className="text-gray-700">
                        Hold for 5-8 breaths, pedaling your feet to warm up.
                      </li>
                    </>
                  )}

                  {/* Default instructions for poses without specific steps */}
                  {!['standing-forward-bend', 'tree', 'warrior1', 'lotus', 'headstand', 'downward-dog'].includes(pose.id) && (
                    <>
                      <li className="text-gray-700">
                        Start by standing at the top of your mat with feet hip-width apart.
                      </li>
                      <li className="text-gray-700">
                        Engage your core and draw your shoulder blades down your back.
                      </li>
                      <li className="text-gray-700">
                        Breathe deeply and move with awareness as you transition into the pose.
                      </li>
                      <li className="text-gray-700">
                        Hold the pose for 5-10 breaths, focusing on proper alignment.
                      </li>
                      <li className="text-gray-700">
                        To release, exhale and return to the starting position with control.
                      </li>
                    </>
                  )}
                </ol>
              </div>
            )}
            
            {activeTab === 'modifications' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Modifications</h3>
                
                {pose.modifications ? (
                  <div className="space-y-4">
                    {pose.modifications.female && user?.gender === 'female' && (
                      <div className="bg-pink-50 p-4 rounded-md">
                        <h4 className="font-medium text-pink-800 mb-2">For Women</h4>
                        <p className="text-pink-700">{pose.modifications.female}</p>
                      </div>
                    )}
                    
                    {pose.modifications.male && user?.gender === 'male' && (
                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="font-medium text-blue-800 mb-2">For Men</h4>
                        <p className="text-blue-700">{pose.modifications.male}</p>
                      </div>
                    )}
                    
                    {pose.modifications.general && (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h4 className="font-medium text-gray-800 mb-2">General Modifications</h4>
                        <p className="text-gray-700">{pose.modifications.general}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-700">
                    If you have limited flexibility or strength, use props like blocks or straps to
                    support your practice. Always listen to your body and modify as needed.
                  </p>
                )}
              </div>
            )}
            
            {activeTab === 'tips' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Practice Tips</h3>
                <ul className="space-y-4">
                  {pose.id === 'standing-forward-bend' && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Focus on Length:</strong> Prioritize lengthening your spine over touching your toes.
                          The goal is to create space, not force the stretch.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Morning Practice:</strong> Best practiced in the morning to
                          warm up the spine and hamstrings gently.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Props:</strong> Use blocks under your hands if you can't reach
                          the floor comfortably. This maintains proper alignment.
                        </span>
                      </li>
                    </>
                  )}

                  {pose.id === 'tree' && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Drishti Practice:</strong> Choose a non-moving point at eye level.
                          This helps maintain balance and focus.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Growth:</strong> Start with foot at ankle, progress to calf,
                          then inner thigh as balance improves.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Wobbling:</strong> It's normal! Each day is different.
                          Embrace the wobbles as strengthening opportunities.
                        </span>
                      </li>
                    </>
                  )}

                  {pose.id === 'warrior1' && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Hip Alignment:</strong> Keep checking that your front hip isn't
                          lifting higher than the back hip.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Back Heel:</strong> Press the back heel down firmly.
                          This creates stability and strengthens the legs.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Energy Lines:</strong> Imagine energy flowing up from your
                          back foot through your fingertips.
                        </span>
                      </li>
                    </>
                  )}

                  {pose.id === 'lotus' && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Hip Preparation:</strong> Always warm up your hips before
                          attempting full lotus. Try hip openers first.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Knee Safety:</strong> Never force the pose. If you feel
                          knee pain, try half lotus or easy pose instead.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Meditation:</strong> Focus on your breath rather than
                          achieving a perfect pose. The mind-body connection is key.
                        </span>
                      </li>
                    </>
                  )}

                  {pose.id === 'headstand' && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Foundation First:</strong> Master dolphin pose and forearm
                          plank before attempting headstand.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Wall Support:</strong> Use the wall until you develop
                          the strength and confidence for freestanding practice.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Exit Strategy:</strong> Always plan your exit before
                          entering. Know how to come down safely.
                        </span>
                      </li>
                    </>
                  )}

                  {pose.id === 'downward-dog' && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Hand Pressure:</strong> Spread fingers wide and press
                          through the knuckles to protect wrists.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Pedal the Feet:</strong> Alternate bending each knee to
                          release tight calves and hamstrings.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Distance:</strong> Adjust the distance between hands and
                          feet until you find your optimal length.
                        </span>
                      </li>
                    </>
                  )}

                  {/* Default tips for poses without specific tips */}
                  {!['standing-forward-bend', 'tree', 'warrior1', 'lotus', 'headstand', 'downward-dog'].includes(pose.id) && (
                    <>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Breath Awareness:</strong> Maintain steady, deep breathing
                          throughout the pose. Avoid holding your breath during challenging moments.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Alignment:</strong> Focus on proper alignment over depth.
                          It's better to practice with correct form than to push too far.
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary-100 text-primary-600 mr-3 mt-0.5">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 15.707a1 1 0 010-1.414l5-5a1 1 0 011.414 0l5 5a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span className="text-gray-700">
                          <strong className="text-gray-900">Listen to Your Body:</strong> Honor your edge and never
                          push through pain. Discomfort is normal, but pain is a signal to back off.
                        </span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <Link
          to="/poses"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-500 hover:bg-primary-600"
        >
          <Award className="mr-2 h-5 w-5" />
          Practice This Pose
        </Link>
      </div>
      
      <div className="mt-4 md:mt-0">
        <Link
          to="/poses"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
        >
          <ChevronLeft className="h-5 w-5 mr-2" />
          Back to Poses
        </Link>
        <Link
          to={`/practice/${pose.id}`}
          className="ml-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
        >
          Start Practice
        </Link>
      </div>
    </div>
  );
};

export default PoseDetail;