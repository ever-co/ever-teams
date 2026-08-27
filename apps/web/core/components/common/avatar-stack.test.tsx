/** @jest-environment jsdom */

// cspell:ignore alish julia rahul
/**
 * AvatarStack — same defect as AvatarImage: a ROUTE-RELATIVE `imageUrl` from the Gauzy seed
 * (`assets/images/avatars/alish.jpg`) was handed straight to next/image, so the browser resolved it
 * against whatever route the user was on and 404'd.
 *
 * The assertion decodes the rendered `src` so it holds whether next/image emits the raw path or its
 * optimiser URL (`/_next/image?url=...`): before the fix the decoded value contains
 * `assets/images/...` with NO leading slash, after it contains `/assets/images/...`.
 */
import { render, screen } from '@testing-library/react';
import AvatarStack from './avatar-stack';

const decodedSrc = (alt: string) => decodeURIComponent(screen.getByAltText(alt).getAttribute('src') || '');

describe('AvatarStack', () => {
	it('makes a route-relative seed path root-relative', () => {
		render(<AvatarStack avatars={[{ imageUrl: 'assets/images/avatars/alish.jpg', name: 'Alish M.' }]} />);

		expect(decodedSrc('Alish M.')).toContain('/assets/images/avatars/alish.jpg');
	});

	it('leaves an absolute uploaded-avatar URL untouched', () => {
		render(<AvatarStack avatars={[{ imageUrl: 'https://cdn.ever.co/avatars/julia.png', name: 'Julia K.' }]} />);

		expect(decodedSrc('Julia K.')).toContain('https://cdn.ever.co/avatars/julia.png');
	});

	it('still shows the initials fallback when there is no image', () => {
		render(<AvatarStack avatars={[{ name: 'Rahul S.' }]} />);

		expect(screen.getByLabelText('Avatar for Rahul S.')).toBeTruthy();
	});

	// A whitespace-only value is truthy, so branching on the RAW value would render <Image src="">,
	// which next/image rejects. The branch has to use the normalised value.
	it('shows the initials fallback for a whitespace-only imageUrl instead of rendering an empty src', () => {
		render(<AvatarStack avatars={[{ imageUrl: '   ', name: 'Rahul S.' }]} />);

		expect(screen.getByLabelText('Avatar for Rahul S.')).toBeTruthy();
		expect(screen.queryByAltText('Rahul S.')).toBeNull();
	});
});
