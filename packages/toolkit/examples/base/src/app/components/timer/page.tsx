'use client';

import Link from 'next/link';

export default function TimerPage() {
  return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Timer Components</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link 
            href="/components/timer/basic"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Basic Timer</h2>
            <p className="text-gray-600">Simple timer components with various styles</p>
          </Link>
          
          <Link 
            href="/components/timer/modern"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Modern Timer</h2>
            <p className="text-gray-600">Advanced timer with progress and expandable view</p>
          </Link>
          
          <Link 
            href="/components/timer/progress"
            className="p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Timer with Progress</h2>
            <p className="text-gray-600">Timer components with progress indicators</p>
          </Link>
        </div>
      </div>
  );
}