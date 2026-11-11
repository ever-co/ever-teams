import { atom } from 'jotai';
import type { RealtimeStatus } from '@/core/lib/realtime/client';

/**
 * Where the tab's live connection stands (`off` when the feature is off or nobody is signed in). The
 * reconnecting indicator reads it.
 */
export const realtimeStatusAtom = atom<RealtimeStatus>('off');

/**
 * Whether the platform says it pushes an event to every open subscription as soon as it is written
 * (`GET /realtime/status` → `delivery.prompt`), read by the live connection each time it comes up.
 *
 * An open socket alone says nothing about how soon a message arrives over it: a platform that hands events to
 * subscribers in a once-a-minute pass, or only in the process that ran the pass, showed a colleague's message up to a
 * minute late to a tab that had stopped polling (measured: 37 s against 5 s with the poll). So `false` until the
 * platform says otherwise, and on any platform older than that answer.
 */
export const realtimePromptDeliveryAtom = atom<boolean>(false);

/**
 * Whether the polls of chat and of the notification count pause now: the live connection is up and the platform
 * delivers promptly enough to replace them. The stream refreshes what it announces either way, and the connection
 * catches up from the platform every minute, which bounds what a lost push can cost.
 */
export const realtimePausesPollingAtom = atom((get) => get(realtimeStatusAtom) === 'connected' && get(realtimePromptDeliveryAtom));
