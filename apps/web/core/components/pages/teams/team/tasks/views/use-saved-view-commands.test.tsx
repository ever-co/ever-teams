/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import type { ITaskView, ITaskViewDefinition } from '@/core/types/interfaces/common/task-views';

const mockSaveDefinition = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/core/lib/utils/task-views-enabled', () => ({ isTaskViewsEnabled: () => true }));
jest.mock('@/core/hooks/task-views/use-task-view-actions', () => {
	class TaskViewConflictError extends Error {
		constructor(public readonly latest: unknown) {
			super('TASK_VIEW_VERSION_CONFLICT');
		}
	}
	return {
		TaskViewConflictError,
		useTaskViewActions: () => ({ saveDefinition: mockSaveDefinition, createView: jest.fn(), updateView: jest.fn(), deleteView: jest.fn() })
	};
});

import { useSavedViewCommands } from './use-saved-view-commands';

const MINE = { groupBy: 'status' } as unknown as ITaskViewDefinition;
const viewAt = (version: number): ITaskView => ({ id: 'v1', name: 'Board', version }) as unknown as ITaskView;

type Props = { savedView: ITaskView; isDirty: boolean };

function render(initial: Props) {
	return renderHook((props: Props) => useSavedViewCommands({ ...props, isBuiltIn: false, definition: MINE, applyDefinition: jest.fn() }), {
		initialProps: initial
	});
}

/** The version the last save stated. */
const statedVersion = (): number | undefined => (mockSaveDefinition.mock.calls.at(-1)?.[0] as ITaskView | undefined)?.version;

describe('useSavedViewCommands, saving a changed view', () => {
	beforeEach(() => mockSaveDefinition.mockReset().mockResolvedValue(viewAt(9)));

	it('states the version the change was made on, also once a newer version reached the page (a conflict, a refetch)', async () => {
		const view = render({ savedView: viewAt(1), isDirty: false });
		// The person changes the view on version 1; then version 2 (someone else's save) reaches the cache.
		view.rerender({ savedView: viewAt(1), isDirty: true });
		view.rerender({ savedView: viewAt(2), isDirty: true });

		await act(async () => view.result.current.toolbarCommands.save());

		// Version 1: the platform answers a conflict instead of letting the change overwrite version 2.
		expect(statedVersion()).toBe(1);
	});

	it('states the newer version once the page shows it (a Reload), and the change is made on it', async () => {
		const view = render({ savedView: viewAt(1), isDirty: true });
		// Reload: the page shows version 2 unchanged; then the person changes it again.
		view.rerender({ savedView: viewAt(2), isDirty: false });
		view.rerender({ savedView: viewAt(2), isDirty: true });

		await act(async () => view.result.current.toolbarCommands.save());

		expect(statedVersion()).toBe(2);
	});
});
