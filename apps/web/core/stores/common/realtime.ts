import { atom } from 'jotai';
import type { RealtimeStatus } from '@/core/lib/realtime/client';

/**
 * Where the tab's live connection stands (`off` when the feature is off or nobody is signed in). The
 * reconnecting indicator reads it; the polling hooks pause their intervals while it is `connected`.
 */
export const realtimeStatusAtom = atom<RealtimeStatus>('off');
