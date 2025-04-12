'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatTime } from '@/services/bestTimesService';

interface SwimProgressCardProps {
  id: string;
  eventName: string;
  stroke: string;
  distance: string;
  bestTime?: number;
  goalTime?: number;
  showSetGoalButton?: boolean;
  onCelebrate?: () => void;
}

const SwimProgressCard: React.FC<SwimProgressCardProps> = ({
  id,
  eventName,
  stroke,
  distance,
  bestTime,
  goalTime,
  showSetGoalButton = true,
  onCelebrate,
}) => {
  const [progress, setProgress] = useState(0);
  const [isGoalAchieved, setIsGoalAchieved] = useState(false);

  // Calculate progress percentage when best time and goal time are available
  useEffect(() => {
    if (bestTime && goalTime) {
      // Calculate how close the swimmer is to their goal
      // If best time is better than goal time, progress is 100%
      if (bestTime <= goalTime) {
        setProgress(100);
        setIsGoalAchieved(true);
        // Trigger celebration if provided
        if (onCelebrate) {
          onCelebrate();
        }
      } else {
        // Calculate progress as a percentage (higher is better)
        // We'll use a formula that gives a reasonable progression curve
        // For example, if goal is 10% faster than current best, we'll show progress based on that gap
        const gap = bestTime - goalTime;
        const maxGap = bestTime * 0.2; // Assume a 20% improvement is the max expected
        const calculatedProgress = Math.min(100, Math.max(0, 100 - (gap / maxGap) * 100));
        setProgress(calculatedProgress);
        setIsGoalAchieved(false);
      }
    } else {
      setProgress(0);
      setIsGoalAchieved(false);
    }
  }, [bestTime, goalTime, onCelebrate]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-primary">
      {/* Header Section */}
      <div className="bg-blue-100 p-4 border-b border-primary">
        <h3 className="text-lg font-bold text-center text-secondary">Swim Progress</h3>
      </div>

      {/* Title Area */}
      <div className="p-4 bg-white">
        <h2 className="text-xl font-bold text-center">{stroke} {distance}</h2>
        <p className="text-sm text-gray-500 text-center">{eventName}</p>
      </div>

      {/* Progress Display */}
      <div className="px-4 py-6 bg-white">
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          {/* Progress Bar */}
          <div 
            className={`absolute top-0 left-0 h-full ${
              isGoalAchieved ? 'bg-green-500' : 'bg-blue-500'
            } transition-all duration-1000 ease-out`}
            style={{ width: `${progress}%` }}
          ></div>

          {/* Swimmer Icon */}
          <div 
            className="absolute top-0 h-full flex items-center transition-all duration-1000 ease-out"
            style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-lg">🏊‍♂️</span>
          </div>

          {/* Start Flag */}
          <div className="absolute top-0 left-0 h-full flex items-center">
            <span className="text-sm ml-1">🏁</span>
          </div>

          {/* Goal Flag */}
          <div className="absolute top-0 right-0 h-full flex items-center">
            <span className="text-sm mr-1">⭐</span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="p-4 bg-white flex justify-between">
        <div className="text-center">
          <p className="text-xs text-gray-500">Personal Best</p>
          <p className="text-lg font-bold text-secondary">
            {bestTime ? formatTime(bestTime) : '--.--.--'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Goal Time</p>
          <p className="text-lg font-bold text-yellow-500">
            {goalTime ? formatTime(goalTime) : '--.--.--'}
          </p>
        </div>
      </div>

      {/* Call to Action */}
      {showSetGoalButton && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <Link
            href={`/athlete-zone/best-times/set-goal?id=${id}`}
            className="block w-full py-2 px-4 bg-white text-secondary font-medium text-center rounded-full border-2 border-gray-300 hover:bg-gray-100 transition-colors"
          >
            {goalTime ? 'Update Goal' : 'Set Goal'}
          </Link>
        </div>
      )}
    </div>
  );
};

export default SwimProgressCard;
