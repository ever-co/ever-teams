'use client';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { UseAutosaveProps, AutosaveData, AUTOSAVE_DEFAULTS } from '../types/autosave';
import { enhancedExportComponents } from '../utils/export';
import { GrapesJSError } from '../utils/error-handler';
import { GrapesJSErrorType } from '../constants/error-types';
import debounce from 'lodash/debounce';
import { createRecoveryModal } from '../components/ui/recovery-modal';

export const useAutosave = ({
	editor,
	projectId,
	theme,
	colorMode = 'light',
	debounceTime = AUTOSAVE_DEFAULTS.DEBOUNCE_TIME
}: UseAutosaveProps) => {
	const backupIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const loadFromLocalStorage = useCallback((): AutosaveData | null => {
		try {
			const savedData = localStorage.getItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`);
			if (!savedData) return null;
			return JSON.parse(savedData) as AutosaveData;
		} catch (error) {
			throw new GrapesJSError(
				GrapesJSErrorType.EXPORT_ERROR,
				'autosave',
				`Failed to load from localStorage: ${error}`
			);
		}
	}, [projectId]);

	const restoreFromAutosave = useCallback(
		(data: AutosaveData) => {
			if (!editor) return;

			try {
				if (editor.loadProjectData) {
					editor.loadProjectData(data);
				} else {
					editor.setComponents(data.components);
					editor.setStyle(data.styles);
				}
			} catch (error) {
				throw new GrapesJSError(
					GrapesJSErrorType.EXPORT_ERROR,
					'autosave',
					`Failed to restore from autosave: ${error}`
				);
			}
		},
		[editor]
	);

	useEffect(() => {
		if (!editor) return;

		const savedData = loadFromLocalStorage();
		if (!savedData || !savedData.components || savedData.components.length === 0) return;

		const isRecent = Date.now() - savedData.lastModified < 24 * 60 * 60 * 1000;

		if (isRecent && editor.Modal) {
			const modalContent = createRecoveryModal({
				savedData,
				onRestore: () => {
					restoreFromAutosave(savedData);
					editor.Modal.close();
				},
				onDiscard: () => {
					localStorage.removeItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`);
					editor.Modal.close();
				},
				colors: theme.colors as Record<string, string>,
				isDark: colorMode === 'dark'
			});

			editor.Modal.open({
				title: 'Recover Autosaved Project',
				content: modalContent
			});
		}
	}, [editor, projectId, loadFromLocalStorage, restoreFromAutosave, theme, colorMode]);

	const saveToLocalStorage = useCallback(
		(data: AutosaveData) => {
			try {
				localStorage.setItem(`${AUTOSAVE_DEFAULTS.STORAGE_KEY}-${projectId}`, JSON.stringify(data));
			} catch (error) {
				throw new GrapesJSError(
					GrapesJSErrorType.EXPORT_ERROR,
					'autosave',
					`Failed to save to localStorage: ${error}`
				);
			}
		},
		[projectId]
	);

	const handleSave = useCallback(() => {
		if (!editor) return;

		const exportData = enhancedExportComponents(editor);
		if (!exportData) return;

		const autosaveData: AutosaveData = {
			...exportData,
			timestamp: Date.now(),
			projectId,
			lastModified: Date.now()
		};

		saveToLocalStorage(autosaveData);
	}, [editor, projectId, saveToLocalStorage]);

	const debouncedSave = useMemo(() => debounce(handleSave, debounceTime), [handleSave, debounceTime]);

	useEffect(() => {
		if (!editor) return;

		const events = ['component:update', 'component:add', 'component:remove', 'style:update'];

		events.forEach((event) => {
			editor.on(event, debouncedSave);
		});

		backupIntervalRef.current = setInterval(handleSave, AUTOSAVE_DEFAULTS.BACKUP_INTERVAL);

		const handleBeforeUnload = () => handleSave();
		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			events.forEach((event) => {
				editor.off(event, debouncedSave);
			});
			if (backupIntervalRef.current) {
				clearInterval(backupIntervalRef.current);
			}
			window.removeEventListener('beforeunload', handleBeforeUnload);
			debouncedSave.cancel();
		};
	}, [editor, debouncedSave, handleSave]);

	return {
		handleSave,
		debouncedSave,
		loadFromLocalStorage,
		restoreFromAutosave
	};
};
