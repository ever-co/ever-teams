/** @jest-environment jsdom */

import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { activeTeamIdState, organizationTeamsState } from '@/core/stores/teams/organization-team';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import { timerStatusState } from '@/core/stores/timer/timer';
import { userState } from '@/core/stores/user/user';
import { TaskTimerSection } from './task-timer-section';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// The lazy parts of the block render once loaded, as `next/dynamic` renders them in the browser
jest.mock('next/dynamic', () => {
	const { createElement, lazy, Suspense } = jest.requireActual<typeof import('react')>('react');
	return {
		__esModule: true,
		default: (loader: () => Promise<{ default: ComponentType<object> }>) => {
			const Lazy = lazy(loader);
			return function Loaded(props: object) {
				return createElement(Suspense, { fallback: null }, createElement(Lazy, props));
			};
		}
	};
});
jest.mock('@/core/components/auth/auth-user-task-input', () => ({
	AuthUserTaskInput: () => <div data-testid="task-input" />
}));
jest.mock('@/core/components/timer/timer', () => ({ Timer: () => <div data-testid="timer" /> }));

const REASON = 'timer.TRACKING_DISABLED_MESSAGE';

/** The signed-in member, with their own (employee) tracking switch, and whether their timer runs. */
function storeWith({ employeeTracking, running = false }: { employeeTracking: boolean; running?: boolean }) {
	const store = createStore();
	const member = {
		id: 'member-a',
		isTrackingEnabled: true,
		employee: { userId: 'user-a', isTrackingEnabled: employeeTracking }
	};
	store.set(organizationTeamsState, [{ id: 'team-a', name: 'Team A', members: [member] }] as never);
	store.set(activeTeamIdState, 'team-a');
	store.set(userState, { id: 'user-a' } as never);
	store.set(timerStatusState, { running } as never);
	return store;
}

async function renderBlock(store: ReturnType<typeof createStore>) {
	render(
		<Provider store={store}>
			<TaskTimerSection isTrackingEnabled={store.get(isTrackingEnabledState)} />
		</Provider>
	);
	await screen.findByTestId('task-input');
}

describe('the home task block, where the timer stands', () => {
	it('gives a member who can track the timer, and no reason', async () => {
		await renderBlock(storeWith({ employeeTracking: true }));

		expect(await screen.findByTestId('timer')).toBeTruthy();
		expect(screen.queryByText(REASON)).toBeNull();
	});

	it('gives a member whose tracking is off the reason instead of the timer', async () => {
		await renderBlock(storeWith({ employeeTracking: false }));

		expect(screen.getByText(REASON)).toBeTruthy();
		expect(screen.queryByTestId('timer')).toBeNull();
	});

	it('keeps a running timer for that member, so it can be stopped, and gives no reason', async () => {
		await renderBlock(storeWith({ employeeTracking: false, running: true }));

		expect(await screen.findByTestId('timer')).toBeTruthy();
		expect(screen.queryByText(REASON)).toBeNull();
	});
});
