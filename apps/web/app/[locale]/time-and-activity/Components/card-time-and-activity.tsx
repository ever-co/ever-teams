import React from 'react';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import ProgressBar from './progress-bar';

interface StatisticCardProps {
  title: string;
  value: string | number;
  color?: string;
  showProgress?: boolean;
  progress?: number;
  progressColor?: string;
  isLoading?: boolean;
}

const CardTimeandActivity: React.FC<StatisticCardProps> = ({
  title,
  value,
  color = 'text-gray-900 dark:text-white',
  showProgress = false,
  progress = 0,
  progressColor = 'bg-primary',
  isLoading = false,
}) => {
  return (
    <Card className="p-6 dark:bg-dark--theme-light">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className="mt-2 h-9">
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
          ) : (
            <span className={`text-2xl font-semibold ${color}`}>{value}</span>
          )}
        </div>
        {showProgress && (
          <ProgressBar
            progress={progress}
            color={progressColor}
            isLoading={isLoading}
          />
        )}
      </div>
    </Card>
  );
};

export default CardTimeandActivity;
