// Kept apart from switch.tsx so a form can draw a switch without loading the team hooks that file imports.
export const SWITCH_TRACK_RECIPE =
	'group relative inline-flex h-6 w-10.5 shrink-0 cursor-pointer items-center rounded-full hairline-border border-transparent bg-foreground/10 p-0.5 shadow-sm shadow-black/10 hairline-ring ring-foreground/10 outline-none transition-[color,box-shadow,background-color] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-checked:bg-primary dark:ring-foreground/15';

export const SWITCH_THUMB_RECIPE =
	'pointer-events-none block size-4.5 rounded-full bg-white shadow-sm shadow-black/15 transition-transform duration-200 group-data-checked:translate-x-4.5';
