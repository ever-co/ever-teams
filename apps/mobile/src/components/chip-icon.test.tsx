import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ChipIcon } from './chip-icon';

// The glyph and the icon file as plain text naming what the chip chose to draw
jest.mock('./task-property-icon', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return {
		TaskPropertyIcon: ({
			kind,
			name,
			color,
			size
		}: {
			kind: string;
			name?: string;
			color?: string;
			size?: number;
		}) => <MockText testID="glyph" size={size}>{`${kind} ${name} ${color}`}</MockText>
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

	it('draws a picture the user uploaded as it is, and the glyph once it fails to load', async () => {
		const item = {
			name: 'high',
			bgColor: '#e0eafc',
			storedIcon: 'image-asset:a1:S3:icons/rocket.png',
			iconUrl: 'https://files.example.com/icons/rocket.png?signature=abc'
		};
		await render(<ChipIcon item={item} color="#000" kind="priority" />);

		expect(screen.getByTestId('chip-icon-picture').props.source).toEqual({ uri: item.iconUrl });
		expect(screen.queryByTestId('icon-file')).toBeNull();

		await fireEvent(screen.getByTestId('chip-icon-picture'), 'error');

		expect(screen.queryByTestId('chip-icon-picture')).toBeNull();
		expect(screen.getByTestId('glyph')).toHaveTextContent('priority high #e0eafc');
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

	it('draws at the size a menu row asks, 14 by default as in a chip', async () => {
		const { rerender } = await render(<ChipIcon item={{ name: 'open' }} color="#000" kind="status" size={16} />);

		expect(screen.getByTestId('glyph').props.size).toBe(16);

		await rerender(<ChipIcon item={{ name: 'open' }} color="#000" kind="status" />);

		expect(screen.getByTestId('glyph').props.size).toBe(14);
	});
});
