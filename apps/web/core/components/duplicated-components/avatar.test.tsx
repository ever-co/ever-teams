/** @jest-environment jsdom */

// cspell:ignore alish

/**
 * Avatar (duplicated-components) — same defect as AvatarImage/AvatarStack: a ROUTE-RELATIVE
 * `imageUrl` from the Gauzy seed (`assets/images/avatars/avatar-default.svg`) went straight into
 * next/image, so the browser resolved it against the current route and 404'd. This component renders
 * the profile header, the collaborate panel and the sidebar avatars.
 *
 * The rendered `src` is decoded before asserting so the expectation holds whether next/image emits
 * the raw path or its optimiser URL (`/_next/image?url=...`).
 */
import { render, screen } from '@testing-library/react';
import { Avatar } from './avatar';

jest.mock('jotai', () => ({
	useAtom: () => [{}, jest.fn()]
}));

jest.mock('@/core/stores', () => ({
	avatarState: {}
}));

const decodedSrc = (alt: string) => decodeURIComponent(screen.getByAltText(alt).getAttribute('src') || '');

describe('Avatar', () => {
	it('makes a route-relative seed path root-relative', () => {
		render(<Avatar size={32} imageUrl="assets/images/avatars/alish.jpg" alt="Alish M." />);

		expect(decodedSrc('Alish M.')).toContain('/assets/images/avatars/alish.jpg');
	});

	it('leaves an absolute uploaded-avatar URL untouched', () => {
		render(<Avatar size={32} imageUrl="https://cdn.ever.co/avatars/alish.jpg" alt="Alish M." />);

		expect(decodedSrc('Alish M.')).toContain('https://cdn.ever.co/avatars/alish.jpg');
	});

	// A whitespace-only value is truthy, so branching on the RAW value would render <Image src="">,
	// which next/image rejects. The branch has to use the normalised value.
	it('renders the initial instead of an empty src when imageUrl is whitespace only', () => {
		render(<Avatar size={32} imageUrl="   " imageTitle="Rahul" alt="Rahul S." />);

		expect(screen.queryByAltText('Rahul S.')).toBeNull();
		expect(screen.getByText('R')).toBeTruthy();
	});
});
