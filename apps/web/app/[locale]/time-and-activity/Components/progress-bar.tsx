import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  isLoading?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'bg-[#0088CC]',
  isLoading = false,
}) => {
  const progressValue = isLoading ? 0 : Math.min(Math.max(progress, 0), 100);

  return (
    <div className="-mt-0.5" role="progressbar" aria-valuenow={progressValue} aria-valuemin={0} aria-valuemax={100}>
      <div className="overflow-hidden w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out transform ${color}`}
          style={{
            width: `${progressValue}%`,
            transition: 'width 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
