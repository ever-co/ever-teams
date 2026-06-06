'use client';
import { useCallback } from 'react';
import { GrapesJSEditor } from '../types';
import { Theme } from 'theme-ui';
import { GrapesJSErrorType } from '../constants/error-types';
import { GrapesJSError } from '../utils/error-handler';
import { UseCommandsProps } from '../types';

export const useCommands = ({ editor, theme, colorMode = 'light' }: UseCommandsProps) => {
	const registerPreviewCommand = useCallback(() => {
		if (!editor?.Commands) return;

		editor.Commands.add('preview', {
			getState() {
				return editor.getConfig().deviceManager.device === 'Desktop';
			},
			run() {
				editor.setDevice('Desktop');
				editor.Commands.stop('sw-visibility');
				const panels = editor.Panels.getPanels();
				panels.forEach((panel) => panel.set('visible', false));
				editor.getWrapper().addClass('gjs-preview');
			},
			stop() {
				editor.setDevice('Desktop');
				editor.Commands.run('sw-visibility');
				const panels = editor.Panels.getPanels();
				panels.forEach((panel) => panel.set('visible', true));
				editor.getWrapper().removeClass('gjs-preview');
				editor.refresh();
			}
		});
	}, [editor]);

	const registerCommands = useCallback(() => {
		try {
			registerPreviewCommand();
		} catch (error) {
			throw new GrapesJSError(
				GrapesJSErrorType.INITIALIZATION,
				'commands',
				`Failed to register commands: ${error}`
			);
		}
	}, [registerPreviewCommand]);

	return {
		registerCommands
	};
};
