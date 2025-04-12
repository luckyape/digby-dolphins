'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouteProtection } from '@/hooks/useRouteProtection';
import GoalTimeForm from '@/components/GoalTimeForm';

export default function SetGoalTime() {
  const { currentUser } = useAuth();
  const { isLoading } = useRouteProtection();

  if (isLoading) {
    return (
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center'>
        <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
        <p className='mt-2 text-gray-500'>Loading...</p>
      </div>
    );
  }

  // If not authenticated, return null (route protection will handle redirect)
  if (!currentUser) {
    return null;
  }

  return (
    <div className='bg-gray-50 min-h-screen'>
      {/* Page header */}
      <div className='bg-gradient-to-r from-blue-600 to-blue-800 text-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <div className='flex items-center'>
            <Link
              href='/athlete-zone/best-times'
              className='mr-4 text-white hover:text-blue-200 transition-colors'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-6 w-6'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M10 19l-7-7m0 0l7-7m-7 7h18'
                />
              </svg>
            </Link>
            <h1 className='text-2xl font-bold'>Set Goal Time</h1>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <GoalTimeForm />
      </div>
    </div>
  );
}
