import { usePractice } from '../contexts/PracticeContext';

export const simulatePracticeSession = async (
  startSession: (poseId: string) => void,
  updateSessionAccuracy: (accuracy: number) => void,
  endSession: (finalAccuracy: number) => void,
  options: {
    poseId: string;
    duration: number; // in seconds
    accuracies: number[]; // array of accuracies to simulate
    interval?: number; // time between accuracy updates in ms
  }
) => {
  // Start the session
  startSession(options.poseId);
  
  // Calculate time between accuracy updates to spread them across the duration
  const totalDuration = options.duration * 1000; // Convert to milliseconds
  const interval = options.interval || Math.floor(totalDuration / options.accuracies.length);
  
  // Simulate accuracy updates during the session
  for (const accuracy of options.accuracies) {
    await new Promise(resolve => setTimeout(resolve, interval));
    updateSessionAccuracy(accuracy);
  }
  
  // Wait for any remaining duration
  const remainingTime = totalDuration - (interval * options.accuracies.length);
  if (remainingTime > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingTime));
  }
  
  // End the session with the last accuracy
  const finalAccuracy = options.accuracies[options.accuracies.length - 1];
  endSession(finalAccuracy);
};

export const simulateMultipleSessions = async (
  startSession: (poseId: string) => void,
  updateSessionAccuracy: (accuracy: number) => void,
  endSession: (finalAccuracy: number) => void,
  sessions: Array<{
    poseId: string;
    duration: number;
    accuracies: number[];
    interval?: number;
  }>
) => {
  for (const session of sessions) {
    await simulatePracticeSession(
      startSession,
      updateSessionAccuracy,
      endSession,
      {
        ...session,
        interval: session.interval || 1000
      }
    );
    
    // Add a small delay between sessions
    await new Promise(resolve => setTimeout(resolve, 500));
  }
};

// Example usage:
/*
const { startSession, updateSessionAccuracy, endSession } = usePractice();

// Simulate a single session
await simulatePracticeSession(startSession, updateSessionAccuracy, endSession, {
  poseId: 'tree-pose',
  duration: 120, // 2 minutes
  accuracies: [0.75, 0.82, 0.90, 0.85]
});

// Simulate multiple sessions
await simulateMultipleSessions(startSession, updateSessionAccuracy, endSession, [
  {
    poseId: 'tree-pose',
    duration: 120,
    accuracies: [0.75, 0.82, 0.90, 0.85]
  },
  {
    poseId: 'warrior-pose',
    duration: 180,
    accuracies: [0.70, 0.78, 0.85, 0.88]
  }
]);
*/ 