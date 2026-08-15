import { useEditor } from '@craftjs/core';
import { useCallback } from 'react';
import { handleCraftNextJSExport } from '../utils/nextjs-export';
import { CraftNextJSExportOptions } from '../types/export';

export const useExport = () => {
	const editor = useEditor();

	const handleExportNextJS = useCallback(
		async (options?: CraftNextJSExportOptions) => {
			try {
				const nodes = editor.query.getSerializedNodes();
				if (!nodes || Object.keys(nodes).length <= 1) {
					throw new Error('Please add some components before exporting');
				}

				await handleCraftNextJSExport(editor, options);
			} catch (error) {
				console.error('Export failed:', error);
				throw error;
			}
		},
		[editor]
	);

	return {
		handleExportNextJS
	};
};
