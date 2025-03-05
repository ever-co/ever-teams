import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  isLoading?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'bg-primary',
  isLoading = false,
}) => {
  return (
    <div className="mt-4">
      <div className="w-full h-2 bg-gray-100 rounded-full dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{
            width: `${isLoading ? 0 : progress}%`,
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
