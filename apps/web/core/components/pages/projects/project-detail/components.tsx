'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Archive } from 'lucide-react';
import { cn } from '@/core/lib/helpers';

/**
 * Section wrapper component for project detail page
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
		<div className="flex flex-col gap-3 p-4 bg-white dark:bg-dark--theme-light rounded-xl border dark:border-gray-800">
			<h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
				{icon}
				{title}
			</h3>
			{children}
		</div>
	);
}

/**
 * Info item component for displaying label-value pairs
 */
export function InfoItem({
	label,
	value
}: Readonly<{
	label: string;
	value: React.ReactNode;
}>) {
	return (
		<div className="flex flex-col gap-1 min-w-24">
			<span className="text-xs text-gray-500">{label}</span>
			<span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
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
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
				<Archive size={10} />
				{t('timer.ARCHIVED')}
			</span>
		);
	}

	if (isActive) {
		return (
			<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
				<span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
				{t('timer.ACTIVE')}
			</span>
		);
	}

	return (
		<span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
			{t('timer.INACTIVE')}
		</span>
	);
}

/**
 * Member card component for displaying team member info
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
		<div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50 dark:border-gray-700 hover:border-primary/50 transition-colors">
			<div
				className={cn(
					'w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-sm font-medium shrink-0',
					!imageUrl && 'bg-primary/10 text-primary'
				)}
			>
				{imageUrl ? (
					<Image src={imageUrl} alt={name} width={40} height={40} className="object-cover w-full h-full" />
				) : (
					name.substring(0, 2).toUpperCase()
				)}
			</div>
			<div className="flex flex-col min-w-0 flex-1">
				<span className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{name}</span>
				{email && <span className="text-xs text-gray-500 truncate">{email}</span>}
			</div>
			{isManager && (
				<span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
					{t('common.MANAGER')}
				</span>
			)}
		</div>
	);
}

