interface LoadingMessageProps {
  message?: string;
}

export const LoadingMessage: React.FC<LoadingMessageProps> = ({ 
  message = 'Loading preview...'
}) => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-slate-600 dark:text-slate-400">
      {message}
    </div>
  </div>
);
