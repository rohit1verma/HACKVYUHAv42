import React from 'react';
import { Activity } from 'lucide-react';

interface JointScore {
  score: number;
  currentAngle?: number;
  targetAngle?: number;
  tolerance?: number;
}

interface PoseFeedbackProps {
  accuracy: number;
  feedback: string[];
  jointScores: { [key: string]: JointScore };
}

const PoseFeedback: React.FC<PoseFeedbackProps> = ({ accuracy, feedback, jointScores }) => {
  const getAccuracyColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">Real-time Feedback</h2>
        <Activity className="w-5 h-5 text-primary-500" />
      </div>

      {/* Overall Accuracy */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700">Overall Accuracy</h3>
        <div className={`text-2xl font-bold ${getAccuracyColor(accuracy)}`}>
          {Math.round(accuracy * 100)}%
        </div>
      </div>

      {/* Joint Scores */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Joint Analysis</h3>
        <div className="space-y-3">
          {Object.entries(jointScores).map(([joint, score]) => (
            <div key={joint} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{joint.replace(/_/g, ' ')}</span>
              <span className={`font-medium ${getAccuracyColor(score.score)}`}>
                {Math.round(score.score * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Suggestions</h3>
          <ul className="space-y-2">
            {feedback.map((message, index) => (
              <li key={index} className="text-sm text-gray-600">
                • {message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PoseFeedback; 