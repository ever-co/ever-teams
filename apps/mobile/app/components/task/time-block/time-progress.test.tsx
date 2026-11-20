import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Progress } from './time-progress';
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
});
