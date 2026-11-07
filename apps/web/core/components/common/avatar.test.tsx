// cspell:ignore aiden
/**
 * AvatarImage — every user avatar 404'd on demo.ever.team. The Gauzy API returns a ROUTE-RELATIVE
 * `imageUrl` for seeded users/employees (`assets/images/avatars/avatar-default.svg`), and this
 * primitive passed it straight to Radix, so the browser resolved it against the current route:
 * `/dashboard/team-dashboard/assets/images/avatars/aiden.png` -> 404. The team dashboard
 * (`team-stats-table.tsx`) renders through exactly this component.
 *
 * These assert on the element the component actually returns rather than on rendered DOM, because
 * `AvatarPrimitive.Image` only commits an <img> once a real image load resolves — which never
 * happens under jsdom, so a DOM-based test here would pass vacuously.
 */
import { AvatarImage } from './avatar';

type ForwardRefWithRender = {
	render: (props: Record<string, unknown>, ref: unknown) => { props: Record<string, unknown> };
};

const renderProps = (props: Record<string, unknown>) =>
	(AvatarImage as unknown as ForwardRefWithRender).render(props, null).props;

describe('AvatarImage', () => {
	it('makes a route-relative seed path root-relative so it cannot resolve against the current route', () => {
		expect(renderProps({ src: 'assets/images/avatars/aiden.png' }).src).toBe('/assets/images/avatars/aiden.png');
	});

	it('leaves an absolute uploaded-avatar URL untouched', () => {
		expect(renderProps({ src: 'https://cdn.ever.co/avatars/aiden.png' }).src).toBe(
			'https://cdn.ever.co/avatars/aiden.png'
		);
	});

	it('leaves an already root-relative path untouched', () => {
		expect(renderProps({ src: '/assets/images/avatars/aiden.png' }).src).toBe('/assets/images/avatars/aiden.png');
	});

	it('passes undefined through so the fallback still renders', () => {
		expect(renderProps({ src: undefined }).src).toBeUndefined();
	});

	// An empty `src` makes the underlying <img> request the current document URL, so it must become
	// `undefined` — which is also what tells Radix to show the fallback.
	it('turns an empty src into undefined rather than requesting the current document', () => {
		expect(renderProps({ src: '' }).src).toBeUndefined();
	});

	it('turns a whitespace-only src into undefined', () => {
		expect(renderProps({ src: '   ' }).src).toBeUndefined();
	});

	// React 19 types an <img> `src` as `string | Blob | undefined`. A Blob carries its own data and
	// cannot resolve against a route, so it must be forwarded untouched.
	it('forwards a Blob src untouched', () => {
		const blob = new Blob(['x'], { type: 'image/png' });

		expect(renderProps({ src: blob }).src).toBe(blob);
	});

	it('still forwards the other props it is given', () => {
		const props = renderProps({ src: 'assets/a.png', alt: 'Aiden M.' });
		expect(props.alt).toBe('Aiden M.');
	});
});
