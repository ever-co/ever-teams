import { atom } from 'jotai';
import type { RealtimeStatus } from '@/core/lib/realtime/client';

/**
 * Where the tab's live connection stands (`off` when the feature is off or nobody is signed in). The
 * reconnecting indicator reads it.
 */
export const realtimeStatusAtom = atom<RealtimeStatus>('off');

/**
 * Whether an open live connection stands in for the polls of chat and of the notification count.
 *
 * Not yet. The platform hands its events to subscribers in a pass that runs once a minute, on a deployment with a
 * queue; without one it stores them and pushes nothing, and with several API processes a subscriber only hears the
 * process that ran the pass. An open socket therefore says nothing about how soon a message arrives over it: a tab
 * that stopped polling because it is connected showed a colleague's message up to a minute late (measured: 37 s
 * against 5 s with the poll). The stream still refreshes what it announces the moment it does; the polls keep their
 * own cadence beside it, as they did before there was a stream.
 *
 * Set this to true once the platform publishes an event when it is written, to every process.
 */
export const REALTIME_REPLACES_POLLING = false;

/** Whether the polls pause now: the live connection is up and it delivers promptly enough to replace them. */
export const realtimePausesPollingAtom = atom((get) => REALTIME_REPLACES_POLLING && get(realtimeStatusAtom) === 'connected');
