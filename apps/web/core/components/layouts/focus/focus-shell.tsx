'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import { EverTeamsLogo } from '@/core/components/svgs';
import { ThemeSwitch } from '@/core/components/common/theme-switch';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';
import { cn } from '@/core/lib/helpers';

/** The language trigger as the top bar's other controls: an outline pill of the control height. */
const LANGUAGE_PILL =
	'h-8 w-auto gap-1.5 rounded-full border-none bg-card px-3 text-[13px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.06)] hairline-ring ring-foreground/10 hover:bg-muted/50 dark:bg-foreground/5';

/**
 * The frame of a page the user goes through on their own, outside the workspace: joining a team, an email being
 * verified, maintenance, a refused access. No sidebar and no data of the app (the user may not belong to a team
 * yet, or the API may be down): the window background, the logo, language and theme, and one card in the middle.
 */
export function FocusShell({ children }: PropsWithChildren) {
	return (
		<div className="flex min-h-dvh flex-col bg-sidebar text-foreground selection:bg-foreground/10">
			<header className="flex h-14 shrink-0 items-center justify-between px-5">
				<EverTeamsLogo dash className="h-5" />
				<div className="flex items-center gap-2">
					<LanguageDropDownWithFlags deferLoading showFlag={false} btnClassName={LANGUAGE_PILL} />
					<ThemeSwitch />
				</div>
			</header>
			<main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-16 pt-4">{children}</main>
		</div>
	);
}

/**
 * The one card of a focused page: a mark (an icon tile or a status orb), the title, one sentence, the content, the
 * actions at its foot. Content that names the people or the workspace involved sits in a tinted inner panel.
 */
export function FocusCard({
	mark,
	title,
	description,
	children,
	footer,
	className
}: Readonly<{
	mark?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	footer?: ReactNode;
	className?: string;
}>) {
	return (
		<section
			className={cn(
				'w-full max-w-md rounded-2xl bg-card p-6 text-card-foreground hairline-ring ring-border shadow-md shadow-black/6.5 sm:p-7',
				className
			)}
		>
			{mark && <div className="mb-5 flex">{mark}</div>}
			<h1 className="text-xl font-semibold text-balance text-foreground">{title}</h1>
			{description && <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</p>}
			{children && <div className="mt-6 flex flex-col gap-5">{children}</div>}
			{footer && <div className="mt-6 flex flex-wrap items-center justify-between gap-3">{footer}</div>}
		</section>
	);
}

/** An icon on a key-cap tile, the mark of a focused page that is an action rather than a status. */
export function FocusIconTile({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<span className="keycap-3d flex size-11 items-center justify-center rounded-xl text-foreground [&_svg]:size-5">
			{children}
		</span>
	);
}

/** The tinted inner panel of a focused card: the account, the workspace or the team the action is about. */
export function FocusPanel({
	children,
	className,
	isDecorative = false
}: Readonly<{ children: ReactNode; className?: string; isDecorative?: boolean }>) {
	return (
		<div
			aria-hidden={isDecorative || undefined}
			className={cn('rounded-xl bg-foreground/[0.025] px-3.5 py-3 hairline-ring ring-border', className)}
		>
			{children}
		</div>
	);
}
