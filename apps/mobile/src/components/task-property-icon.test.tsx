import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { TaskPropertyIcon, TaskPropertyPlaceholderIcon } from './task-property-icon';
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
jest.mock('./icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());
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

	it('places the priority bars on one baseline, 4 apart, all filled for High', async () => {
		await render(<TaskPropertyIcon kind="priority" name="High" color="#ece8fc" />);

		const bars = screen.getAllByTestId('rect');
		expect(bars.map((bar) => [bar.props.x, bar.props.y, bar.props.height])).toEqual([
			[1.5, 8, 4.5],
			[5.5, 5, 7.5],
			[9.5, 2, 10.5]
		]);
		expect(bars.map((bar) => bar.props.fillOpacity)).toEqual([1, 1, 1]);
	});

	it('draws Critical as the urgent square', async () => {
		await render(<TaskPropertyIcon kind="priority" name="Critical" color="#ffcc00" />);

		expect(screen.getByTestId('rect').props).toMatchObject({ width: '12', height: '12', rx: '3' });
	});

	it('reads a name the way the web spells it, hyphens and underscores as spaces', async () => {
		await render(<TaskPropertyIcon kind="status" name="for_testing" color="#ffcc00" />);

		expect(screen.getByTestId('path').props.d).toBe('M7 7V4a3 3 0 1 1-3 3Z');
	});

	it('draws an Extra-Large size with a square of side 7, and an unknown size as a dot', async () => {
		const { rerender } = await render(<TaskPropertyIcon kind="size" name="Extra-Large" color="#f5e6b8" />);

		expect(screen.getAllByTestId('rect')[1].props).toMatchObject({ width: 7, y: 3.5 });

		await rerender(<TaskPropertyIcon kind="size" name="Huge" color="#f5e6b8" />);

		expect(screen.queryAllByTestId('rect')).toHaveLength(0);
		expect(screen.getByTestId('circle').props.r).toBe('3.5');
	});

	it("draws a version as the web's tag, in muted-foreground when it has no color", async () => {
		await render(<TaskPropertyIcon kind="version" name="Spring release" />);

		expect(screen.getByTestId('icon-Tag')).toHaveStyle({ color: light.colors['muted-foreground'] });
	});
});

describe("a task property's placeholder glyph", () => {
	it('draws an empty status as the dashed ring, in muted-foreground', async () => {
		await render(<TaskPropertyPlaceholderIcon kind="status" />);

		expect(screen.getByTestId('circle').props).toMatchObject({
			strokeDasharray: '1.5 1.51',
			stroke: light.colors['muted-foreground']
		});
	});

	it('draws an empty priority as its dashes, and an empty size as its frame alone', async () => {
		const { rerender } = await render(<TaskPropertyPlaceholderIcon kind="priority" />);

		expect(screen.getByTestId('path').props.d).toBe('M2 7h2M6 7h2M10 7h2');

		await rerender(<TaskPropertyPlaceholderIcon kind="size" />);

		expect(screen.getAllByTestId('rect')).toHaveLength(1);
		expect(screen.getByTestId('rect').props.strokeOpacity).toBe('0.35');
	});

	it('draws an empty label or version as the tag, in the color asked', async () => {
		await render(<TaskPropertyPlaceholderIcon kind="version" color="#282048" />);

		expect(screen.getByTestId('icon-Tag')).toHaveStyle({ color: '#282048' });
	});

	it("draws an empty issue type or epic as the web's four-square outline, and an empty project as its cube", async () => {
		const { rerender } = await render(<TaskPropertyPlaceholderIcon kind="issueType" />);

		expect(screen.getAllByTestId('path')).toHaveLength(4);

		await rerender(<TaskPropertyPlaceholderIcon kind="project" color="#282048" />);

		expect(screen.getByTestId('icon-Cube')).toHaveStyle({ color: '#282048' });
	});
});
