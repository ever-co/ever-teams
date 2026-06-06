import { NodeTree, SerializedNodes } from '@craftjs/core';
import { COLUMN_PRESETS } from '../components/drag-components/layout/row-layout/column';
import type { ColumnSize } from '../components/drag-components/layout/row-layout/column';

// List of built-in HTML tags to skip import
const htmlTags = new Set([
	'div',
	'span',
	'p',
	'a',
	'button',
	'input',
	'form',
	'img',
	'ul',
	'li',
	'ol',
	'table',
	'thead',
	'tbody',
	'tr',
	'td',
	'th',
	'label',
	'select',
	'option',
	'textarea',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'section',
	'article',
	'nav',
	'footer',
	'header',
	'main',
	'aside'
]);

// Default column width when no preset is found
const DEFAULT_COLUMN_WIDTH = '33.33%';

export const processNodes = (nodes: SerializedNodes) => {
	const imports = new Set<string>();

	const processNode = (nodeId: string, node: any, indent = 0): string => {
		if (!node) {
			console.warn(`Node is undefined for ID: ${nodeId}`);
			return '';
		}

		// Get displayName from the correct location
		const displayName = node.displayName || node.type?.resolvedName || 'div';

		// Process ROOT node differently
		if (nodeId === 'ROOT') {
			if (!node.nodes || node.nodes.length === 0) {
				throw new Error('No child components found in ROOT');
			}

			// Process all children of ROOT
			const processedChildren = node.nodes
				.map((childId: string) => {
					const childNode = nodes[childId];
					return processNode(childId, childNode, indent);
				})
				.filter(Boolean)
				.join('\n');

			if (!processedChildren.trim()) {
				console.warn('No valid components processed from ROOT children', {
					childNodes: node.nodes,
					nodes
				});
				throw new Error('No valid components found in ROOT children');
			}
			return processedChildren;
		}

		// Handle Row component specifically
		if (displayName === 'Row') {
			imports.add('Row');
			const { columns, gap, alignment, padding, backgroundColor, borderRadius, border } = node.props || {};
			const linkedNodes = node.linkedNodes || {};

			const columnElements = columns.map((column: { size: ColumnSize; id: string }, index: number) => {
				const columnNodeKey = `${nodeId}-${column.id}`;
				const columnNodeId = linkedNodes[columnNodeKey];
				const columnNode = columnNodeId ? nodes[columnNodeId] : null;
				const isEmpty = !columnNode || !columnNode.nodes || columnNode.nodes.length === 0;

				const columnContent =
					columnNode && columnNode.nodes
						? columnNode.nodes
								.map((childId: string) => processNode(childId, nodes[childId], indent + 4))
								.join('\n')
						: '';

				return `${' '.repeat(indent + 2)}<div
${' '.repeat(indent + 4)}style={{
${' '.repeat(indent + 6)}width: "${COLUMN_PRESETS[column.size] || DEFAULT_COLUMN_WIDTH}",
${' '.repeat(indent + 6)}flex: "0 0 ${COLUMN_PRESETS[column.size] || DEFAULT_COLUMN_WIDTH}",
${' '.repeat(indent + 6)}position: "relative",
${' '.repeat(indent + 6)}minHeight: "${isEmpty ? '60px' : '50px'}",
${' '.repeat(indent + 6)}overflow: "hidden",
${' '.repeat(indent + 6)}transition: "width 0.2s ease-in-out, flex 0.2s ease-in-out"
${' '.repeat(indent + 4)}}}
${' '.repeat(indent + 4)}className="craft-block column-layout column-width-${column.size} group-hover:bg-gray-50/50 dark:group-hover:bg-gray-800/20"
${' '.repeat(indent + 4)}data-column-id="${column.id}"
${' '.repeat(indent + 4)}data-column-size="${column.size}"
${' '.repeat(indent + 4)}data-empty="${isEmpty ? 'true' : 'false'}"
${' '.repeat(indent + 4)}data-narrow="${column.size === '1' ? 'true' : 'false'}"
${' '.repeat(indent + 2)}>
${isEmpty ? `${' '.repeat(indent + 4)}<div className=\"absolute inset-2 flex items-center justify-center bg-gray-50 dark:bg-gray-800/30 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md transition-colors\">\n${' '.repeat(indent + 6)}${column.size !== '1' ? `<div className=\"flex flex-col items-center text-center p-2\">\n${' '.repeat(indent + 8)}<p className=\"text-gray-500 dark:text-gray-400 text-xs font-medium\">Drag here</p>\n${' '.repeat(indent + 6)}</div>` : ''}\n${' '.repeat(indent + 4)}</div>` : ''}
${columnContent}
${' '.repeat(indent + 2)}</div>`;
			});

			return `${' '.repeat(indent)}<div
${' '.repeat(indent + 2)}style={{
${' '.repeat(indent + 4)}padding: "${padding ?? 0}px",
${' '.repeat(indent + 4)}backgroundColor: "${backgroundColor || 'transparent'}",
${' '.repeat(indent + 4)}borderRadius: "${borderRadius}px",
${' '.repeat(indent + 4)}display: "flex",
${' '.repeat(indent + 4)}flexWrap: "nowrap",
${' '.repeat(indent + 4)}width: "100%",
${' '.repeat(indent + 4)}alignItems: "${alignment}",
${' '.repeat(indent + 4)}gap: "${gap}",
${' '.repeat(indent + 4)}border: ${border ? '"1px solid var(--border-color, rgba(226, 232, 240, 0.5))"' : '"none"'},
${' '.repeat(indent + 4)}position: "relative",
${' '.repeat(indent + 4)}overflow: "hidden"
${' '.repeat(indent + 2)}}}
${' '.repeat(indent + 2)}className="relative hover:outline hover:outline-primary/20 dark:hover:outline-primary/30 hover:outline-1 hover:outline-offset-2 transition-all row-layout group"
${' '.repeat(indent + 2)}data-row-id="${nodeId}"
${' '.repeat(indent + 2)}data-craftjs-type="Row"
${' '.repeat(indent + 2)}data-columns-count="${columns.length}"
${' '.repeat(indent + 2)}data-columns-sizes="${columns.map((col: { size: ColumnSize; id: string }) => col.size).join(',')}"
${' '.repeat(indent)}>
${columnElements.join('\n')}
${' '.repeat(indent)}</div>`;
		}

		// Handle TeamsModernTimer specifically
		if (displayName === 'TeamsModernTimer') {
			imports.add('TeamsModernTimer');
			const {
				separator = ':',
				expandable = true,
				showProgress = false,
				align = 'start',
				format = 'default'
			} = node.props || {};

			return `${' '.repeat(indent)}<TeamsModernTimer
${' '.repeat(indent + 2)}separator="${separator}"
${' '.repeat(indent + 2)}expandable={${expandable}}
${' '.repeat(indent + 2)}showProgress={${showProgress}}
${' '.repeat(indent + 2)}align="${align}"
${' '.repeat(indent + 2)}format="${format}"
${' '.repeat(indent)}/>`;
		}

		// Process regular components
		if (!htmlTags.has(displayName)) {
			imports.add(displayName);
		}
		const propsString = node.props
			? Object.entries(node.props)
					.filter(([key]) => !['id', 'custom'].includes(key))
					.map(([key, value]) => `${key}={${typeof value === 'string' ? `"${value}"` : value}}`)
					.join(' ')
			: '';

		return `${' '.repeat(indent)}<${displayName} ${propsString} />`;
	};

	try {
		const code = processNode('ROOT', nodes['ROOT']);

		if (!code.trim()) {
			throw new Error('No components were processed');
		}

		// Generate import statements
		const importStatements = Array.from(imports)
			.filter((name) => name !== 'Row')
			.map((name) => `import ${name} from '@ever-teams/atoms';`)
			.join('\n');
		const rowImport = imports.has('Row') ? `import { Row } from '@ever-teams/atoms';\n` : '';

		return {
			imports,
			code,
			importBlock: `${rowImport}${importStatements}`
		};
	} catch (error) {
		console.error('Error processing nodes:', error);
		throw new Error(`Failed to process components: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
};
