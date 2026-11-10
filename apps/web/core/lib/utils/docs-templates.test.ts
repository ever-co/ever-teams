import { DOCS_TEMPLATES, buildTemplateContent } from './docs-templates';

describe('buildTemplateContent', () => {
	it('writes a heading and its starting block per section, in the document and in the HTML', () => {
		const built = buildTemplateContent([
			{ heading: 'Agenda', block: 'bullets' },
			{ heading: 'Notes', block: 'text' },
			{ heading: 'Action items', block: 'todos' }
		]);
		expect(built.contentJson.content?.map((node) => node.type)).toEqual(['heading', 'bulletList', 'heading', 'paragraph', 'heading', 'taskList']);
		expect(built.contentJson.content?.[0]).toEqual({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Agenda' }] });
		expect(built.contentHtml).toBe(
			'<h2>Agenda</h2><ul><li><p></p></li></ul><h2>Notes</h2><p></p><h2>Action items</h2><ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p></p></li></ul>'
		);
	});

	it('escapes a translated heading in the HTML and keeps it as written in the document', () => {
		const built = buildTemplateContent([{ heading: 'Risks & <open> "questions"', block: 'text' }]);
		expect(built.contentHtml).toBe('<h2>Risks &amp; &lt;open&gt; &quot;questions&quot;</h2><p></p>');
		expect(built.contentJson.content?.[0].content?.[0].text).toBe('Risks & <open> "questions"');
	});

	it('answers an empty page for no sections', () => {
		expect(buildTemplateContent([])).toEqual({ contentJson: { type: 'doc', content: [{ type: 'paragraph' }] }, contentHtml: '' });
	});
});

describe('DOCS_TEMPLATES', () => {
	it('names each template once', () => {
		const ids = DOCS_TEMPLATES.map((template) => template.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
