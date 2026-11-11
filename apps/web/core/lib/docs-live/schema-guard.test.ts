import * as Y from 'yjs';
import { unknownTypesInFragment, unknownTypesInUpdate } from './schema-guard';

const SCHEMA = { nodes: new Set(['doc', 'paragraph', 'text', 'mention']), marks: new Set(['bold', 'link']) };

function paragraph(text: string, attributes?: Record<string, unknown>, name = 'paragraph'): Y.XmlElement {
	const element = new Y.XmlElement(name);
	const run = new Y.XmlText();
	run.insert(0, text, attributes);
	element.insert(0, [run]);
	return element;
}

describe('docs live schema guard', () => {
	it('lets through what the editor knows', () => {
		const doc = new Y.Doc();
		doc.getXmlFragment('default').push([paragraph('Hello', { bold: {} }), new Y.XmlElement('mention')]);
		expect(unknownTypesInUpdate(Y.encodeStateAsUpdate(doc), SCHEMA)).toEqual([]);
		expect(unknownTypesInFragment(doc.getXmlFragment('default'), SCHEMA)).toEqual([]);
	});

	it('names the nodes and marks the editor does not know, in an update and in a document', () => {
		const doc = new Y.Doc();
		doc.getXmlFragment('default').push([
			paragraph('Note', { highlight: { color: 'yellow' } }),
			paragraph('Box', undefined, 'callout')
		]);
		expect(unknownTypesInUpdate(Y.encodeStateAsUpdate(doc), SCHEMA)).toEqual(['callout', 'highlight']);
		expect(unknownTypesInFragment(doc.getXmlFragment('default'), SCHEMA)).toEqual(['callout', 'highlight']);
	});

	it('reads an overlapping mark stored under its hashed name as its type', () => {
		const doc = new Y.Doc();
		doc.getXmlFragment('default').push([
			paragraph('Linked', { 'link--AbCd1234': { href: 'https://ever.team' } }),
			paragraph('Note', { 'comment--Zz9+/=Aa': {} })
		]);
		expect(unknownTypesInUpdate(Y.encodeStateAsUpdate(doc), SCHEMA)).toEqual(['comment']);
		expect(unknownTypesInFragment(doc.getXmlFragment('default'), SCHEMA)).toEqual(['comment']);
	});

	it('reads only what an incremental update adds', () => {
		const doc = new Y.Doc();
		doc.getXmlFragment('default').push([paragraph('Box', undefined, 'callout')]);
		const before = Y.encodeStateVector(doc);
		doc.getXmlFragment('default').push([paragraph('Plain')]);
		expect(unknownTypesInUpdate(Y.encodeStateAsUpdate(doc, before), SCHEMA)).toEqual([]);
	});
});
