'use client';
import { FC } from 'react';
import { cn } from '@/core/lib/helpers';
import {
	SETTINGS_ROW_CLASS,
	SETTINGS_ROWS_CLASS,
	SETTINGS_SECTIONS_CLASS
} from '@/core/components/pages/settings/settings-section';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const PERSONAL_MENU_LINKS = 5;

const TEAM_MENU_LINKS = 3;

const DANGER_ROWS = 3;

interface SettingsPageSkeletonProps {
	className?: string;
	showTimer?: boolean;
}

function SettingsRowSkeleton() {
	return (
		<div className={SETTINGS_ROW_CLASS}>
			<div className={cn(BAR, 'h-4 w-28')} />
			<div className={cn(BAR, 'h-9 w-full max-w-md')} />
		</div>
	);
}

function SectionTitleSkeleton({ width }: Readonly<{ width: string }>) {
	return (
		<div className="flex h-6 items-center">
			<div className={cn(BAR, 'h-4', width)} />
		</div>
	);
}

function SettingsSectionSkeleton({ rows, titleWidth }: Readonly<{ rows: number; titleWidth: string }>) {
	const rowKeys = Array.from({ length: rows }, (_, index) => index);
	return (
		<section className="py-8">
			<SectionTitleSkeleton width={titleWidth} />
			<div className={cn('mt-5 min-w-0', SETTINGS_ROWS_CLASS)}>
				{rowKeys.map((key) => (
					<SettingsRowSkeleton key={key} />
				))}
			</div>
		</section>
	);
}

function DangerRowSkeleton() {
	return (
		<div className="flex flex-col gap-3 hairline-t border-border py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-col gap-2">
				<div className={cn(BAR, 'h-4 w-32')} />
				<div className={cn(BAR, 'h-3 w-64')} />
			</div>
			<div className={cn(BAR, 'h-8 w-24 shrink-0')} />
		</div>
	);
}

function DangerSectionSkeleton() {
	const rowKeys = Array.from({ length: DANGER_ROWS }, (_, index) => index);
	return (
		<section className="py-8">
			<SectionTitleSkeleton width="w-28" />
			<div className="mt-5 flex w-full flex-col">
				{rowKeys.map((key) => (
					<DangerRowSkeleton key={key} />
				))}
			</div>
		</section>
	);
}

function MenuGroupSkeleton({ links }: Readonly<{ links: number }>) {
	const linkKeys = Array.from({ length: links }, (_, index) => index);
	return (
		<section>
			<div className="flex h-8 items-center gap-2 px-3">
				<div className={cn(BAR, 'size-4 rounded-sm')} />
				<div className={cn(BAR, 'h-3 w-16')} />
			</div>
			<div className="mt-1 flex flex-col gap-0.5">
				{linkKeys.map((key) => (
					<div key={key} className="flex h-8 items-center px-3">
						<div className={cn(BAR, 'h-4 w-28')} />
					</div>
				))}
			</div>
		</section>
	);
}

/** The section nav of the settings pages: two groups of 32px rows. */
export const LeftSideSettingMenuSkeleton: FC = () => {
	return (
		<div className="flex w-full flex-col gap-4">
			<MenuGroupSkeleton links={PERSONAL_MENU_LINKS} />
			<MenuGroupSkeleton links={TEAM_MENU_LINKS} />
		</div>
	);
};

/** The content column of a settings page: the phone-only switch button, then flat sections split by hairlines. */
const SettingsContentSkeleton: FC<{ className?: string }> = ({ className }) => {
	return (
		<div className={cn('flex flex-col gap-6 pb-8', className)}>
			<div className={cn(BAR, 'h-9 w-full lg:hidden')} />
			<div className={SETTINGS_SECTIONS_CLASS}>
				<div>
					<SettingsSectionSkeleton titleWidth="w-32" rows={4} />
				</div>
				<div>
					<SettingsSectionSkeleton titleWidth="w-40" rows={2} />
				</div>
				<div>
					<SettingsSectionSkeleton titleWidth="w-36" rows={2} />
				</div>
				<div>
					<DangerSectionSkeleton />
				</div>
			</div>
		</div>
	);
};

const SettingsPageSkeleton: FC<SettingsPageSkeletonProps> = ({ className }) => {
	return <SettingsContentSkeleton className={className} />;
};

export const SettingsContentPageSkeleton: FC<SettingsPageSkeletonProps> = ({ className }) => {
	return <SettingsContentSkeleton className={className} />;
};

export default SettingsPageSkeleton;
