import {
	conflictQueryString,
	conflictResolveRefusalOf,
	conflictValueView,
	plainTextOf
} from './integration-sync-conflicts';

describe('integration sync conflicts', () => {
	it('builds the list query with only the filters given', () => {
		expect(conflictQueryString()).toBe('');
		expect(conflictQueryString({ status: 'open', runId: null })).toBe('?status=open');
		expect(conflictQueryString({ status: 'resolved', runId: 'run/1', take: 50 })).toBe(
			'?status=resolved&runId=run%2F1&take=50'
		);
	});

	it('shows an empty value as empty, and a due date as a date', () => {
		expect(conflictValueView('title', null)).toMatchObject({ empty: true });
		expect(conflictValueView('title', '   ')).toMatchObject({ empty: true });
		const due = conflictValueView('dueDate', '2026-11-20T09:00:00.000Z');
		expect(due.empty).toBe(false);
		expect(due.date?.toISOString()).toBe('2026-11-20T09:00:00.000Z');
		// Not a date: shown as the text it is.
		expect(conflictValueView('dueDate', 'soon')).toMatchObject({ date: null, text: 'soon' });
		// A status is shown as it is stored.
		expect(conflictValueView('status', 'in-progress')).toMatchObject({
			empty: false,
			date: null,
			text: 'in-progress'
		});
	});

	it('shows a description as its text, never its HTML, and cuts a long value', () => {
		const view = conflictValueView(
			'description',
			'<p>Fix the <strong>login</strong> &amp; signup</p><p>Second&#39;s &#x27;line&#x27;</p>'
		);
		expect(view.text).toBe("Fix the login & signup Second's 'line'");
		expect(conflictValueView('description', '<p> </p>')).toMatchObject({ empty: true });
		// A reference to text that reads as markup stays text: nothing is parsed.
		expect(plainTextOf('&lt;img src=x onerror=alert(1)&gt;')).toBe('<img src=x onerror=alert(1)>');
		expect(plainTextOf('&bogus; &#0;')).toBe('&bogus; &#0;');

		const long = conflictValueView('title', 'x'.repeat(400));
		expect(long.text).toHaveLength(160);
		expect(long.text.endsWith('…')).toBe(true);
		expect(long.full).toHaveLength(400);
	});

	it('reads the text of HTML with spaces at block ends', () => {
		expect(plainTextOf('<ul><li>one</li><li>two</li></ul>line<br>break<br/>end')).toBe('one two line break end');
	});

	it('tells a stale conflict (409) and a gone one (404) from any other refusal', () => {
		expect(conflictResolveRefusalOf({ response: { status: 409 } })).toBe('stale');
		expect(conflictResolveRefusalOf({ statusCode: 404 })).toBe('notFound');
		expect(conflictResolveRefusalOf({ response: { status: 403 } })).toBe('other');
		expect(conflictResolveRefusalOf(new Error('offline'))).toBe('other');
	});
});
