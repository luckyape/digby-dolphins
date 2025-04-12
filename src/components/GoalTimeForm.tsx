'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  getBestTime, 
  setGoalTime, 
  formatTime, 
  parseTime 
} from '@/services/bestTimesService';

const GoalTimeForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('id');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [eventName, setEventName] = useState('');
  const [stroke, setStroke] = useState('');
  const [distance, setDistance] = useState('');
  const [currentBestTime, setCurrentBestTime] = useState<number | null>(null);
  const [goalTimeString, setGoalTimeString] = useState('');
  const [currentGoalTime, setCurrentGoalTime] = useState<number | null>(null);
  
  // Fetch the best time data when component mounts
  useEffect(() => {
    const fetchBestTime = async () => {
      if (!eventId) {
        setError('No event ID provided');
        setIsLoading(false);
        return;
      }
      
      try {
        const result = await getBestTime(eventId);
        
        if (!result.success || !result.bestTime) {
          throw new Error(result.error || 'Failed to load best time data');
        }
        
        const bestTime = result.bestTime;
        
        setEventName(bestTime.eventName);
        setStroke(bestTime.stroke);
        setDistance(bestTime.distance);
        setCurrentBestTime(bestTime.time);
        
        if (bestTime.goalTime) {
          setCurrentGoalTime(bestTime.goalTime);
          setGoalTimeString(formatTime(bestTime.goalTime));
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBestTime();
  }, [eventId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (!eventId) {
        throw new Error('No event ID provided');
      }
      
      if (!goalTimeString.trim()) {
        throw new Error('Please enter a goal time');
      }
      
      // Parse goal time string to seconds
      let goalTimeInSeconds: number;
      try {
        goalTimeInSeconds = parseTime(goalTimeString);
      } catch (err) {
        throw new Error('Invalid time format. Please use MM:SS.ss or SS.ss');
      }
      
      // Submit to Firebase
      const result = await setGoalTime(
        eventName,
        stroke,
        distance,
        goalTimeInSeconds
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to set goal time');
      }
      
      setSuccess('Goal time set successfully!');
      setCurrentGoalTime(goalTimeInSeconds);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/athlete-zone/best-times');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-2 text-gray-500">Loading event data...</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-primary">
      <div className="bg-secondary text-white p-4">
        <h2 className="text-xl font-bold">Set Goal Time</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}
        
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-lg text-secondary mb-2">{stroke} {distance}</h3>
          <p className="text-gray-600 mb-1">Event: {eventName}</p>
          <p className="text-gray-600">
            Current Best Time: {currentBestTime ? formatTime(currentBestTime) : 'Not set'}
          </p>
          {currentGoalTime && (
            <p className="text-gray-600">
              Current Goal Time: {formatTime(currentGoalTime)}
            </p>
          )}
        </div>
        
        <div>
          <label htmlFor="goalTime" className="block text-sm font-medium text-gray-700 mb-1">
            Goal Time (MM:SS.ss or SS.ss)
          </label>
          <input
            type="text"
            id="goalTime"
            value={goalTimeString}
            onChange={(e) => setGoalTimeString(e.target.value)}
            placeholder="e.g., 1:20.00 or 20.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
            required
          />
          <p className="mt-1 text-sm text-gray-500">
            Set a challenging but achievable goal time to work towards.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-secondary rounded-md hover:bg-primary-dark transition-colors"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Set Goal Time'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoalTimeForm;
