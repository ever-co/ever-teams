/**
 * @jest-environment jsdom
 */
/**
 * The in-app board's live collaboration shares the scene and opens it in the board app, live, naming the origin of
 * this deployment: the board then signs the person in here, not on a default deployment.
 */
import { act, renderHook } from '@testing-library/react';
import { useBoard } from './use-board';

const mockExportToBackend = jest.fn();

jest.mock('@/core/lib/helpers/export-to-backend', () => ({
	exportToBackend: (...args: unknown[]) => mockExportToBackend(...args)
}));
jest.mock('@tanstack/react-query', () => ({
	useQueryClient: () => ({ fetchQuery: ({ queryFn }: { queryFn: () => unknown }) => queryFn() })
}));

const excalidrawAPI = {
	getSceneElements: () => [],
	getAppState: () => ({}),
	getFiles: () => ({}),
	addFiles: jest.fn(),
	updateScene: jest.fn(),
	scrollToContent: jest.fn()
};

let open: jest.SpyInstance;

beforeEach(() => {
	open = jest.spyOn(window, 'open').mockImplementation(() => null);
});

afterEach(() => {
	open.mockRestore();
});

async function startLiveCollaboration() {
	const { result } = renderHook(() => useBoard());
	act(() => result.current.setExcalidrawAPI(excalidrawAPI as never));
	await act(async () => {
		await result.current.onLiveCollaboration();
	});
}

describe('useBoard live collaboration', () => {
	it('opens the shared scene in the board app, live, naming the origin of this deployment', async () => {
		mockExportToBackend.mockResolvedValue({
			url: 'https://board.ever.team/#json=scene-1,key-1',
			errorMessage: null
		});

		await startLiveCollaboration();

		expect(open).toHaveBeenCalledTimes(1);
		const [href, target, features] = open.mock.calls[0];
		const url = new URL(href);
		expect([target, features]).toEqual(['_blank', 'noreferrer']);
		expect(url.origin).toBe('https://board.ever.team');
		expect(url.hash).toBe('#json=scene-1,key-1');
		expect(url.searchParams.get('live')).toBe('true');
		expect(url.searchParams.get('origin')).toBe(window.location.origin);
	});

	it('opens nothing when the scene could not be shared', async () => {
		mockExportToBackend.mockResolvedValue({ url: null, errorMessage: 'could Not Create Shareable Link' });

		await startLiveCollaboration();

		expect(mockExportToBackend).toHaveBeenCalledTimes(1);
		expect(open).not.toHaveBeenCalled();
	});
});
