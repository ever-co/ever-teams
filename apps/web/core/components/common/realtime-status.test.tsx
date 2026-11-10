/** @jest-environment jsdom */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import type { RealtimeStatus as RealtimeConnectionStatus } from '@/core/lib/realtime/client';
import { realtimeStatusAtom } from '@/core/stores/common/realtime';
import { REALTIME_NOTE_HIDE_AFTER_MS, REALTIME_NOTE_SHOW_AFTER_MS, REALTIME_STABLE_AFTER_MS, RealtimeStatus } from './realtime-status';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));

function mount() {
	const store = createStore();
	render(
		<Provider store={store}>
			<RealtimeStatus />
		</Provider>
	);
	const set = (status: RealtimeConnectionStatus) => act(() => store.set(realtimeStatusAtom, status));
	const wait = (ms: number) =>
		act(() => {
			jest.advanceTimersByTime(ms);
		});
	const note = () => screen.queryByRole('status');
	return { set, wait, note };
}

/**
 * The note used to show for every `reconnecting` status. A platform that acknowledges the connection and ends it
 * right away sends the client round that loop for good, so the note never left the screen although no live
 * connection had ever existed.
 */
describe('RealtimeStatus', () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it('says nothing while a connection is acknowledged and ended over and over', () => {
		const { set, wait, note } = mount();
		for (let attempt = 0; attempt < 5; attempt += 1) {
			set(attempt === 0 ? 'connecting' : 'reconnecting');
			wait(REALTIME_NOTE_SHOW_AFTER_MS + 5_000);
			set('connected');
			wait(200);
		}
		set('reconnecting');
		wait(60_000);
		expect(note()).toBeNull();
	});

	it('says nothing when the first connection never comes up', () => {
		const { set, wait, note } = mount();
		set('connecting');
		set('reconnecting');
		wait(60_000);
		expect(note()).toBeNull();
	});

	it('announces a drop of an established connection, after a moment, and leaves once it is back', () => {
		const { set, wait, note } = mount();
		set('connecting');
		set('connected');
		wait(REALTIME_STABLE_AFTER_MS);

		set('reconnecting');
		wait(REALTIME_NOTE_SHOW_AFTER_MS - 1);
		expect(note()).toBeNull();
		wait(1);
		expect(note()?.textContent).toContain('realtime.RECONNECTING');

		set('connected');
		wait(REALTIME_NOTE_HIDE_AFTER_MS - 1);
		expect(note()).not.toBeNull();
		wait(1);
		expect(note()).toBeNull();
	});

	it('shows nothing for a drop that reconnects at once', () => {
		const { set, wait, note } = mount();
		set('connected');
		wait(REALTIME_STABLE_AFTER_MS);
		set('reconnecting');
		wait(REALTIME_NOTE_SHOW_AFTER_MS - 500);
		set('connected');
		wait(60_000);
		expect(note()).toBeNull();
	});

	it('keeps the note through a connection that comes back and drops again at once', () => {
		const { set, wait, note } = mount();
		set('connected');
		wait(REALTIME_STABLE_AFTER_MS);
		set('reconnecting');
		wait(REALTIME_NOTE_SHOW_AFTER_MS);
		set('connected');
		wait(200);
		set('reconnecting');
		expect(note()).not.toBeNull();
	});

	it('hides the note when the client stops or is switched off', () => {
		const { set, wait, note } = mount();
		set('connected');
		wait(REALTIME_STABLE_AFTER_MS);
		set('reconnecting');
		wait(REALTIME_NOTE_SHOW_AFTER_MS);
		expect(note()).not.toBeNull();
		set('stopped');
		expect(note()).toBeNull();
		set('off');
		expect(note()).toBeNull();
	});
});
