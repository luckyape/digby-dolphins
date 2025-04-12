import Link from 'next/link';

export default function Custom404() {
  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <div className="bg-white rounded-lg shadow-md p-8 border-2 border-primary">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-primary-light p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-secondary mb-4 text-center">Page Not Found</h1>
        
        <p className="text-gray-700 mb-6 text-center">
          The page you are looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex justify-center">
          <Link
            href="/"
            className="bg-primary text-white font-bold py-2 px-6 rounded-md hover:bg-primary-dark transition-colors text-center"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
