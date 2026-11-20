import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TaskPropertyIcon } from './task-property-icon';
import { dataColorHueOf } from '../theme/data-color';
import { themeFor } from '../theme/use-theme';

// The SVG elements as plain views carrying their attributes, so a test reads the shapes a glyph draws
jest.mock('react-native-svg', () => {
	const mockReact = jest.requireActual('react');
	const { View: MockView } = jest.requireActual('react-native');
	const element =
		(tag: string) =>
		({ children, ...props }: { children?: React.ReactNode; testID?: string }) =>
			mockReact.createElement(MockView, { testID: props.testID ?? tag, ...props }, children);
	return {
		__esModule: true,
		default: element('svg'),
		Circle: element('circle'),
		Path: element('path'),
		Rect: element('rect')
	};
});
jest.mock('../../app/theme', () => ({
	useWebTheme: () => jest.requireActual('../theme/use-theme').themeFor('light')
}));

const light = themeFor('light');

describe("a task property's glyph", () => {
	it('draws In Progress as a ring half filled, in the hue of its color', async () => {
		await render(<TaskPropertyIcon kind="status" name="in-progress" color="#ece8fc" />);

		expect(screen.getByTestId('circle').props).toMatchObject({ r: '5.75', stroke: dataColorHueOf('#ece8fc') });
		expect(screen.getByTestId('path').props.d).toBe('M7 4a3 3 0 0 1 0 6Z');
	});

	it('draws Done as a filled disc with a check in the card color', async () => {
		await render(<TaskPropertyIcon kind="status" name="Done" color="#4caf50" />);

		expect(screen.getByTestId('circle').props).toMatchObject({ r: '6.5', fill: dataColorHueOf('#4caf50') });
		expect(screen.getByTestId('path').props.stroke).toBe(light.colors.card);
	});

	it('draws a Backlog ring dashed', async () => {
		await render(<TaskPropertyIcon kind="status" name="Backlog" color="#ffcc00" />);

		expect(screen.getByTestId('circle').props.strokeDasharray).toBe('1.5 1.51');
	});

	it('draws Medium priority as three bars, the last one faded', async () => {
		await render(<TaskPropertyIcon kind="priority" name="Medium" color="#ece8fc" />);

		expect(screen.getAllByTestId('rect').map((bar) => bar.props.fillOpacity)).toEqual([1, 1, 0.3]);
	});

	it('draws a Large size as its frame and a square of side 6', async () => {
		await render(<TaskPropertyIcon kind="size" name="large" color="#f5e6b8" />);

		const [frame, square] = screen.getAllByTestId('rect');
		expect(frame.props.strokeOpacity).toBe('0.35');
		expect(square.props).toMatchObject({ width: 6, height: 6 });
	});

	it('draws a label as a dot, in muted-foreground when it has no color', async () => {
		await render(<TaskPropertyIcon kind="label" name="bug-fix" />);

		expect(screen.getByTestId('circle').props).toMatchObject({ r: '3.5', fill: light.colors['muted-foreground'] });
	});
});
