'use client';

import type { ReactNode } from 'react';
import { Mail } from '@/core/components/icons';
import { ToastOrb, type OrbTone } from '@/core/components/common/toast-orb';
import { cn } from '@/core/lib/helpers';

/** A warning here is a dead end (an expired or unknown link): it is announced as urgently as an error. */
function statusRoleOf(tone: OrbTone) {
	const isProblem = tone === 'error' || tone === 'warning';
	if (isProblem) {
		return 'alert';
	}
	return 'status';
}

function liveModeOf(role: 'alert' | 'status') {
	if (role === 'alert') {
		return 'assertive';
	}
	return 'polite';
}

export function AuthState({
	tone,
	glyph,
	title,
	description,
	children,
	actions,
	className
}: Readonly<{
	tone: OrbTone;
	glyph?: ReactNode;
	title: ReactNode;
	description?: ReactNode;
	children?: ReactNode;
	actions?: ReactNode;
	className?: string;
}>) {
	const role = statusRoleOf(tone);
	const liveMode = liveModeOf(role);
	const isBusy = tone === 'loading';

	return (
		<section
			role={role}
			aria-live={liveMode}
			aria-busy={isBusy || undefined}
			className={cn('flex flex-col', className)}
		>
			<ToastOrb tone={tone} glyph={glyph} className="mb-6" />
			<h1 className="text-xl font-semibold text-balance text-foreground">{title}</h1>
			{description && <p className="mt-1.5 text-sm text-pretty text-muted-foreground">{description}</p>}
			{children && <div className="mt-5 flex flex-col gap-3">{children}</div>}
			{actions && <div className="mt-7 flex flex-col gap-3">{actions}</div>}
		</section>
	);
}

/** The address a message went to, written in full so a typo can be seen. */
export function AuthAddress({ email, className }: Readonly<{ email: string; className?: string }>) {
	return (
		<span
			className={cn(
				'inline-flex max-w-full items-center gap-2 self-start rounded-lg bg-foreground/[0.04] px-2.5 py-1.5 text-[13px] font-medium text-foreground',
				className
			)}
		>
			<Mail aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
			<span className="min-w-0 break-all">{email}</span>
		</span>
	);
}
