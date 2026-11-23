import { renderHook } from '@testing-library/react-native';
import { useMapToTaskStatusValues } from './status-type';
import { ITaskStatusItem } from '../services/interfaces/ITaskStatus';

jest.mock('../services/hooks/features/use-task-labels', () => ({ useTaskLabels: jest.fn() }));
jest.mock('../services/hooks/features/use-task-priority', () => ({ useTaskPriority: jest.fn() }));
jest.mock('../services/hooks/features/use-task-sizes', () => ({ useTaskSizes: jest.fn() }));
jest.mock('../services/hooks/features/use-task-status', () => ({ useTaskStatus: jest.fn() }));
jest.mock('../services/hooks/features/use-task-version', () => ({ useTaskVersion: jest.fn() }));

describe("a property's values for its chips", () => {
	it('keep the icon each value was saved with, next to the address of its file', async () => {
		const inProgress = {
			name: 'in-progress',
			value: 'in-progress',
			color: '#ece8fc',
			icon: 'ever-icons/task-statuses/in-progress.svg',
			fullIconUrl: 'https://api.example.com/ever-icons/task-statuses/in-progress.svg'
		} as ITaskStatusItem;

		const { result } = await renderHook(() => useMapToTaskStatusValues([inProgress]));

		expect(result.current['in progress']).toMatchObject({
			storedIcon: 'ever-icons/task-statuses/in-progress.svg',
			iconUrl: 'https://api.example.com/ever-icons/task-statuses/in-progress.svg'
		});
	});
});
