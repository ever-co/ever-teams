'use client';
import { useCallback, useEffect } from 'react';
import { UseExportProps } from '../types';
import { GrapesJSErrorType } from '../constants/error-types';
import { GrapesJSError } from '../utils/error-handler';
import JSZip from 'jszip';
import Prism from 'prismjs';
import { enhancedExportComponents } from '../utils/export';
import createExportModal from '../components/ui/export-modal';
import { formatExportCSS } from '../utils/css-formatter';
import { handleNextJSExport } from '../utils/nextjs-export';

export const useExport = ({ editor, theme, colorMode = 'light' }: UseExportProps) => {
	const formatCode = useCallback((code: string, language: string) => {
		const pre = document.createElement('pre');
		const codeEl = document.createElement('code');
		codeEl.className = `language-${language}`;
		codeEl.textContent = code;
		pre.appendChild(codeEl);
		Prism.highlightElement(codeEl);
		return pre;
	}, []);

	const getFormattedCSS = useCallback(() => {
		if (!editor) return '';
		const rawCSS = editor.getCss();
		return formatExportCSS(rawCSS);
	}, [editor]);

	const handleExportZIP = useCallback(async () => {
		if (!editor) return;

		try {
			const zip = new JSZip();
			const html = editor.getHtml();
			const css = getFormattedCSS();
			const js = editor.getJs();

			zip.file('index.html', html);
			zip.file('styles.css', css);
			zip.file('script.js', js);

			const content = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(content);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'grapesjs-template.zip';
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'zip', `Failed to export ZIP: ${error}`);
		}
	}, [editor, getFormattedCSS]);

	const handleExportJSON = useCallback(() => {
		if (!editor) return;
		try {
			const projectData = (editor as any).getProjectData?.() || (editor as any).toJSON?.();
			if (!projectData) {
				throw new Error('Failed to get project data');
			}

			// Create and trigger download
			const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = 'teams-template.json';
			link.click();
			URL.revokeObjectURL(url);
		} catch (error) {
			throw new GrapesJSError(GrapesJSErrorType.EXPORT_ERROR, 'json', `Failed to export JSON: ${error}`);
		}
	}, [editor]);

	const handleExportNextJS = useCallback(async () => {
		if (!editor) return;
		await handleNextJSExport(editor);
	}, [editor]);

	const registerExportCommand = useCallback(() => {
		if (!editor) return;

		editor.Commands.add('export-template', {
			run: () => {
				const html = editor.getHtml();
				const css = editor.getCss();
				const js = editor.getJs();

				const modalContent = createExportModal({
					html,
					css,
					js,
					theme,
					colorMode,
					formatCode,
					handleExportJSON,
					handleExportNextJS: async () => await handleExportNextJS()
				});

				editor.Modal.open({
					title: 'Export Template',
					content: modalContent
				});
			}
		});
	}, [editor, theme, colorMode, formatCode, handleExportJSON, handleExportNextJS]);

	useEffect(() => {
		registerExportCommand();
	}, [registerExportCommand]);

	return {
		formatCode,
		handleExportJSON,
		handleExportNextJS
	};
};
