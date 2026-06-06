import { AuthLayout } from './auth-layout';
import { Text } from '../typography';
import { LoadingScreenProps } from '../../types/Auth';

export function LoadingScreen({
  message = 'Redirecting you...',
  description = 'Please wait while we redirect you to your destination'
}: LoadingScreenProps) {
  return (
    <AuthLayout>
      <div className="flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        <Text.Heading as="h3" className="text-gray-900 dark:text-white/90">
          {message}
        </Text.Heading>
        <p className="text-gray-600 dark:text-white/60 text-center max-w-[300px]">
          {description}
        </p>
      </div>
    </AuthLayout>
  );
}
