'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useEditor } from '@craftjs/core';
import debounce from 'lodash/debounce';

export interface AutosaveProps {
	projectId: string;
	debounceTime?: number;
	theme?: any;
	colorMode?: 'light' | 'dark';
	onSave?: (components: any) => Promise<void> | void;
}

export interface AutosaveData {
	nodes: any;
	timestamp: number;
	projectId: string;
	lastModified: number;
}

const AUTOSAVE_DEFAULTS = {
	STORAGE_KEY: 'craft-autosave',
	DEBOUNCE_TIME: 1000,
	BACKUP_INTERVAL: 60000 // 1 minute
};

export const useAutosave = ({
	projectId,
	debounceTime = AUTOSAVE_DEFAULTS.DEBOUNCE_TIME,
	theme,
	colorMode = 'light'
}: AutosaveProps) => {
	const { actions, query } = useEditor();
	const backupIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const hasCheckedRef = useRef(false);

	// Load data from localStorage
	const loadFromLocalStorage = useCallback((): AutosaveData | null => {
		try {
			const savedData = localStorage.getItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`);
			if (!savedData) return null;
			return JSON.parse(savedData) as AutosaveData;
		} catch (error) {
			console.error(`Failed to load from localStorage: ${error}`);
			return null;
		}
	}, [projectId]);

	// Save data to localStorage
	const saveToLocalStorage = useCallback(
		(data: AutosaveData) => {
			try {
				localStorage.setItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`, JSON.stringify(data));
			} catch (error) {
				console.error(`Failed to save to localStorage: ${error}`);
			}
		},
		[projectId]
	);

	// Handle save operation
	const handleSave = useCallback(() => {
		try {
			const serializedNodes = query.serialize();

			if (!serializedNodes) return;

			const autosaveData: AutosaveData = {
				nodes: serializedNodes,
				timestamp: Date.now(),
				projectId,
				lastModified: Date.now()
			};

			saveToLocalStorage(autosaveData);
		} catch (error) {
			console.error('Autosave failed:', error);
		}
	}, [query, projectId, saveToLocalStorage]);

	const debouncedSave = useMemo(() => debounce(handleSave, debounceTime), [handleSave, debounceTime]);

	// Restore from autosave
	const restoreFromAutosave = useCallback(
		(data: AutosaveData) => {
			if (!data.nodes) return;
			try {
				actions.deserialize(data.nodes);
			} catch (error) {
				console.error(`Failed to restore from autosave: ${error}`);
			}
		},
		[actions]
	);

	// Check for autosave data and components on mount
	useEffect(() => {
		if (hasCheckedRef.current) return;
		hasCheckedRef.current = true;

		const savedData = loadFromLocalStorage();

		if (savedData && savedData.nodes) {
			// Parse the nodes if they're stored as a string
			let parsedNodes = savedData.nodes;

			// Handle both cases - string or already parsed object
			if (typeof savedData.nodes === 'string') {
				try {
					parsedNodes = JSON.parse(savedData.nodes);
				} catch (e) {
					console.error('Failed to parse nodes', e);
					return;
				}
			}

			// Check if ROOT has any child nodes (components)
			const hasComponents = parsedNodes.ROOT && parsedNodes.ROOT.nodes && parsedNodes.ROOT.nodes.length > 0;

			if (hasComponents) {
				const isRecent = Date.now() - savedData.lastModified < 24 * 60 * 60 * 1000;

				if (isRecent) {
					const shouldRestore = window.confirm(
						'We found an autosaved version of your project. Would you like to restore it?'
					);

					if (shouldRestore) {
						restoreFromAutosave(savedData);
					} else {
						localStorage.removeItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`);
					}
				}
			} else {
				// No components in ROOT, clean up localStorage
				localStorage.removeItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`);
			}
		}
	}, [loadFromLocalStorage, projectId, restoreFromAutosave]);

	// Save changes
	useEffect(() => {
		// Set up basic events
		const handleChange = () => {
			debouncedSave();
		};

		// Set up interval backup
		backupIntervalRef.current = setInterval(handleSave, AUTOSAVE_DEFAULTS.BACKUP_INTERVAL);

		// Save on window unload
		const handleBeforeUnload = () => handleSave();
		window.addEventListener('beforeunload', handleBeforeUnload);

		// Listen for clicks and drags as a simple way to detect changes
		document.addEventListener('click', handleChange);

		return () => {
			if (backupIntervalRef.current) {
				clearInterval(backupIntervalRef.current);
			}
			window.removeEventListener('beforeunload', handleBeforeUnload);
			document.removeEventListener('click', handleChange);
			debouncedSave.cancel();
		};
	}, [handleSave, debouncedSave]);

	return {
		handleSave,
		debouncedSave,
		loadFromLocalStorage,
		restoreFromAutosave
	};
};
