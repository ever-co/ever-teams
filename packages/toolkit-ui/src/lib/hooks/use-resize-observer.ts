import { useState, useEffect, useCallback } from 'react';

// Typescript interface for the hook's return values
interface ResizeObserverState {
  width: number | undefined;
  height: number | undefined;
}

// Custom hook that observes changes in size of a DOM element
export const useResizeObserver = (ref:  React.RefObject<HTMLElement>): ResizeObserverState => {
  const [size, setSize] = useState<ResizeObserverState>({
    width: undefined,
    height: undefined
  });

  // Callback to handle resize events
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (!entries || entries.length === 0) return;
    const entry = entries[0];

    // Set the size state based on the observed element's new dimensions
    setSize({
      width: entry.contentRect.width,
      height: entry.contentRect.height
    });
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Create a ResizeObserver instance and observe the element
    const resizeObserver = new ResizeObserver((entries) => handleResize(entries));
    resizeObserver.observe(element);

    // Cleanup observer when the component unmounts or when the ref changes
    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, handleResize]);

  return size;
};

