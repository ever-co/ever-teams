'use client';

import type { CSSProperties } from 'react';
import { Toaster } from 'sonner';
import { X } from '@/core/components/icons';
import { ToastOrb } from './toast-orb';

const TOAST_WIDTH = '22rem';

/**
 * Sonner keeps the stacking, swiping and timing; every visible part is ours (`unstyled`). Each type sets
 * `--toast-tone`: a wash of the tone from the top-left corner, a light rising from the bottom with a one-pixel edge
 * light, an outline and a shadow tinted with the tone, a white inner rim in light mode, and a dark blurred glass with
 * a tone line on its top edge in dark mode. Sonner keeps the toast's own `::before` and `::after` for its hover gaps,
 * so the edge light is a pseudo-element of the content block, positioned against the toast.
 */
const TOAST_SURFACE_LIGHT =
	'bg-popover bg-[radial-gradient(130%_170%_at_0%_0%,color-mix(in_oklab,var(--toast-tone)_14%,transparent),transparent_52%),radial-gradient(85%_75%_at_50%_140%,color-mix(in_oklab,var(--toast-tone)_16%,transparent),transparent_72%)] shadow-[0_0_0_var(--hairline)_color-mix(in_oklab,var(--toast-tone)_24%,hsl(var(--border))),inset_0_0_0_1px_rgb(255_255_255/0.75),0_12px_30px_-14px_color-mix(in_oklab,var(--toast-tone)_45%,transparent),0_4px_12px_-4px_rgb(0_0_0/0.08)]';

const TOAST_SURFACE_DARK =
	'dark:bg-popover/80 dark:backdrop-blur-xl dark:shadow-[0_0_0_var(--hairline)_rgb(255_255_255/0.1),inset_0_1px_0_color-mix(in_oklab,var(--toast-tone)_55%,transparent),0_14px_34px_-12px_rgb(0_0_0/0.65)]';

const EDGE_LIGHT_LAYER =
	"after:pointer-events-none after:absolute after:inset-x-6 after:bottom-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-(--toast-tone) after:to-transparent after:opacity-60 after:content-['']";

const LOADING_TITLE_SHIMMER =
	"[&_[data-title]]:after:absolute [&_[data-title]]:after:inset-0 [&_[data-title]]:after:animate-[shimmer_1.8s_ease-in-out_infinite] [&_[data-title]]:after:bg-linear-to-r [&_[data-title]]:after:from-transparent [&_[data-title]]:after:via-popover/80 [&_[data-title]]:after:to-transparent [&_[data-title]]:after:content-['']";

const TOAST_CLASSNAMES = {
	toast: `group/toast isolate flex w-(--width) items-center gap-3.5 rounded-2xl py-3.5 pl-3.5 pr-10 text-popover-foreground outline-none [--toast-tone:hsl(var(--muted-foreground))] focus-visible:ring-[3px] focus-visible:ring-ring/25 [&[data-expanded=false][data-front=false]>*]:opacity-0 ${TOAST_SURFACE_LIGHT} ${TOAST_SURFACE_DARK}`,
	success: '[--toast-tone:hsl(var(--success))]',
	error: '[--toast-tone:hsl(var(--destructive))]',
	warning: '[--toast-tone:hsl(var(--warning))]',
	info: '[--toast-tone:hsl(var(--info))]',
	loading: `[--toast-tone:hsl(var(--primary))] ${LOADING_TITLE_SHIMMER}`,
	icon: 'flex shrink-0 items-center',
	content: `flex min-w-0 flex-1 flex-col gap-0.5 ${EDGE_LIGHT_LAYER}`,
	title: 'relative w-fit max-w-full overflow-hidden text-[13px] font-medium leading-[18px] text-foreground text-pretty',
	description: 'text-xs leading-snug text-muted-foreground text-pretty',
	actionButton:
		'inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full bg-linear-to-b from-card to-foreground/[0.04] px-3 text-xs font-medium text-foreground shadow-[inset_0_0_0_var(--hairline)_color-mix(in_oklab,var(--toast-tone)_40%,hsl(var(--border))),inset_0_-1px_0_rgb(0_0_0/0.04),0_1px_2px_rgb(0_0_0/0.08)] outline-none transition-[filter] hover:brightness-[0.98] focus-visible:ring-[3px] focus-visible:ring-ring/25 dark:from-foreground/[0.12] dark:to-foreground/[0.06]',
	cancelButton:
		'inline-flex h-7 shrink-0 cursor-pointer items-center rounded-full px-2.5 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25',
	closeButton:
		'absolute right-2 top-2 inline-flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground opacity-0 outline-none transition-[opacity,color,background-color] hover:bg-foreground/5 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 group-hover/toast:opacity-100 [@media(hover:none)]:opacity-100 [&_svg]:size-3.5'
};

const TOAST_ICONS = {
	success: <ToastOrb tone="success" />,
	error: <ToastOrb tone="error" />,
	warning: <ToastOrb tone="warning" />,
	info: <ToastOrb tone="info" />,
	loading: <ToastOrb tone="loading" />,
	close: <X />
};

const TOASTER_STYLE = { '--width': TOAST_WIDTH } as CSSProperties;

/** The one toaster of the app, mounted by the root layout. */
export function AppToaster() {
	return (
		<Toaster
			position="bottom-right"
			offset={16}
			mobileOffset={12}
			gap={10}
			visibleToasts={3}
			duration={5000}
			closeButton
			icons={TOAST_ICONS}
			style={TOASTER_STYLE}
			toastOptions={{ unstyled: true, classNames: TOAST_CLASSNAMES }}
		/>
	);
}
