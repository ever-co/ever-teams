/**
 * @jest-environment jsdom
 */
import { Editor } from '@tiptap/core';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { buildExtensions, editorSchemaTypes } from './editor-extensions';
import { liveCollaboration } from './live-collaboration';

// `marked` ships as ES modules only, which this harness does not load; Markdown is not what these specs are about.
jest.mock('marked', () => ({ Marked: class {} }));
jest.mock('@tiptap/markdown', () => {
	const { Extension } = jest.requireActual('@tiptap/core');
	return { Markdown: Extension.create({ name: 'markdown' }) };
});
// The "/" and "@" menus' popups and icons are React UI, not part of the binding.
jest.mock('./suggestion-render', () => ({ suggestionRender: () => () => ({}) }));
jest.mock(
	'@/core/components/icons',
	() =>
		new Proxy(
			{ __esModule: true },
			{ get: (target, key) => (key in target ? target[key as keyof typeof target] : () => null) }
		)
);

const noLabels = { emptyLabel: '', loadingLabel: '', ariaLabel: '' };

function liveEditor(doc: Y.Doc, awareness: Awareness): Editor {
	return new Editor({
		element: document.createElement('div'),
		extensions: buildExtensions({
			placeholder: '',
			slashMenu: {
				copy: {} as never,
				handlers: { pickImage: () => undefined, openAi: () => undefined },
				imagesEnabled: true,
				aiEnabled: false
			},
			slashLabels: noLabels,
			mentionLabels: noLabels,
			mentions: () => [],
			onSuggestionOpenChange: () => undefined,
			collaboration: liveCollaboration(doc, awareness)
		})
	});
}

/** A paragraph as the platform seeds one: an element named after its type around one text run. */
function seededParagraph(doc: Y.Doc, text: string, marks?: Record<string, unknown>): void {
	const element = new Y.XmlElement('paragraph');
	const run = new Y.XmlText();
	run.insert(0, text, marks);
	element.insert(0, [run]);
	doc.getXmlFragment('default').push([element]);
}

describe('the live editor binding', () => {
	it('shows the shared document as the platform wrote it, and writes edits into it', () => {
		const doc = new Y.Doc();
		seededParagraph(doc, 'Hello ');
		seededParagraph(doc, 'bold', { bold: {} });
		const awareness = new Awareness(doc);
		const editor = liveEditor(doc, awareness);
		try {
			expect(editor.getJSON()).toEqual({
				type: 'doc',
				content: [
					{ type: 'paragraph', attrs: expect.anything(), content: [{ type: 'text', text: 'Hello ' }] },
					{
						type: 'paragraph',
						attrs: expect.anything(),
						content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }]
					}
				]
			});

			editor.commands.insertContentAt(editor.state.doc.content.size, '<p>typed here</p>');
			expect(doc.getXmlFragment('default').toString()).toContain('typed here');

			// A co-editor's edit reaches the editor.
			const remote = new Y.Doc();
			Y.applyUpdate(remote, Y.encodeStateAsUpdate(doc));
			const before = Y.encodeStateVector(remote);
			seededParagraph(remote, 'from a co-editor');
			Y.applyUpdate(doc, Y.encodeStateAsUpdate(remote, before));
			expect(editor.getText()).toContain('from a co-editor');
		} finally {
			editor.destroy();
			awareness.destroy();
		}
	});

	it('leaves the editor’s own history out (the shared document keeps it)', () => {
		const doc = new Y.Doc();
		const awareness = new Awareness(doc);
		const editor = liveEditor(doc, awareness);
		try {
			const names = editor.extensionManager.extensions.map((extension) => extension.name);
			expect(names).toContain('collaboration');
			expect(names).toContain('liveCaret');
			expect(names).not.toContain('undoRedo');
		} finally {
			editor.destroy();
			awareness.destroy();
		}
	});

	it('knows the schema it is checked against before it exists', () => {
		const types = editorSchemaTypes();
		for (const node of [
			'doc',
			'paragraph',
			'text',
			'heading',
			'bulletList',
			'taskList',
			'image',
			'mention',
			'codeBlock'
		]) {
			expect(types.nodes.has(node)).toBe(true);
		}
		for (const mark of ['bold', 'italic', 'link', 'code']) {
			expect(types.marks.has(mark)).toBe(true);
		}
		expect(types.nodes.has('callout')).toBe(false);
	});
});
