/** @jest-environment jsdom */

// cspell:ignore aiden
/**
 * AvatarStack — same defect as AvatarImage: a ROUTE-RELATIVE `imageUrl` from the Gauzy seed
 * (`assets/images/avatars/aiden.png`) was handed straight to next/image, so the browser resolved it
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
		render(<AvatarStack avatars={[{ imageUrl: 'assets/images/avatars/aiden.png', name: 'Aiden M.' }]} />);

		expect(decodedSrc('Aiden M.')).toContain('/assets/images/avatars/aiden.png');
	});

	it('leaves an absolute uploaded-avatar URL untouched', () => {
		render(<AvatarStack avatars={[{ imageUrl: 'https://cdn.ever.co/avatars/jasmine.png', name: 'Jasmine L.' }]} />);

		expect(decodedSrc('Jasmine L.')).toContain('https://cdn.ever.co/avatars/jasmine.png');
	});

	it('still shows the initials fallback when there is no image', () => {
		render(<AvatarStack avatars={[{ name: 'Rafael S.' }]} />);

		expect(screen.getByLabelText('Avatar for Rafael S.')).toBeTruthy();
	});

	// A whitespace-only value is truthy, so branching on the RAW value would render <Image src="">,
	// which next/image rejects. The branch has to use the normalised value.
	it('shows the initials fallback for a whitespace-only imageUrl instead of rendering an empty src', () => {
		render(<AvatarStack avatars={[{ imageUrl: '   ', name: 'Rafael S.' }]} />);

		expect(screen.getByLabelText('Avatar for Rafael S.')).toBeTruthy();
		expect(screen.queryByAltText('Rafael S.')).toBeNull();
	});
});
