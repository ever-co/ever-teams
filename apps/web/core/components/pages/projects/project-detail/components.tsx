'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Archive } from '@/core/components/icons';
import { badgeVariants } from '@/core/components/common/badge';
import { cn } from '@/core/lib/helpers';

/**
 * A section of the project detail: a small heading, then its content. No card of its own.
 */
export function Section({
	title,
	icon,
	children
}: Readonly<{
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}>) {
	return (
		<section className="flex flex-col gap-3">
			<h3 className="flex items-center gap-2 text-sm font-semibold text-foreground [&_svg]:size-4 [&_svg]:text-muted-foreground">
				{icon}
				{title}
			</h3>
			{children}
		</section>
	);
}

/**
 * One fact row of the aside: a muted label and its value, split from its neighbours by the parent's hairlines.
 */
export function InfoItem({
	label,
	value
}: Readonly<{
	label: string;
	value: React.ReactNode;
}>) {
	return (
		<div className="flex items-start justify-between gap-4 py-2.5">
			<span className="shrink-0 text-xs text-muted-foreground">{label}</span>
			<span className="min-w-0 text-right text-sm font-medium tabular-nums text-foreground">{value}</span>
		</div>
	);
}

/**
 * Status badge component
 */
export function StatusBadge({ isArchived, isActive }: Readonly<{ isArchived?: boolean; isActive?: boolean }>) {
	const t = useTranslations();

	if (isArchived) {
		return (
			<span className={badgeVariants({ variant: 'secondary' })}>
				<Archive />
				{t('timer.ARCHIVED')}
			</span>
		);
	}

	if (isActive) {
		return (
			<span className={badgeVariants({ variant: 'success' })}>
				<span className="size-1.5 rounded-full bg-success" />
				{t('timer.ACTIVE')}
			</span>
		);
	}

	return <span className={badgeVariants({ variant: 'warning' })}>{t('timer.INACTIVE')}</span>;
}

/**
 * One member row of the project: avatar, name, e-mail and the manager chip when it applies.
 */
export function MemberCard({
	member,
	isManager = false
}: Readonly<{
	member: {
		id?: string;
		employee?: {
			fullName?: string;
			user?: { imageUrl?: string; email?: string };
		};
	};
	isManager?: boolean;
}>) {
	const t = useTranslations();
	const name = member.employee?.fullName || t('common.UNKNOWN');
	const imageUrl = member.employee?.user?.imageUrl;
	const email = member.employee?.user?.email;

	return (
		<div className="flex min-h-14 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/[0.025]">
			<div
				className={cn(
					'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-medium hairline-ring ring-border',
					!imageUrl && 'bg-primary/10 text-primary-ink'
				)}
			>
				{imageUrl && (
					<Image src={imageUrl} alt={name} width={40} height={40} className="object-cover w-full h-full" />
				)}
				{!imageUrl && name.substring(0, 2).toUpperCase()}
			</div>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-sm font-medium text-foreground">{name}</span>
				{email && <span className="truncate text-xs text-muted-foreground">{email}</span>}
			</div>
			{isManager && (
				<span className={cn(badgeVariants({ variant: 'default' }), 'shrink-0')}>{t('common.MANAGER')}</span>
			)}
		</div>
	);
}
