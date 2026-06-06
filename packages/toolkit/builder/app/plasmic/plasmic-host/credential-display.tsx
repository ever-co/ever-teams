import { maskApiKey } from '@/utils/helpers';
import { DisplayProps } from '../../../types/Plasmic';

export const CredentialDisplay: React.FC<DisplayProps> = ({ value, onReset, label }) => (
  <div className="space-y-4">
    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-md">
      <p className="text-sm text-slate-600 dark:text-slate-400">Current {label}:</p>
      <p className="font-mono text-slate-800 dark:text-slate-200">
        {value ? maskApiKey(value) : 'No value set'}
      </p>
    </div>
    <button
      onClick={onReset}
      aria-label={`Change ${label}`}
      className="w-full px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700
               dark:text-slate-400 dark:hover:text-slate-300 bg-slate-100 hover:bg-slate-200
               dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md focus:outline-none
               focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 border
               border-slate-300 dark:border-slate-600"
    >
      Change {label}
    </button>
  </div>
);
