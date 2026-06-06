import { useState } from 'react';
import { FormProps } from '../../../types/Plasmic';

interface EnhancedFormProps extends FormProps {
  label: string;
  placeholder: string;
  isLoading?: boolean;
  error?: string;
}

export const CredentialForm: React.FC<EnhancedFormProps> = ({
  onSubmit,
  label,
  placeholder,
  isLoading,
  error
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit(inputValue);
      setInputValue('');
    } catch (error) {
      console.error('Failed to save credential:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApiKeyInput = label.toLowerCase().includes('api key');
  const isDisabled = isSubmitting || !inputValue.trim();

  return (
    <form 
      onSubmit={handleSubmit} 
      className="space-y-4" 
      autoComplete="off"
      data-lpignore="true"
      noValidate
    >
      <div className="hidden">
        <input type="text" autoComplete="username" />
        <input type="password" autoComplete="current-password" />
      </div>
      <div>
        <label htmlFor={label} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <input
          type={isApiKeyInput ? 'password' : 'text'}
          id={label}
          name="api-key-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          required
          minLength={1}
          disabled={isSubmitting}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 
                   bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 
                   focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300
                   disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          data-form-type="other"
          data-lpignore="true"
          aria-autocomplete="none"
        />
        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
      <button 
        type="submit" 
        disabled={isDisabled}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 
                  hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 
                  rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 
                  dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors duration-200"
      >
        {isSubmitting ? 'Saving...' : `Save ${label}`}
      </button>
    </form>
  );
};
