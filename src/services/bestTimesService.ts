/**
 * Best Times Service
 * This file provides functions to interact with the Firebase Cloud Functions for best times management
 */

import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

// Types
export interface BestTime {
  id?: string;
  eventName: string;
  stroke: string;
  distance: string;
  time: number;
  date?: string;
  goalTime?: number;
  updatedAt?: string;
}

export interface BestTimeResponse {
  success: boolean;
  bestTime?: BestTime;
  bestTimes?: BestTime[];
  message?: string;
  error?: string;
}

export interface GoalTimeResponse {
  success: boolean;
  goalTime?: {
    goalTime: number;
    updatedAt: string;
  };
  message?: string;
  error?: string;
}

/**
 * Add or update a best time
 * @param eventName - Name of the event
 * @param stroke - Swimming stroke (e.g., "Freestyle", "Backstroke")
 * @param distance - Distance (e.g., "50m", "100m")
 * @param time - Time in seconds
 * @param date - Date achieved (optional, defaults to current date)
 * @returns Promise with the response
 */
export const addBestTime = async (
  eventName: string,
  stroke: string,
  distance: string,
  time: number,
  date?: string
): Promise<BestTimeResponse> => {
  try {
    const addBestTimeFunction = httpsCallable<any, BestTimeResponse>(
      functions,
      'addBestTime'
    );

    const result = await addBestTimeFunction({
      eventName,
      stroke,
      distance,
      time,
      date
    });

    return result.data;
  } catch (error: any) {
    console.error('Error adding best time:', error);
    return {
      success: false,
      error: error.message || 'Failed to add best time'
    };
  }
};

/**
 * Set a goal time for an event
 * @param eventName - Name of the event
 * @param stroke - Swimming stroke (e.g., "Freestyle", "Backstroke")
 * @param distance - Distance (e.g., "50m", "100m")
 * @param goalTime - Goal time in seconds
 * @returns Promise with the response
 */
export const setGoalTime = async (
  eventName: string,
  stroke: string,
  distance: string,
  goalTime: number
): Promise<GoalTimeResponse> => {
  try {
    const setGoalTimeFunction = httpsCallable<any, GoalTimeResponse>(
      functions,
      'setGoalTime'
    );

    const result = await setGoalTimeFunction({
      eventName,
      stroke,
      distance,
      goalTime
    });

    return result.data;
  } catch (error: any) {
    console.error('Error setting goal time:', error);
    return {
      success: false,
      error: error.message || 'Failed to set goal time'
    };
  }
};

/**
 * Get all best times for the current user
 * @returns Promise with the response containing all best times
 */
export const getBestTimes = async (): Promise<BestTimeResponse> => {
  try {
    const getBestTimesFunction = httpsCallable<any, BestTimeResponse>(
      functions,
      'getBestTimes'
    );

    const result = await getBestTimesFunction({});
    return result.data;
  } catch (error: any) {
    console.error('Error getting best times:', error);
    return {
      success: false,
      error: error.message || 'Failed to get best times'
    };
  }
};

/**
 * Get a specific best time by event ID
 * @param eventId - The event ID (format: "stroke_distance")
 * @returns Promise with the response containing the best time
 */
export const getBestTime = async (eventId: string): Promise<BestTimeResponse> => {
  try {
    const getBestTimeFunction = httpsCallable<any, BestTimeResponse>(
      functions,
      'getBestTime'
    );

    const result = await getBestTimeFunction({ eventId });
    return result.data;
  } catch (error: any) {
    console.error('Error getting best time:', error);
    return {
      success: false,
      error: error.message || 'Failed to get best time'
    };
  }
};

/**
 * Format a time in seconds to a display string (MM:SS.ss)
 * @param timeInSeconds - Time in seconds
 * @returns Formatted time string
 */
export const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const hundredths = Math.floor((timeInSeconds % 1) * 100);
  
  return `${minutes > 0 ? `${minutes}:` : ''}${seconds.toString().padStart(minutes > 0 ? 2 : 1, '0')}.${hundredths.toString().padStart(2, '0')}`;
};

/**
 * Parse a time string (MM:SS.ss) to seconds
 * @param timeString - Time string in format MM:SS.ss or SS.ss
 * @returns Time in seconds
 */
export const parseTime = (timeString: string): number => {
  // Handle different formats
  if (!timeString.includes(':') && timeString.includes('.')) {
    // Format: SS.ss
    const [seconds, hundredths] = timeString.split('.');
    return parseInt(seconds) + parseInt(hundredths) / 100;
  } else if (timeString.includes(':') && timeString.includes('.')) {
    // Format: MM:SS.ss
    const [minutesPart, secondsPart] = timeString.split(':');
    const [seconds, hundredths] = secondsPart.split('.');
    return parseInt(minutesPart) * 60 + parseInt(seconds) + parseInt(hundredths) / 100;
  } else if (timeString.includes(':') && !timeString.includes('.')) {
    // Format: MM:SS
    const [minutes, seconds] = timeString.split(':');
    return parseInt(minutes) * 60 + parseInt(seconds);
  } else {
    // Format: SS (just seconds)
    return parseInt(timeString);
  }
};

/**
 * Calculate improvement percentage between best time and goal time
 * @param bestTime - Current best time in seconds
 * @param goalTime - Goal time in seconds
 * @returns Percentage improvement (positive means improvement)
 */
export const calculateImprovement = (bestTime: number, goalTime: number): number => {
  return ((bestTime - goalTime) / bestTime) * 100;
};

/**
 * Get common swimming strokes
 * @returns Array of stroke names
 */
export const getStrokes = (): string[] => {
  return ['Freestyle', 'Backstroke', 'Breaststroke', 'Butterfly', 'Individual Medley'];
};

/**
 * Get common distances for each stroke
 * @param stroke - Swimming stroke
 * @returns Array of distances
 */
export const getDistances = (stroke: string): string[] => {
  switch (stroke) {
    case 'Freestyle':
      return ['50m', '100m', '200m', '400m', '800m', '1500m'];
    case 'Backstroke':
    case 'Breaststroke':
    case 'Butterfly':
      return ['50m', '100m', '200m'];
    case 'Individual Medley':
      return ['200m', '400m'];
    default:
      return ['50m', '100m', '200m'];
  }
};
