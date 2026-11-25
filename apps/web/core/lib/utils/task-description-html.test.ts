import { newTaskDescriptionOf } from './task-description-html';

describe('newTaskDescriptionOf', () => {
	it('puts one paragraph around text typed by hand, as before', () => {
		expect(newTaskDescriptionOf('Fix the login page')).toBe('<p>Fix the login page</p>');
	});

	it('keeps text that merely contains or starts with an angle bracket in a paragraph', () => {
		expect(newTaskDescriptionOf('<3 this flow')).toBe('<p><3 this flow</p>');
		expect(newTaskDescriptionOf('Use <b>bold</b> here')).toBe('<p>Use <b>bold</b> here</p>');
		expect(newTaskDescriptionOf('<paragraph is not a tag we know')).toBe('<p><paragraph is not a tag we know</p>');
	});

	it('sends nothing for an empty description', () => {
		expect(newTaskDescriptionOf('')).toBeNull();
		expect(newTaskDescriptionOf(null)).toBeNull();
		expect(newTaskDescriptionOf(undefined)).toBeNull();
	});

	it('does not wrap the HTML of the rich editor in a second paragraph', () => {
		expect(newTaskDescriptionOf('<p>Fix the login page</p>')).toBe('<p>Fix the login page</p>');
		expect(newTaskDescriptionOf('<p style="text-align: left">Fix</p>')).toBe('<p style="text-align: left">Fix</p>');
	});

	it('keeps the HTML of a copied task whatever block it starts with', () => {
		const html = '<h2>Steps</h2><ul><li>Open the page</li></ul>';
		expect(newTaskDescriptionOf(html)).toBe(html);
		expect(newTaskDescriptionOf('  <ul data-type="taskList"><li>One</li></ul>')).toBe(
			'  <ul data-type="taskList"><li>One</li></ul>'
		);
		expect(newTaskDescriptionOf('<pre><code>x</code></pre>')).toBe('<pre><code>x</code></pre>');
	});

	it('keeps a description that starts with an image or another media element', () => {
		const image = '<img src="https://example.com/a.png" alt="shot"><p>Steps</p>';
		expect(newTaskDescriptionOf(image)).toBe(image);
		expect(newTaskDescriptionOf('<img src="a.png"/>')).toBe('<img src="a.png"/>');
		expect(newTaskDescriptionOf('<figure><img src="a.png"></figure>')).toBe('<figure><img src="a.png"></figure>');
		expect(newTaskDescriptionOf('<br><p>Steps</p>')).toBe('<br><p>Steps</p>');
		expect(newTaskDescriptionOf('<video src="a.mp4"></video>')).toBe('<video src="a.mp4"></video>');
	});

	it('still wraps text that only looks like one of those tags', () => {
		expect(newTaskDescriptionOf('<image of the bug>')).toBe('<p><image of the bug></p>');
		expect(newTaskDescriptionOf('<brief> note')).toBe('<p><brief> note</p>');
	});

	it('is stable when a task is copied again and again', () => {
		const once = newTaskDescriptionOf('<p>Steps</p>') as string;
		expect(newTaskDescriptionOf(once)).toBe('<p>Steps</p>');
	});
});
