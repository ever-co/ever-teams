import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import FilterPopup from './filter-popup';
import { ITaskFilter } from '../../../../services/hooks/features/use-task-filters';

jest.mock('./task-priority-filter', () => ({ __esModule: true, default: () => null }));
jest.mock('./task-status-filter', () => ({ __esModule: true, default: () => null }));
jest.mock('./task-label-filter', () => ({ __esModule: true, default: () => null }));
jest.mock('./task-size-filter', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-blur', () => ({ BlurView: () => null }));

const hook = { applyStatusFilter: jest.fn(), resetStatusFilter: jest.fn() } as unknown as ITaskFilter;

describe("the task filter's buttons", () => {
	it.each(['filter-reset', 'filter-apply'])('%s grows to its label, never cutting it', async (testID) => {
		await render(<FilterPopup visible onDismiss={jest.fn()} hook={hook} />);

		const style = StyleSheet.flatten(screen.getByTestId(testID).props.style);
		expect(style.height).toBeUndefined();
		expect(style.minHeight).toBeGreaterThan(0);
	});
});
