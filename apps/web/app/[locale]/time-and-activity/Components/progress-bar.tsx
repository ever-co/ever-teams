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
  return (
    <div className="mt-4">
      <div className="w-full h-1 bg-[#E4E4E7] dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${color}`}
          style={{
            width: `${isLoading ? 0 : progress}%`,
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;
