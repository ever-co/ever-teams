/**
 * @jest-environment jsdom
 */
import { Editor, generateHTML, getSchema, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextSelection } from '@tiptap/pm/state';
import { anchorSelectionBlock, BlockIds, blockIdsOf, blockOf, blocksWithoutAnchor, BLOCK_ID_TYPES, isBlockId, newBlockId } from './block-id-extension';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

const extensions = [StarterKit, BlockIds];

function editorWith(content: JSONContent): Editor {
	return new Editor({ element: document.createElement('div'), extensions, content });
}

function paragraph(text: string, blockId?: string): JSONContent {
	return { type: 'paragraph', ...(blockId ? { attrs: { blockId } } : {}), content: [{ type: 'text', text }] };
}

describe('block anchors', () => {
	it('makes version 4 UUIDs, which the platform accepts', () => {
		const id = newBlockId();
		expect(isBlockId(id)).toBe(true);
		expect(id[14]).toBe('4');
		expect(newBlockId()).not.toBe(id);
		expect(isBlockId('block-1')).toBe(false);
	});

	it('finds the blocks without an anchor, with one that is no UUID, or with a copy of an earlier one', () => {
		const schema = getSchema(extensions);
		const doc = schema.nodeFromJSON({
			type: 'doc',
			content: [paragraph('one', A), paragraph('two'), paragraph('copy', A), { type: 'paragraph', attrs: { blockId: 'nope' }, content: [{ type: 'text', text: 'bad' }] }, paragraph('three', B)]
		});
		const positions = blocksWithoutAnchor(doc, new Set(BLOCK_ID_TYPES));
		expect(positions.map((pos) => doc.nodeAt(pos)?.textContent)).toEqual(['two', 'copy', 'bad']);
		expect(blockIdsOf(doc)).toEqual([A, A, B]);
		expect(blockOf(doc, B)?.node.textContent).toBe('three');
		expect(blockOf(doc, '33333333-3333-4333-8333-333333333333')).toBeNull();
	});

	it('keeps the anchors in the HTML and reads them back, in both spellings', () => {
		const json: JSONContent = { type: 'doc', content: [paragraph('kept', A)] };
		const html = generateHTML(json, extensions);
		expect(html).toContain(`data-block-id="${A}"`);
		const editor = editorWith({ type: 'doc', content: [] });
		editor.commands.setContent(html);
		expect(blockIdsOf(editor.state.doc)).toEqual([A]);
		// The platform's editor writes `data-blockId`, which HTML reads as `data-blockid`.
		editor.commands.setContent(`<p data-blockid="${B}">theirs</p>`);
		expect(blockIdsOf(editor.state.doc)).toEqual([B]);
		editor.destroy();
	});

	it('anchors every block after an edit made here, and gives a copy a new anchor', () => {
		const editor = editorWith({ type: 'doc', content: [paragraph('one', A), paragraph('two')] });
		// Opening the page changes nothing.
		expect(blockIdsOf(editor.state.doc)).toEqual([A]);
		editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'paragraph', attrs: { blockId: A }, content: [{ type: 'text', text: 'pasted' }] });
		const ids = blockIdsOf(editor.state.doc);
		expect(ids).toHaveLength(3);
		expect(ids[0]).toBe(A);
		expect(new Set(ids).size).toBe(3);
		expect(ids.every(isBlockId)).toBe(true);
		editor.destroy();
	});

	it('gives a split block an anchor of its own', () => {
		const editor = editorWith({ type: 'doc', content: [paragraph('first second', A)] });
		editor.chain().setTextSelection(7).splitBlock().run();
		const ids = blockIdsOf(editor.state.doc);
		expect(ids).toHaveLength(2);
		expect(ids[0]).toBe(A);
		expect(ids[1]).not.toBe(A);
		editor.destroy();
	});

	it('leaves the edits of a live session alone', () => {
		const editor = editorWith({ type: 'doc', content: [paragraph('one')] });
		editor.view.dispatch(editor.state.tr.insertText('!', 1).setMeta('y-sync$', { isChangeOrigin: true }));
		expect(blockIdsOf(editor.state.doc)).toEqual([]);
		editor.destroy();
	});

	it("anchors the selection's block on demand, and answers the anchor it already has", () => {
		const editor = editorWith({ type: 'doc', content: [paragraph('one', A), { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph('item')] }] }] });
		editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)));
		expect(anchorSelectionBlock(editor.state)).toEqual({ blockId: A, transaction: null });
		// Inside a list, the innermost anchored block is the item's paragraph.
		let inItem = 0;
		editor.state.doc.descendants((node, pos) => {
			if (node.isText && node.text === 'item') inItem = pos + 1;
		});
		editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, inItem)));
		const anchored = anchorSelectionBlock(editor.state);
		expect(anchored && isBlockId(anchored.blockId)).toBe(true);
		if (anchored?.transaction) editor.view.dispatch(anchored.transaction);
		expect(blockOf(editor.state.doc, anchored!.blockId)?.node.textContent).toBe('item');
		expect(blockOf(editor.state.doc, anchored!.blockId)?.node.type.name).toBe('paragraph');
		editor.destroy();
	});

	it('gives a block without an anchor one when asked, as an edit', () => {
		const editor = editorWith({ type: 'doc', content: [paragraph('one')] });
		editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 2)));
		// Nothing was edited yet: the block has no anchor.
		expect(blockIdsOf(editor.state.doc)).toEqual([]);
		const anchored = anchorSelectionBlock(editor.state);
		expect(anchored?.transaction).not.toBeNull();
		editor.view.dispatch(anchored!.transaction!);
		expect(blockIdsOf(editor.state.doc)[0]).toBe(anchored!.blockId);
		editor.destroy();
	});
});
