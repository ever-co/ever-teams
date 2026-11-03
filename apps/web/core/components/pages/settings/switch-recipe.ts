/**
 * The switch recipe of `common/switch.tsx`, keyed on `aria-checked` so the same classes style a Headless UI
 * `Switch` and a native `role="switch"` button.
 */
export const SWITCH_TRACK_CLASS =
	'group relative inline-flex h-6 w-10.5 shrink-0 cursor-pointer items-center rounded-full hairline-border border-transparent bg-foreground/10 p-0.5 shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50 dark:ring-foreground/15';

export const SWITCH_THUMB_CLASS =
	'pointer-events-none block size-4.5 rounded-full bg-white shadow-sm shadow-black/15 transition-transform duration-200 group-aria-checked:translate-x-4.5';
