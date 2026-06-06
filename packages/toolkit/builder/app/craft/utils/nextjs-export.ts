import JSZip from 'jszip';
import { QueryMethods, EditorStore, SerializedNodes } from '@craftjs/core';
import { CraftNextJSExportOptions } from '../types/export';
import { processNodes } from './node-processor';
import { generateProjectFiles } from './project-generator';

interface ExportError {
	type: 'EXPORT_ERROR';
	context: string;
	details: string;
}

export const handleCraftNextJSExport = async (
	editorQuery: Pick<EditorStore, 'query'>,
	options: CraftNextJSExportOptions = {}
): Promise<void> => {
	try {
		const zip = new JSZip();

		// Get nodes from editor state
		const nodes: SerializedNodes = editorQuery.query.getSerializedNodes();

		if (!nodes || Object.keys(nodes).length === 0) {
			throw new Error('No components found to export');
		}

		// Process nodes to React components
		const { imports, code } = processNodes(nodes);

		// Create project structure
		const rootDir = zip.folder(options.projectName || 'craft-nextjs-project');
		if (!rootDir) {
			throw new Error('Failed to create root directory');
		}

		// Generate project files
		const files = generateProjectFiles({
			components: code,
			imports: Array.from(imports),
			options
		});

		// Add files to ZIP
		Object.entries(files).forEach(([path, content]) => {
			rootDir.file(path, content);
		});

		// Generate and download ZIP
		const content = await zip.generateAsync({ type: 'blob' });
		const url = URL.createObjectURL(content);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${options.projectName || 'craft-nextjs-project'}.zip`;
		link.click();
		URL.revokeObjectURL(url);
	} catch (err: unknown) {
		console.error('Export failed:', err);

		const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

		throw {
			type: 'EXPORT_ERROR' as const,
			context: 'nextjs',
			details: errorMessage
		} satisfies ExportError;
	}
};
