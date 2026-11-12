import * as Y from 'yjs';
import { encodeLiveAnchorPosition, liveAnchorResolverOf } from './anchor-resolver';
import { DOCS_LIVE_FIELD } from './config';

/** A block element with an anchor, holding one text, as the editor's binding writes it. */
function block(name: string, blockId: string, text: string): Y.XmlElement {
	const element = new Y.XmlElement(name);
	element.setAttribute('blockId', blockId);
	element.insert(0, [new Y.XmlText(text)]);
	return element;
}

function textOf(element: Y.XmlElement): Y.XmlText {
	return element.get(0) as Y.XmlText;
}

describe('liveAnchorResolverOf', () => {
	it('reads a relative position as its block and offset, after edits by others before it', () => {
		const doc = new Y.Doc();
		const paragraph = block('paragraph', 'b1', 'Hello brave new world');
		doc.getXmlFragment(DOCS_LIVE_FIELD).push([paragraph]);
		const at = (index: number) => encodeLiveAnchorPosition(Y.createRelativePositionFromTypeIndex(textOf(paragraph), index));
		const start = at(6);
		const end = at(11);

		textOf(paragraph).insert(0, 'Oh, ');

		const resolve = liveAnchorResolverOf(doc);
		expect(resolve(start)).toEqual({ blockId: 'b1', offset: 10 });
		expect(resolve(end)).toEqual({ blockId: 'b1', offset: 15 });
	});

	it('counts the text before it in the nearest block with an anchor, through the elements in between', () => {
		const doc = new Y.Doc();
		const item = new Y.XmlElement('listItem');
		const first = block('paragraph', 'b-first', 'First ');
		const second = new Y.XmlElement('paragraph');
		second.insert(0, [new Y.XmlText('second')]);
		item.insert(0, [first, second]);
		const list = new Y.XmlElement('bulletList');
		list.setAttribute('blockId', 'list');
		list.insert(0, [item]);
		doc.getXmlFragment(DOCS_LIVE_FIELD).push([list]);

		const resolve = liveAnchorResolverOf(doc);
		// In a block of its own: its own text.
		expect(resolve(encodeLiveAnchorPosition(Y.createRelativePositionFromTypeIndex(textOf(first), 2)))).toEqual({ blockId: 'b-first', offset: 2 });
		// In a paragraph without an anchor: the list's text before it counts.
		expect(resolve(encodeLiveAnchorPosition(Y.createRelativePositionFromTypeIndex(second.get(0) as Y.XmlText, 3)))).toEqual({ blockId: 'list', offset: 9 });
	});

	it('reads nothing for a value that is no relative position, or a position outside the page', () => {
		const doc = new Y.Doc();
		doc.getXmlFragment(DOCS_LIVE_FIELD).push([block('paragraph', 'b1', 'Text')]);
		const elsewhere = doc.getXmlFragment('other');
		const outside = block('paragraph', 'b2', 'Outside');
		elsewhere.push([outside]);

		const resolve = liveAnchorResolverOf(doc);
		expect(resolve('')).toBeNull();
		expect(resolve('not base64!')).toBeNull();
		expect(resolve(encodeLiveAnchorPosition(Y.createRelativePositionFromTypeIndex(textOf(outside), 1)))).toBeNull();
	});
});
