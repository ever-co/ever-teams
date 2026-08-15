'use client';
import { useEffect, useState } from 'react';

export const usePlasmicStudio = () => {
  const [isStudio, setIsStudio] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkPlasmicStudio = () => {
      try {
        const isIframe = window.self !== window.top;
        
        const searchParams = new URLSearchParams(window.location.search);
        const hasHostParam = searchParams.has('plasmic-host');
        
        const hasStudioPath = /\/studio\//.test(window.location.pathname);

        return isIframe || hasHostParam || hasStudioPath;
      } catch (e) {
        console.error('Error checking Plasmic studio:', e);
        return false;
      }
    };

    const handleUrlChange = () => {
      setIsStudio(checkPlasmicStudio());
    };

    handleUrlChange();

    window.addEventListener('popstate', handleUrlChange);
    
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  return isStudio;
};
