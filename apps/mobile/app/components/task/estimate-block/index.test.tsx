import React from 'react';
import { observable, runInAction } from 'mobx';
import { act, render, screen } from '@testing-library/react-native';
import EstimateBlock from './index';

// The task store as the app holds it: observable, so the block follows the task the page loads after mounting
const mockTaskStore = observable({ detailedTask: { estimate: 7200, members: [] } as Record<string, unknown> });

jest.mock('../../../models', () => ({ useStores: () => ({ TaskStore: mockTaskStore }) }));
jest.mock('../../accordion', () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => children
}));
jest.mock('./components/profile-info-with-time', () => ({ __esModule: true, default: () => null }));
jest.mock('../details-block/components/property-label', () => ({ PropertyLabel: () => null }));
jest.mock('../../../i18n', () => ({ translate: (key: string) => key }));
jest.mock('../../../theme', () => ({ useAppTheme: () => ({ colors: { primary: '#282048' } }) }));

describe("a task's Estimate", () => {
	it('follows the task the page loads after mounting, never keeping the first one', async () => {
		await render(<EstimateBlock />);
		expect(screen.getByText('2h : 0m')).toBeTruthy();

		await act(async () => {
			runInAction(() => {
				mockTaskStore.detailedTask = { estimate: 5400, members: [] };
			});
		});

		expect(await screen.findByText('1h : 30m')).toBeTruthy();
	});
});
