// cspell:ignore alish julia rahul
/**
 * AvatarImage — every user avatar 404'd on demo.ever.team. The Gauzy API returns a ROUTE-RELATIVE
 * `imageUrl` for seeded users/employees (`assets/images/avatars/avatar-default.svg`), and this
 * primitive passed it straight to Radix, so the browser resolved it against the current route:
 * `/dashboard/team-dashboard/assets/images/avatars/alish.jpg` -> 404. The team dashboard
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
		expect(renderProps({ src: 'assets/images/avatars/alish.jpg' }).src).toBe('/assets/images/avatars/alish.jpg');
	});

	it('leaves an absolute uploaded-avatar URL untouched', () => {
		expect(renderProps({ src: 'https://cdn.ever.co/avatars/alish.jpg' }).src).toBe(
			'https://cdn.ever.co/avatars/alish.jpg'
		);
	});

	it('leaves an already root-relative path untouched', () => {
		expect(renderProps({ src: '/assets/images/avatars/alish.jpg' }).src).toBe('/assets/images/avatars/alish.jpg');
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

	it('still forwards the other props it is given', () => {
		const props = renderProps({ src: 'assets/a.png', alt: 'Alish M.' });
		expect(props.alt).toBe('Alish M.');
	});
});
