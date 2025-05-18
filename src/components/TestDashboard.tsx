import React, { useState } from 'react';
import { usePractice } from '../contexts/PracticeContext';
import { simulatePracticeSession, simulateMultipleSessions } from '../utils/testUtils';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const TestDashboard: React.FC = () => {
  const { startSession, updateSessionAccuracy, endSession } = usePractice();
  const [isSimulating, setIsSimulating] = useState(false);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | null;
  }>({ message: '', type: null });

  const showStatus = (message: string, type: 'success' | 'error' | 'info') => {
    setStatus({ message, type });
    setTimeout(() => setStatus({ message: '', type: null }), 3000);
  };

  const handleSimulateSingleSession = async () => {
    try {
      setIsSimulating(true);
      showStatus('Simulating single session...', 'info');
      
      await simulatePracticeSession(startSession, updateSessionAccuracy, endSession, {
        poseId: 'tree-pose',
        duration: 10, // Reduced for testing
        accuracies: [0.75, 0.78, 0.82, 0.85, 0.88, 0.90, 0.85],
        interval: 1000 // 1 second between updates
      });
      
      showStatus('Single session completed successfully!', 'success');
    } catch (error) {
      console.error('Error simulating single session:', error);
      showStatus('Failed to simulate single session', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSimulateMultipleSessions = async () => {
    try {
      setIsSimulating(true);
      showStatus('Simulating multiple sessions...', 'info');
      
      await simulateMultipleSessions(startSession, updateSessionAccuracy, endSession, [
        {
          poseId: 'tree-pose',
          duration: 8, // Reduced for testing
          accuracies: [0.75, 0.78, 0.82, 0.85, 0.88, 0.90, 0.85]
        },
        {
          poseId: 'warrior-pose',
          duration: 8, // Reduced for testing
          accuracies: [0.70, 0.73, 0.75, 0.78, 0.82, 0.85, 0.88]
        },
        {
          poseId: 'downward-dog',
          duration: 8, // Reduced for testing
          accuracies: [0.65, 0.68, 0.72, 0.75, 0.78, 0.80, 0.85]
        }
      ]);
      
      showStatus('Multiple sessions completed successfully!', 'success');
    } catch (error) {
      console.error('Error simulating multiple sessions:', error);
      showStatus('Failed to simulate multiple sessions', 'error');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 space-y-2">
      {status.type && (
        <div
          className={`mb-2 p-2 rounded-lg text-sm flex items-center ${
            status.type === 'success'
              ? 'bg-green-100 text-green-800'
              : status.type === 'error'
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {status.type === 'success' ? (
            <CheckCircle className="w-4 h-4 mr-2" />
          ) : (
            <AlertCircle className="w-4 h-4 mr-2" />
          )}
          {status.message}
        </div>
      )}
      
      <button
        onClick={handleSimulateSingleSession}
        disabled={isSimulating}
        className={`block w-full px-4 py-2 text-white rounded-lg transition-colors ${
          isSimulating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-purple-500 hover:bg-purple-600'
        }`}
      >
        {isSimulating ? 'Simulating...' : 'Simulate Single Session'}
      </button>
      
      <button
        onClick={handleSimulateMultipleSessions}
        disabled={isSimulating}
        className={`block w-full px-4 py-2 text-white rounded-lg transition-colors ${
          isSimulating
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        {isSimulating ? 'Simulating...' : 'Simulate Multiple Sessions'}
      </button>
    </div>
  );
}; 