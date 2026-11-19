import React from 'react';
import { renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import { sessionAtom } from './session';
import type { Session } from './session';
import { useSessionFromStore } from './session-from-store';

type Props = { restored: boolean; stored: Partial<Session> };

const KOFI: Partial<Session> = {
	accessToken: 'kofi-token',
	refreshToken: 'kofi-refresh',
	tenantId: 'tenant-a',
	organizationId: 'org-a'
};

async function followTheStore(initialProps: Props) {
	const store = createStore();
	const wrapper = ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>;
	const hook = await renderHook(({ restored, stored }: Props) => useSessionFromStore(restored, stored), {
		initialProps,
		wrapper
	});
	return { store, hook };
}

describe("the new Home's session", () => {
	it('stays loading until the current app restored its store', async () => {
		const { store } = await followTheStore({ restored: false, stored: KOFI });

		expect(store.get(sessionAtom)).toEqual({ status: 'loading' });
	});

	it('is the signed-in person of the restored store', async () => {
		const { store } = await followTheStore({ restored: true, stored: KOFI });

		expect(store.get(sessionAtom)).toEqual({
			status: 'signed-in',
			session: {
				accessToken: 'kofi-token',
				refreshToken: 'kofi-refresh',
				tenantId: 'tenant-a',
				organizationId: 'org-a'
			}
		});
	});

	it('follows a sign-in made after the app started', async () => {
		const { store, hook } = await followTheStore({ restored: true, stored: { accessToken: '' } });
		expect(store.get(sessionAtom)).toEqual({ status: 'signed-out' });

		await hook.rerender({ restored: true, stored: KOFI });

		expect(store.get(sessionAtom)).toMatchObject({ status: 'signed-in', session: { accessToken: 'kofi-token' } });
	});

	it('follows a renewal, a sign-out and the next person', async () => {
		const { store, hook } = await followTheStore({ restored: true, stored: KOFI });

		await hook.rerender({ restored: true, stored: { ...KOFI, accessToken: 'kofi-renewed' } });
		expect(store.get(sessionAtom)).toMatchObject({ session: { accessToken: 'kofi-renewed' } });

		await hook.rerender({
			restored: true,
			stored: { accessToken: '', refreshToken: '', tenantId: '', organizationId: '' }
		});
		expect(store.get(sessionAtom)).toEqual({ status: 'signed-out' });

		await hook.rerender({ restored: true, stored: { accessToken: 'priya-token', tenantId: 'tenant-a' } });
		expect(store.get(sessionAtom)).toEqual({
			status: 'signed-in',
			session: {
				accessToken: 'priya-token',
				refreshToken: undefined,
				tenantId: 'tenant-a',
				organizationId: undefined
			}
		});
	});
});
