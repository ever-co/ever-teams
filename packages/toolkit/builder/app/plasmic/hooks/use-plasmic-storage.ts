import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, STORAGE_DURATION } from '../../constants';
import { encrypt, decrypt } from '@/utils/encryption';

export const usePlasmicStorage = () => {
	const [plasmicApiKey, setPlasmicApiKey] = useState('');
	const [projectId, setProjectId] = useState('');

	const isLocalStorageAvailable = useCallback(() => {
		try {
			localStorage.setItem('test', 'test');
			localStorage.removeItem('test');
			return true;
		} catch (e) {
			console.error('localStorage is not available:', e);
			return false;
		}
	}, []);

	const clearStoredCredentials = useCallback(() => {
		if (!isLocalStorageAvailable()) return;

		try {
			Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
		} catch (error) {
			console.error('Failed to clear stored credentials:', error);
		}
	}, [isLocalStorageAvailable]);

	useEffect(() => {
		const loadStoredCredentials = () => {
			if (!isLocalStorageAvailable()) return;

			try {
				const storedApiKey = localStorage.getItem(STORAGE_KEYS.PLASMIC_API_KEY);
				const storedProjectId = localStorage.getItem(STORAGE_KEYS.PLASMIC_PROJECT_ID);
				const expiryTime = localStorage.getItem(STORAGE_KEYS.PLASMIC_EXPIRY);

				if (storedApiKey && storedProjectId && expiryTime) {
					if (Number(expiryTime) > Date.now()) {
						setPlasmicApiKey(decrypt(storedApiKey));
						setProjectId(storedProjectId);
					} else {
						clearStoredCredentials();
					}
				}
			} catch (error) {
				console.error('Failed to load stored credentials:', error);
				clearStoredCredentials();
			}
		};

		loadStoredCredentials();
	}, [isLocalStorageAvailable, clearStoredCredentials]);

	const updateStorage = useCallback(
		(key: string, value: string) => {
			if (!isLocalStorageAvailable()) return;

			try {
				const encryptedValue = key === STORAGE_KEYS.PLASMIC_API_KEY ? encrypt(value) : value;
				localStorage.setItem(key, encryptedValue);
				localStorage.setItem(STORAGE_KEYS.PLASMIC_EXPIRY, (Date.now() + STORAGE_DURATION).toString());
			} catch (error) {
				console.error('Failed to update storage:', error);
			}
		},
		[isLocalStorageAvailable]
	);

	return {
		plasmicApiKey,
		projectId,
		updateStorage,
		setPlasmicApiKey,
		setProjectId
	};
};
