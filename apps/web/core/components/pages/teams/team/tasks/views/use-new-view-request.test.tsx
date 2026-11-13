/** @jest-environment jsdom */
import { renderHook } from '@testing-library/react';

const mockRouter = { replace: jest.fn() };
let mockSearchParams = new URLSearchParams();
let mockViewsEnabled = true;

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
	useSearchParams: () => mockSearchParams
}));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => mockViewsEnabled }));

import { NEW_VIEW_PATH, useNewViewRequest } from './use-new-view-request';

describe('useNewViewRequest', () => {
	beforeEach(() => {
		mockRouter.replace.mockReset();
		mockSearchParams = new URLSearchParams();
		mockViewsEnabled = true;
	});

	it('opens the naming dialog for "New view", and drops the parameter while the dialog shows', () => {
		mockSearchParams = new URLSearchParams(NEW_VIEW_PATH.split('?')[1]);

		const { result } = renderHook(() => useNewViewRequest(false));

		expect(result.current).toBe(true);
		// Dropped at once: closing the dialog has nothing left to undo, so a view just created keeps its page
		expect(mockRouter.replace).toHaveBeenCalledTimes(1);
		expect(mockRouter.replace).toHaveBeenCalledWith('/team/tasks');
	});

	it("leaves the plain team's tasks, a view's page and a build without views alone", () => {
		expect(renderHook(() => useNewViewRequest(false)).result.current).toBe(false);

		mockSearchParams = new URLSearchParams('saveView=1');
		expect(renderHook(() => useNewViewRequest(true)).result.current).toBe(false);

		mockViewsEnabled = false;
		expect(renderHook(() => useNewViewRequest(false)).result.current).toBe(false);

		expect(mockRouter.replace).not.toHaveBeenCalled();
	});
});
