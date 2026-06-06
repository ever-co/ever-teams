'use client';
import { useEffect, useState, useRef } from 'react';
import { useThemeUI } from 'theme-ui';
import { useTheme as useNextTheme } from 'next-themes';
import { UseGrapesJSProps, UseGrapesJSReturn, GrapesJSEditor } from '../types';
import { useEditor } from './use-editor';
import { useTheme } from './use-theme';
import { useCommands } from './use-commands';
import { useExport } from './use-export';
import { useAutosave } from './use-autosave';
import { useHistory } from './use-history';
import debounce from 'lodash/debounce';

export function useGrapesjs({
	containerId,
	blockComponents = [],
	config,
	projectId = 'default',
	onSave
}: UseGrapesJSProps): UseGrapesJSReturn {
	const [editor, setEditor] = useState<GrapesJSEditor | null>(null);
	const editorRef = useRef<GrapesJSEditor | null>(null);

	const { theme } = useThemeUI();
	const { theme: themeMode } = useNextTheme();
	const colorMode = themeMode as 'light' | 'dark';

	const { initializeEditor } = useEditor({
		containerId,
		blockComponents,
		config,
		theme
	});

	// Initialize editor
	useEffect(() => {
		if (editor) return;

		try {
			const newEditor = initializeEditor(containerId, blockComponents, theme);
			editorRef.current = newEditor;
			setEditor(newEditor);
		} catch (error) {
			console.error('Failed to initialize editor:', error);
		}
	}, [initializeEditor, containerId, blockComponents, theme, editor]);

	// Register theme
	useTheme({
		editor,
		theme,
		colorMode
	});

	// Register commands
	useCommands({
		editor,
		theme,
		colorMode
	});

	// Register export functionality
	useExport({
		editor,
		theme,
		colorMode
	});

	// Add autosave (localStorage)
	useAutosave({
		editor,
		projectId,
		theme,
		colorMode
	});

	// Add custom save functionality with debouncing
	useEffect(() => {
		if (!editor || !onSave) return;

		const debouncedSave = debounce(onSave, 1000, {
			leading: false,
			trailing: true
		});

		const events = ['component:update', 'component:add', 'component:remove', 'style:update'];

		events.forEach((event) => {
			editor.on(event, debouncedSave);
		});

		return () => {
			events.forEach((event) => {
				editor.off(event, debouncedSave);
			});
			debouncedSave.cancel();
		};
	}, [editor, onSave]);

	// Add history management
	const history = useHistory({
		editor,
		config: {
			maxStackSize: 50,
			debounceTime: 500
		}
	});

	return {
		editor,
		theme,
		editorRef,
		history
	};
}
