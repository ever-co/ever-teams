// Controls follow the Ever Teams design rules: the outline is a ring over a transparent border, focus widens it.
export const roundInput = `form-control
block
w-full
h-9
px-3
text-sm
text-zinc-900
bg-white
border border-transparent
rounded-md
shadow-sm
ring-1 ring-zinc-900/10
placeholder:text-zinc-400
focus:border-zinc-900/30 focus:ring-[3px] focus:ring-indigo-500/25 focus:outline-none
dark:bg-white/5 dark:text-zinc-100 dark:ring-white/15 dark:focus:border-white/25`;

export const underlineInput = `bg-transparent
border-0 border-grey-300 border-b-2
outline-none
focus:ring-0 p-0 pl-[0.2rem]`;

export const textEllipsis = `overflow-hidden whitespace-nowrap text-ellipsis`;

// The primary button of the web (its timer button's color), a ring a shade darker and a tinted shadow
export const primaryButton = `inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium
text-white bg-indigo-500 hover:bg-indigo-500/90 shadow-md shadow-black/15 ring-1 ring-indigo-600
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300
disabled:pointer-events-none disabled:opacity-50`;

export const ghostButton = `inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-zinc-600
hover:bg-zinc-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
dark:text-zinc-300 dark:hover:bg-white/10`;

// style.css gives every span 1rem: a span inside sized text (a button, a notice) takes that text's size instead
export const inheritTextSize = 'text-[length:inherit]';
