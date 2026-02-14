/**
 * Timer hooks — Separated by concern
 *
 * @module timer
 *
 * Layer 1: useTimerApi      — "The Brain"  — Server state, mutations, business logic
 * Layer 2: useTimerStorage  — "The Memory" — localStorage persistence, cross-tab sync
 * Layer 3: useTimerUi       — "The Face"   — High-frequency ticking, animation, display
 *
 * Standalone:
 * - useLiveTimerStatus — Lightweight hook for live timer display (reads atoms only)
 */
export { useTimerApi } from './use-timer-api';
export { useTimerStorage } from './use-timer-storage';
export { useTimerUi, useLiveTimerStatus } from './use-timer-ui';
export { useTimerPlanStatus } from './use-timer-plan-status';
export { useTimerActions } from './use-timer-actions';

// Re-export types for convenience
export type { UseTimerApiParams, UseTimerApiReturn } from './use-timer-api';
export type { UseTimerStorageParams, UseTimerStorageReturn } from './use-timer-storage';
export type { UseTimerUiParams, UseTimerUiReturn } from './use-timer-ui';
export type { UseTimerPlanStatusReturn } from './use-timer-plan-status';
export type { UseTimerActionsReturn } from './use-timer-actions';

