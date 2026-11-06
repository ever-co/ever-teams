import { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@/core/lib/helpers';

export const SETTINGS_COLUMN = 'mx-auto flex w-full max-w-[42rem] flex-col gap-8 px-1 pt-4 pb-12 sm:pt-8';

export const SETTINGS_SURFACE =
	'flex flex-col overflow-clip rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5 hairline-divide-y divide-border';

export const SETTINGS_ROW = 'flex min-h-14 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6';

export const SETTINGS_ROW_LABEL = 'text-[13px] font-medium text-foreground';

export const SETTINGS_ROW_DESCRIPTION = 'text-xs text-pretty text-muted-foreground';

export const SETTINGS_SKELETON_BAR = 'animate-pulse rounded-full bg-foreground/[0.07]';

type SettingsPageProps = PropsWithChildren<{
	title: string;
	description?: string;
	actions?: ReactNode;
	className?: string;
}>;

export function SettingsPage({ title, description, actions, className, children }: Readonly<SettingsPageProps>) {
	return (
		<div className={cn(SETTINGS_COLUMN, className)}>
			<header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold text-balance text-foreground">{title}</h1>
					{description && <p className="mt-1 text-[13px] text-pretty text-muted-foreground">{description}</p>}
				</div>
				{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
			</header>
			{children}
		</div>
	);
}

function headingIdOf(id: string | undefined) {
	if (!id) {
		return undefined;
	}
	return `${id}-heading`;
}

type SettingsSectionProps = PropsWithChildren<{
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	id?: string;
	tone?: 'default' | 'danger';
	className?: string;
}>;

export function SettingsSection({
	title,
	description,
	actions,
	id,
	tone = 'default',
	className,
	children
}: Readonly<SettingsSectionProps>) {
	const isDanger = tone === 'danger';
	const headingId = headingIdOf(id);

	return (
		<section id={id} aria-labelledby={headingId} className={cn('flex scroll-mt-6 flex-col gap-3', className)}>
			<div className="flex items-end justify-between gap-4">
				<div className="min-w-0">
					<h2
						id={headingId}
						className={cn(
							'text-[15px] font-semibold text-balance text-foreground',
							isDanger && 'text-destructive-ink'
						)}
					>
						{title}
					</h2>
					{description && (
						<p className="mt-0.5 text-[13px] text-pretty text-muted-foreground">{description}</p>
					)}
				</div>
				{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
			</div>
			{children}
		</section>
	);
}

export function SettingsSurface({ className, children }: Readonly<PropsWithChildren<{ className?: string }>>) {
	return <div className={cn(SETTINGS_SURFACE, className)}>{children}</div>;
}

type SettingsRowProps = PropsWithChildren<{
	label: ReactNode;
	description?: ReactNode;
	leading?: ReactNode;
	htmlFor?: string;
	className?: string;
	controlClassName?: string;
}>;

export function SettingsRow({
	label,
	description,
	leading,
	htmlFor,
	className,
	controlClassName,
	children
}: Readonly<SettingsRowProps>) {
	const labelNode = htmlFor ? (
		<label htmlFor={htmlFor} className={SETTINGS_ROW_LABEL}>
			{label}
		</label>
	) : (
		<span className={SETTINGS_ROW_LABEL}>{label}</span>
	);

	return (
		<div className={cn(SETTINGS_ROW, className)}>
			<div className="flex min-w-0 flex-1 items-start gap-3">
				{leading && <span className="mt-0.5 flex shrink-0 text-muted-foreground">{leading}</span>}
				<div className="flex min-w-0 flex-col gap-0.5">
					{labelNode}
					{description && <span className={SETTINGS_ROW_DESCRIPTION}>{description}</span>}
				</div>
			</div>
			{children && (
				<div className={cn('flex min-w-0 shrink-0 items-center gap-2 sm:justify-end', controlClassName)}>
					{children}
				</div>
			)}
		</div>
	);
}

export function SettingsReadOnlyNote({ children }: Readonly<PropsWithChildren>) {
	return <p className="px-1 text-xs text-muted-foreground">{children}</p>;
}

type SettingsRowSkeletonProps = {
	labelWidth?: string;
	withDescription?: boolean;
	control?: 'switch' | 'button' | 'select' | 'text' | 'none';
	leading?: boolean;
};

function controlSkeletonOf(control: SettingsRowSkeletonProps['control']) {
	if (control === 'switch') {
		return <span className="h-6 w-10.5 rounded-full bg-foreground/[0.07]" />;
	}
	if (control === 'button') {
		return <span className="h-8 w-20 rounded-full hairline-ring ring-border" />;
	}
	if (control === 'select') {
		return <span className="h-8 w-48 rounded-md hairline-ring ring-border" />;
	}
	if (control === 'text') {
		return <span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5 w-24')} />;
	}
	return null;
}

export function SettingsRowSkeleton({
	labelWidth = 'w-28',
	withDescription = true,
	control = 'switch',
	leading = false
}: Readonly<SettingsRowSkeletonProps>) {
	return (
		<div className={SETTINGS_ROW} aria-hidden="true">
			<div className="flex min-w-0 flex-1 items-start gap-3">
				{leading && <span className="size-4 shrink-0 rounded-[4px] bg-foreground/[0.07]" />}
				<div className="flex min-w-0 flex-1 flex-col gap-2 py-0.5">
					<span className={cn(SETTINGS_SKELETON_BAR, 'h-2.5', labelWidth)} />
					{withDescription && <span className={cn(SETTINGS_SKELETON_BAR, 'h-2 w-3/5')} />}
				</div>
			</div>
			{controlSkeletonOf(control)}
		</div>
	);
}

type SettingsSectionSkeletonProps = {
	title?: string;
	rows?: number;
	control?: NonNullable<SettingsRowSkeletonProps['control']>;
	leading?: boolean;
};

export function SettingsSectionSkeleton({
	title,
	rows = 3,
	control = 'switch',
	leading = false
}: Readonly<SettingsSectionSkeletonProps>) {
	const rowKeys = Array.from({ length: rows }, (_, index) => index);
	const labelWidths = ['w-28', 'w-36', 'w-24', 'w-32'];

	return (
		<section className="flex flex-col gap-3" aria-busy="true">
			{title && <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>}
			{!title && <span aria-hidden="true" className={cn(SETTINGS_SKELETON_BAR, 'my-1.5 h-3 w-32')} />}
			<div className={SETTINGS_SURFACE}>
				{rowKeys.map((key) => (
					<SettingsRowSkeleton
						key={key}
						labelWidth={labelWidths[key % labelWidths.length]}
						control={control}
						leading={leading}
					/>
				))}
			</div>
		</section>
	);
}

export function SettingsPageSkeleton({
	title,
	description,
	children
}: Readonly<PropsWithChildren<{ title: string; description?: string }>>) {
	return (
		<SettingsPage title={title} description={description}>
			{children}
		</SettingsPage>
	);
}
