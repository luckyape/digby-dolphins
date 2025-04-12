'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addBestTime, getStrokes, getDistances, parseTime } from '@/services/bestTimesService';

const BestTimeForm: React.FC = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [eventName, setEventName] = useState('');
  const [stroke, setStroke] = useState('Freestyle');
  const [distance, setDistance] = useState('50m');
  const [timeString, setTimeString] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const strokes = getStrokes();
  const distances = getDistances(stroke);

  // Handle stroke change and update distances accordingly
  const handleStrokeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStroke = e.target.value;
    setStroke(newStroke);
    
    // Reset distance to first available for the new stroke
    const newDistances = getDistances(newStroke);
    setDistance(newDistances[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate inputs
      if (!eventName.trim()) {
        throw new Error('Please enter an event name');
      }

      if (!timeString.trim()) {
        throw new Error('Please enter a time');
      }

      // Parse time string to seconds
      let timeInSeconds: number;
      try {
        timeInSeconds = parseTime(timeString);
      } catch (err) {
        throw new Error('Invalid time format. Please use MM:SS.ss or SS.ss');
      }

      // Submit to Firebase
      const result = await addBestTime(
        eventName,
        stroke,
        distance,
        timeInSeconds,
        date
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to save best time');
      }

      setSuccess('Best time saved successfully!');
      
      // Reset form
      setEventName('');
      setTimeString('');
      
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

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-primary">
      <div className="bg-secondary text-white p-4">
        <h2 className="text-xl font-bold">Add New Personal Best Time</h2>
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

        <div>
          <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
            Event Name
          </label>
          <input
            type="text"
            id="eventName"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="e.g., Summer Meet 2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="stroke" className="block text-sm font-medium text-gray-700 mb-1">
              Stroke
            </label>
            <select
              id="stroke"
              value={stroke}
              onChange={handleStrokeChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            >
              {strokes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-1">
              Distance
            </label>
            <select
              id="distance"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            >
              {distances.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
              Time (MM:SS.ss or SS.ss)
            </label>
            <input
              type="text"
              id="time"
              value={timeString}
              onChange={(e) => setTimeString(e.target.value)}
              placeholder="e.g., 1:23.45 or 23.45"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
              required
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Date Achieved
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isSubmitting}
            />
          </div>
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
            {isSubmitting ? 'Saving...' : 'Save Best Time'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BestTimeForm;
