import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ChipIcon } from './chip-icon';

// The glyph and the icon file as plain text naming what the chip chose to draw
jest.mock('./task-property-icon', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		TaskPropertyIcon: ({ kind, name, color }: { kind: string; name?: string; color?: string }) => (
			<MockText testID="glyph">{`${kind} ${name} ${color}`}</MockText>
		)
	};
});
jest.mock('./tinted-icon', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		TintedIcon: ({ uri }: { uri: string }) => <MockText testID="icon-file">{uri}</MockText>
	};
});

const OPEN_FILE = 'https://api.example.com/ever-icons/task-statuses/open.svg';

describe("a chip's icon", () => {
	it("draws the web's glyph for a status seeded with a classic icon", async () => {
		const item = {
			name: 'open',
			bgColor: '#d6e4f9',
			storedIcon: 'ever-icons/task-statuses/open.svg',
			iconUrl: OPEN_FILE
		};
		await render(<ChipIcon item={item} color="#000" kind="status" />);

		expect(screen.getByTestId('glyph')).toHaveTextContent('status open #d6e4f9');
		expect(screen.queryByTestId('icon-file')).toBeNull();
	});

	it('draws the icon file the user gave a priority, in place of the glyph', async () => {
		const item = {
			name: 'high',
			storedIcon: 'image-asset:a1:LOCAL:icons/rocket.svg',
			iconUrl: 'https://api.example.com/rocket.svg'
		};
		await render(<ChipIcon item={item} color="#000" kind="priority" />);

		expect(screen.getByTestId('icon-file')).toHaveTextContent('https://api.example.com/rocket.svg');
	});

	it('draws the glyph for a library icon, which Gauzy gives no file for', async () => {
		await render(<ChipIcon item={{ name: 'large', storedIcon: 'hugeicons:rocket' }} color="#000" kind="size" />);

		expect(screen.getByTestId('glyph')).toHaveTextContent(/^size large/);
	});

	it("draws a label's dot even when the label has an icon file", async () => {
		const item = { name: 'bug fix', storedIcon: 'icons/bug.svg', iconUrl: 'https://api.example.com/bug.svg' };
		await render(<ChipIcon item={item} color="#000" kind="label" />);

		expect(screen.getByTestId('glyph')).toHaveTextContent(/^label bug fix/);
	});

	it('keeps drawing the API icon file when the chip names no kind', async () => {
		await render(<ChipIcon item={{ iconUrl: OPEN_FILE }} color="#000" />);

		expect(screen.getByTestId('icon-file')).toHaveTextContent(OPEN_FILE);
	});
});
