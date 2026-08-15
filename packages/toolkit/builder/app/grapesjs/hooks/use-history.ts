import { useCallback, useEffect } from 'react';
import { UseHistoryProps } from '../types';

export const useHistory = ({ editor }: UseHistoryProps) => {
	const setupHistory = useCallback(() => {
		if (!editor) return;

		// Initialize basic undo/redo commands
		editor.Commands.add('undo-with-feedback', {
			run: () => {
				try {
					const undone = editor.UndoManager?.undo();
					if (undone) {
						editor.Notifications?.add('Action undone', {
							timeout: 1500,
							type: 'info'
						});
					}
				} catch (error) {
					console.error('Undo failed:', error);
				}
			}
		});

		editor.Commands.add('redo-with-feedback', {
			run: () => {
				try {
					const redone = editor.UndoManager?.redo();
					if (redone) {
						editor.Notifications?.add('Action redone', {
							timeout: 1500,
							type: 'info'
						});
					}
				} catch (error) {
					console.error('Redo failed:', error);
				}
			}
		});

		// Add keyboard shortcuts
		editor.Keymaps?.add('undo-with-feedback', 'ctrl+z');
		editor.Keymaps?.add('redo-with-feedback', 'ctrl+shift+z');

		// Configure UndoManager if available
		if (typeof editor.UndoManager?.setConfig === 'function') {
			editor.UndoManager.setConfig({
				trackSelection: true,
				maximumStackLength: 100,
				customTypes: {
					'component:style': {
						merge: true,
						timeout: 800
					},
					'component:selected': {
						merge: true
					}
				}
			});
		}
	}, [editor]);

	useEffect(() => {
		setupHistory();
	}, [setupHistory]);

	return {
		undo: () => editor?.runCommand('undo-with-feedback'),
		redo: () => editor?.runCommand('redo-with-feedback'),
		canUndo: () => editor?.UndoManager?.hasUndo?.() ?? false,
		canRedo: () => editor?.UndoManager?.hasRedo?.() ?? false,
		getStack: () => editor?.UndoManager?.getStack?.() ?? []
	};
};
