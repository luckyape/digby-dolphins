'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import SwimProgressCard from '@/components/SwimProgressCard';
import { getBestTimes, BestTime } from '@/services/bestTimesService';

export default function BestTimesTracker() {
  const { currentUser } = useAuth();
  const { isLoading } = useRouteProtection();
  const [bestTimes, setBestTimes] = useState<BestTime[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  // Function to trigger confetti
  const triggerConfetti = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  // Fetch best times when component mounts
  useEffect(() => {
    const fetchBestTimes = async () => {
      try {
        const result = await getBestTimes();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load best times');
        }
        
        setBestTimes(result.bestTimes || []);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching best times:', err);
      } finally {
        setIsDataLoading(false);
      }
    };
    
    if (currentUser) {
      fetchBestTimes();
    }
  }, [currentUser]);

  if (isLoading || isDataLoading) {
    return (
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center'>
        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
        <p className='mt-2 text-gray-500'>Loading your best times...</p>
      </div>
    );
  }

  // If not authenticated, return null (route protection will handle redirect)
  if (!currentUser) {
    return null;
  }

  return (
    <div className='bg-gray-50 min-h-screen'>
      {/* Confetti effect */}
      {showConfetti && (
        <div className='fixed inset-0 z-50 pointer-events-none'>
          {/* Confetti animation would go here */}
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='text-6xl animate-bounce'>🎉</div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className='bg-gradient-to-r from-blue-600 to-blue-800 text-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-4xl font-bold mb-2'>Personal Best Times</h1>
              <p className='text-xl font-medium'>
                <span className='bg-white text-blue-800 px-3 py-1 rounded-full'>
                  Track your progress!
                </span>
              </p>
            </div>
            <div className='hidden md:block relative w-32 h-32'>
              <Image
                src='/images/dolphins-mark.svg'
                alt='Dolphins Logo'
                fill
                className='object-contain'
              />
            </div>
          </div>
          <p className='mt-4 max-w-3xl'>
            Record your personal best times and set goals to track your swimming progress.
            Celebrate your achievements as you improve!
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {error && (
          <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6'>
            {error}
          </div>
        )}

        {/* Add new time button */}
        <div className='mb-8'>
          <Link
            href='/athlete-zone/best-times/add'
            className='inline-flex items-center px-6 py-3 bg-primary text-secondary rounded-lg hover:bg-primary-dark transition-colors shadow-md'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 mr-2'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z'
                clipRule='evenodd'
              />
            </svg>
            Add New Best Time
          </Link>
        </div>

        {/* Best times grid */}
        {bestTimes.length === 0 ? (
          <div className='bg-white rounded-xl shadow-lg p-8 text-center'>
            <div className='text-5xl mb-4'>🏊‍♂️</div>
            <h3 className='text-xl font-bold text-secondary mb-2'>
              No best times recorded yet
            </h3>
            <p className='text-gray-600 mb-4'>
              Start tracking your swimming progress by adding your first best time.
            </p>
            <Link
              href='/athlete-zone/best-times/add'
              className='inline-flex items-center px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-primary-dark transition-colors'
            >
              Add Your First Time
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {bestTimes.map((bestTime) => (
              <SwimProgressCard
                key={bestTime.id}
                id={bestTime.id || ''}
                eventName={bestTime.eventName}
                stroke={bestTime.stroke}
                distance={bestTime.distance}
                bestTime={bestTime.time}
                goalTime={bestTime.goalTime}
                onCelebrate={triggerConfetti}
              />
            ))}
          </div>
        )}

        {/* Back to Athlete Zone button */}
        <div className='mt-8 text-center'>
          <Link
            href='/athlete-zone'
            className='inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors'
          >
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='h-5 w-5 mr-2'
              viewBox='0 0 20 20'
              fill='currentColor'
            >
              <path
                fillRule='evenodd'
                d='M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z'
                clipRule='evenodd'
              />
            </svg>
            Back to Athlete Zone
          </Link>
        </div>
      </div>
    </div>
  );
}
