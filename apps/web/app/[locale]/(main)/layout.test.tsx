/** @jest-environment jsdom */
/**
 * #5118: while offline, OfflineWrapper shows the offline page in place of its children. The timer's owner (AppState)
 * was one of them: unmounted, its heartbeat stopped, and mounted again on reconnect it ran the closed-tab check again,
 * which found the run it had kept alive stale and stopped it. The layout keeps it mounted through the outage.
 */
import type { ComponentType, ReactNode } from 'react';
import { act, render, screen } from '@testing-library/react';
import MainGroupLayout from './layout';

/** How many times the timer's owner mounted and unmounted. */
const mockOwnerLife = { mounts: 0, unmounts: 0 };

type Loaded = ComponentType<object> | { default: ComponentType<object> };

// The wrapper's lazy part renders once loaded, as `next/dynamic` renders it in the browser
jest.mock('next/dynamic', () => {
	const { createElement, lazy, Suspense } = jest.requireActual<typeof import('react')>('react');
	return {
		__esModule: true,
		default: (loader: () => Promise<Loaded>) => {
			const Lazy = lazy(async () => {
				const loaded = await loader();
				return { default: 'default' in loaded ? loaded.default : loaded };
			});
			return function DynamicPart(props: object) {
				return createElement(Suspense, { fallback: null }, createElement(Lazy, props));
			};
		}
	};
});
// The package ships ES modules only, which Jest does not load: the same reading of the browser's connection
jest.mock('@uidotdev/usehooks', () => {
	const { useSyncExternalStore } = jest.requireActual<typeof import('react')>('react');
	const subscribe = (onChange: () => void) => {
		window.addEventListener('online', onChange);
		window.addEventListener('offline', onChange);
		return () => {
			window.removeEventListener('online', onChange);
			window.removeEventListener('offline', onChange);
		};
	};
	return {
		useNetworkState: () => ({ online: useSyncExternalStore(subscribe, () => window.navigator.onLine) })
	};
});
jest.mock('@/core/components/layouts/app/init-state', () => {
	const { useEffect } = jest.requireActual<typeof import('react')>('react');
	return {
		AppState: function AppState() {
			useEffect(() => {
				mockOwnerLife.mounts += 1;
				return () => {
					mockOwnerLife.unmounts += 1;
				};
			}, []);
			return null;
		}
	};
});
jest.mock('@/core/components/layouts/default-layout/layout-shell', () => ({
	LayoutShell: ({ children }: { children: ReactNode }) => <main>{children}</main>
}));
jest.mock('@/core/hooks/users/use-employee-presence-heartbeat', () => ({
	useEmployeePresenceHeartbeat: () => undefined
}));
jest.mock('@/core/components/layouts/app/keyboard-shortcuts-mount', () => ({ KeyboardShortcutsMount: () => null }));
jest.mock('@/core/components/layouts/app/realtime-mount', () => ({ RealtimeMount: () => null }));
jest.mock('@/core/components/tasks/drawer/task-drawer-mount', () => ({ TaskDrawerMount: () => null }));
// The offline page, without the timer it shows
jest.mock('@/core/components/pages/offline', () => ({ __esModule: true, default: () => <p>offline page</p> }));

/** The browser's connection, as OfflineWrapper reads it: navigator.onLine and the online and offline events. */
function setOnline(online: boolean) {
	jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(online);
	act(() => {
		window.dispatchEvent(new Event(online ? 'online' : 'offline'));
	});
}

describe('the (main) layout through a network outage', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('shows the offline page and keeps the timer owner mounted, then shows the page again', async () => {
		render(
			<MainGroupLayout>
				<p>page</p>
			</MainGroupLayout>
		);
		expect(await screen.findByText('page')).toBeTruthy();

		setOnline(false);
		expect(await screen.findByText('offline page')).toBeTruthy();
		expect(screen.queryByText('page')).toBeNull();
		expect(mockOwnerLife).toEqual({ mounts: 1, unmounts: 0 });

		setOnline(true);
		expect(await screen.findByText('page')).toBeTruthy();
		expect(screen.queryByText('offline page')).toBeNull();
		expect(mockOwnerLife).toEqual({ mounts: 1, unmounts: 0 });
	});
});
