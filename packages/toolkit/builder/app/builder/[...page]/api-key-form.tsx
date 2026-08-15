import { useState } from 'react';
import { ApiKeyFormProps } from '../../../types';

export const ApiKeyForm = ({ onSubmit }: ApiKeyFormProps) => {
  const [inputKey, setInputKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputKey);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Builder.io API Key
        </label>
        <input
          type="text"
          id="apiKey"
          value={inputKey}
          onChange={(e) => setInputKey(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 dark:border-slate-700 
                   bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 
                   focus:ring-blue-500 dark:focus:ring-blue-400 text-slate-700 dark:text-slate-300"
          placeholder="Enter your API key"
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 
                 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md focus:outline-none 
                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      >
        Save API Key
      </button>
    </form>
  );
};