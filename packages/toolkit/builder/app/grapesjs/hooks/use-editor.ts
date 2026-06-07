import { useState, useCallback, useRef } from 'react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import pluginTailwind from 'grapesjs-tailwind';
import gjsPresetWebpage from 'grapesjs-preset-webpage';
import grapesjspluginckeditor from 'grapesjs-plugin-ckeditor';
import gjsBlocksBasic from 'grapesjs-blocks-basic';
import gjsBlocksFlexbox from 'grapesjs-blocks-flexbox';
import { Theme } from 'theme-ui';
import { BlockComponent } from '../types';
import { GrapesJSError } from '../utils/error-handler';
import { GrapesJSErrorType } from '../constants/error-types';

const createEditorContainer = (containerId: string) => ({
	container: `#${containerId}`,
	fromElement: false,
	width: '100%',
	height: '100vh',
	storageManager: false,
	showDevices: true
});

const setupPanels = () => ({
	defaults: [
		{
			id: 'panel-devices',
			el: '.panel__devices',
			buttons: [
				{
					id: 'preview',
					className: 'fa fa-eye',
					command: 'preview',
					attributes: { title: 'Preview' }
				},
				{
					id: 'export-template',
					className: 'fa fa-download',
					command: 'export-template',
					attributes: { title: 'Export ZIP' }
				},
				{
					id: 'export-json',
					className: 'fa fa-code',
					command: 'export-json',
					attributes: { title: 'Export JSON' }
				}
			]
		}
	]
});

const configurePlugins = (blockComponents: BlockComponent[]) => ({
	plugins: [
		gjsPresetWebpage,
		pluginTailwind,
		grapesjspluginckeditor,
		gjsBlocksBasic,
		gjsBlocksFlexbox,
		setupPreviewCommand
	],
	pluginsOpts: {
		'grapesjs-preset-webpage': {
			exportOpts: {
				cleanHtml: true,
				cleanCss: true
			}
		},
		'grapesjs-blocks-basic': {
			blocks: [] // Disable default blocks
		}
	},
	blockManager: {
		blocks: blockComponents.map((block) => ({
			id: block.id,
			label: block.label,
			category: block.category,
			content: {
				type: block.id,
				components: [
					{
						type: block.id,
						components: block.content
					}
				]
			},
			media:
				block.media || (block.image ? `<img class="bg-cover" src="${block.image}" alt="${block.label}"/>` : '')
		}))
	}
});

const setupPreviewCommand = (editor: any) => {
	editor.Commands.add('preview', {
		getState() {
			return editor.getConfig().deviceManager.device === 'Desktop';
		},
		run() {
			editor.setDevice('Desktop');
			editor.Commands.stop('sw-visibility');
			const panels = editor.Panels.getPanels();
			panels.forEach((panel: any) => panel.set('visible', false));
			editor.getWrapper().addClass('gjs-preview');
		},
		stop() {
			editor.setDevice('Desktop');
			editor.Commands.run('sw-visibility');
			const panels = editor.Panels.getPanels();
			panels.forEach((panel: any) => panel.set('visible', true));
			editor.getWrapper().removeClass('gjs-preview');
			editor.refresh();
		}
	});
};

interface UseEditorProps {
	containerId: string;
	blockComponents?: BlockComponent[];
	theme?: Theme;
	config?: Record<string, any>;
}

export const useEditor = ({ containerId, blockComponents = [], theme, config = {} }: UseEditorProps) => {
	const [editor, setEditor] = useState<any | null>(null);
	const editorRef = useRef<any>(null);
	const escapeName = useCallback((name: string) => name.trim().replace(/[^\w:/-]+/gi, '-'), []);

	const initializeEditor = useCallback((containerId: string, blockComponents: BlockComponent[], theme: Theme) => {
		try {
			const editor = grapesjs.init({
				...createEditorContainer(containerId),
				...setupPanels(),
				...configurePlugins(blockComponents)
			});

			return editor;
		} catch (error) {
			throw new GrapesJSError(
				GrapesJSErrorType.INITIALIZATION,
				'editor',
				`Failed to initialize editor: ${error}`
			);
		}
	}, []);

	return {
		editor,
		setEditor,
		editorRef,
		escapeName,
		initializeEditor
	};
};
