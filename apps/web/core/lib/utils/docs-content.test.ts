import { unsupportedTypesOf } from './docs-content';

const known = { nodes: new Set(['doc', 'paragraph', 'text', 'heading', 'bulletList', 'listItem']), marks: new Set(['bold', 'italic', 'link']) };

describe('unsupportedTypesOf', () => {
	it('finds nothing in a page the editor knows', () => {
		const json = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi', marks: [{ type: 'bold' }] }] }] };
		expect(unsupportedTypesOf(json, known)).toEqual([]);
	});

	it('names the node and mark types another client wrote', () => {
		const json = {
			type: 'doc',
			content: [
				{ type: 'callout', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'highlight' }] }] }] },
				{ type: 'table', content: [] },
				{ type: 'callout' }
			]
		};
		expect(unsupportedTypesOf(json, known)).toEqual(['callout', 'highlight', 'table']);
	});

	it('takes no page as nothing to report', () => {
		expect(unsupportedTypesOf(null, known)).toEqual([]);
	});
});
