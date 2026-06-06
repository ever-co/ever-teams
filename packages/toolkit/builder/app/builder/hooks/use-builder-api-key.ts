import { useState, useEffect } from 'react';
import { builder } from "@builder.io/sdk";
import { CONFIG } from '../../constants';

export const useBuilderApiKey = () => {
  const [apiKey, setApiKey] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(CONFIG.API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setApiKey(storedApiKey);
      builder.init(storedApiKey);
      setIsInitialized(true);
    }
  }, []);

  const updateApiKey = (newKey: string) => {
    localStorage.setItem(CONFIG.API_KEY_STORAGE_KEY, newKey);
    builder.init(newKey);
    setApiKey(newKey);
    setIsInitialized(true);
  };

  const resetApiKey = () => {
    setApiKey('');
    setIsInitialized(false);
    localStorage.removeItem(CONFIG.API_KEY_STORAGE_KEY);
  };

  return { apiKey, isInitialized, updateApiKey, resetApiKey };
};
