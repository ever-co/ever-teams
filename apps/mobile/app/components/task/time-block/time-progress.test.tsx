import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { Progress, progressBarColorsOf } from './time-progress';
import { themeFor } from '../../../../src/theme/use-theme';
import type { ITeamTask } from '../../../services/interfaces/ITask';

jest.mock('../../../theme', () => ({
	useWebTheme: () => jest.requireActual('../../../../src/theme/use-theme').themeFor('dark')
}));

const repaint = { estimate: 7200 } as ITeamTask;

describe("a task's time progress", () => {
	it('reads its percentage in muted-foreground, which shows on a dark page too', async () => {
		await render(<Progress task={repaint} percent={() => 0.5} />);

		expect(screen.getByText('50%')).toHaveStyle({ color: themeFor('dark').colors['muted-foreground'] });
	});

	it("fills in the web's success color on its faint foreground track, in dark mode too", async () => {
		const dark = themeFor('dark');

		expect(progressBarColorsOf(repaint, dark)).toEqual({ fill: dark.colors.success, track: dark.foreground(10) });
		expect(progressBarColorsOf({ estimate: 0 } as ITeamTask, dark).fill).toBe(dark.foreground(10));

		await render(<Progress task={repaint} percent={() => 0.5} />);
		const track = screen.getByRole('progressbar').children[0];
		expect(typeof track).not.toBe('string');
		if (typeof track !== 'string') {
			expect(StyleSheet.flatten(track.props.style).backgroundColor).toBe(dark.foreground(10));
		}
	});
});
