import React, { useState } from 'react';
import { EverTeamsLogo } from '../components/svgs';

const AboutPage = () => {
  const [aboutApp, setAboutApp] = useState<{
    name: string;
    version: string;
  }>({
    name: 'Web Server',
    version: '0.1.0',
  });
  return (
    <div className="w-full text-white rounded-lg shadow-md p-6">
      <div className="text-center">
        <div className="flex justify-center items-center mb-4">
          <EverTeamsLogo />
        </div>
        <h1 className="text-sm dark:text-gray-50 text-gray-900 font-semibold pb-1 tracking-tighter">
          {aboutApp.name}
        </h1>
        <p className="text-xs dark:text-gray-50 text-gray-900 tracking-tighter">
          Version v{aboutApp.version}
        </p>
      </div>
      <div className="mt-6 text-center text-xs">
        <p className="dark:text-gray-50 text-gray-900 pb-1">
          Copyright © 2024-Present{' '}
          <span className="text-indigo-500">Ever Co. LTD</span>
        </p>
        <p className="dark:text-gray-50 text-gray-900 pb-1">
          All rights reserved.
        </p>
        <p className="mt-2 text-indigo-500 space-x-2">
          <a href="#" className="hover:underline">
            Terms Of Service
          </a>
          <span>|</span>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
