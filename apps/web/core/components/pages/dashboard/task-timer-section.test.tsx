/** @jest-environment jsdom */

import type { ComponentType } from 'react';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { isTrackingEnabledState } from '@/core/stores/timer/active-timer';
import { storeWithSignedInMember as storeWith } from '@/test/tracking/signed-in-member';
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
jest.mock('@/core/components/timer/timer-run-menu', () => ({
	TimerRunMenu: ({ className }: { className?: string }) => <span data-testid="run-menu" className={className} />
}));

const REASON = 'timer.TRACKING_DISABLED_MESSAGE';

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

	it("gives a phone the timer's run menu at the end of the row under the timer, its own row having no room", async () => {
		await renderBlock(storeWith({ employeeTracking: true, running: true }));

		const runMenu = await screen.findByTestId('run-menu');
		const inputToggle = screen.getByRole('button', { expanded: false });

		expect(runMenu.parentElement).toBe(inputToggle.parentElement);
		expect(runMenu.classList).toContain('sm:hidden');
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
