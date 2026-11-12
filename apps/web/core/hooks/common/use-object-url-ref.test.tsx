/**
 * @jest-environment jsdom
 */
import React, { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { useObjectUrlRef } from './use-object-url-ref';

const created: string[] = [];
const revoked: string[] = [];
beforeAll(() => {
	let next = 0;
	URL.createObjectURL = jest.fn(() => {
		next += 1;
		const url = `blob:picture-${next}`;
		created.push(url);
		return url;
	});
	URL.revokeObjectURL = jest.fn((url: string) => {
		revoked.push(url);
	});
});

beforeEach(() => {
	created.length = 0;
	revoked.length = 0;
});

function Picture({ blob }: Readonly<{ blob: Blob | null }>) {
	const ref = useObjectUrlRef(blob);
	return <img ref={ref} alt="" data-testid="picture" />;
}

describe('useObjectUrlRef', () => {
	it('shows the blob through a URL that stays live while shown, and releases every URL it made', () => {
		const first = new Blob(['a'], { type: 'image/png' });
		const { getByTestId, rerender, unmount } = render(
			<StrictMode>
				<Picture blob={first} />
			</StrictMode>
		);
		const shown = () => getByTestId('picture').getAttribute('src');
		expect(created.length).toBeGreaterThan(0);
		expect(shown()).toBe(created.at(-1));
		expect(revoked).not.toContain(shown());

		// Another picture: the one before is released, the new one shown.
		rerender(
			<StrictMode>
				<Picture blob={new Blob(['b'], { type: 'image/png' })} />
			</StrictMode>
		);
		expect(shown()).toBe(created.at(-1));
		expect(revoked).not.toContain(shown());
		expect(revoked.length).toBe(created.length - 1);

		unmount();
		expect([...revoked].sort()).toEqual([...created].sort());
	});

	it('makes nothing without a blob', () => {
		render(<Picture blob={null} />);
		expect(created).toEqual([]);
	});
});
