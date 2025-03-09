import React from 'react';

interface ProgressBarProps {
  progress: number;
  color?: string;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'bg-[#0088CC]',
  isLoading = false,
  size = 'md',
}) => {
  const progressValue = isLoading ? 0 : Math.min(Math.max(progress, 0), 100);

  return (
    <div className="mt-4">
      <div className={`w-full ${size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3'} bg-[#E4E4E7] dark:bg-gray-700 rounded-full overflow-hidden`}>
        <div
          className={`h-full transition-all duration-300 ${color}`}
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
