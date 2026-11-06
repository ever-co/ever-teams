import { PageLayout } from '@/core/components/layouts/default-layout';
import { SettingsFrame } from '@/core/components/pages/settings/settings-frame';
import {
	SETTINGS_ROW_CLASS,
	SETTINGS_ROWS_CLASS,
	SETTINGS_SECTIONS_CLASS
} from '@/core/components/pages/settings/settings-section';
import { WORKDAY_ROW_CLASS } from '@/core/components/pages/settings/personal/working-hours-utils';
import { cn } from '@/core/lib/helpers';
import { LeftSideSettingMenuSkeleton } from './settings-page-skeleton';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const SWITCH = 'h-6 w-10.5 rounded-full';

const WORK_DAYS = 7;

const DANGER_ROWS = 4;

function SectionTitleSkeleton({ width }: Readonly<{ width: string }>) {
	return (
		<div className="flex h-6 items-center">
			<div className={cn(BAR, 'h-4', width)} />
		</div>
	);
}

function LabelSkeleton({ width }: Readonly<{ width: string }>) {
	return <div className={cn(BAR, 'h-4', width)} />;
}

function PairOfInputsControlSkeleton() {
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-2">
			<div className={cn(BAR, 'h-9 min-w-40 flex-1')} />
			<div className={cn(BAR, 'h-9 min-w-40 flex-1')} />
			<div className={cn(BAR, 'h-9 w-20 shrink-0')} />
		</div>
	);
}

function ToggleControlSkeleton() {
	return (
		<div className="flex items-center gap-3">
			<div className={cn(BAR, SWITCH)} />
			<div className={cn(BAR, 'h-4 w-20')} />
		</div>
	);
}

export function ProfileAvatarSkeleton() {
	return (
		<div aria-hidden="true" className="flex w-full items-center gap-4 pb-4">
			<div className={cn(BAR, 'size-16 rounded-full')} />
			<div className="flex items-center gap-2">
				<div className={cn(BAR, 'h-8 w-32')} />
				<div className={cn(BAR, 'h-8 w-20')} />
			</div>
		</div>
	);
}

export function PersonalSettingFormRowsSkeleton() {
	return (
		<div aria-hidden="true" className={SETTINGS_ROWS_CLASS}>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-20" />
				<PairOfInputsControlSkeleton />
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-16" />
				<PairOfInputsControlSkeleton />
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-14" />
				<ToggleControlSkeleton />
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-20" />
				<div className={cn(BAR, 'h-9 w-full max-w-md')} />
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-20" />
				<div className="flex w-full max-w-xl items-center gap-2">
					<div className={cn(BAR, 'h-9 min-w-0 flex-1')} />
					<div className={cn(BAR, 'h-9 w-20 shrink-0')} />
				</div>
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-28" />
				<div className={cn(BAR, 'h-4 w-8')} />
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-24" />
				<div className={cn(BAR, 'h-4 w-12')} />
			</div>
		</div>
	);
}

function GeneralSectionSkeleton() {
	return (
		<section className="py-8">
			<SectionTitleSkeleton width="w-32" />
			<div className="mt-5 min-w-0">
				<ProfileAvatarSkeleton />
				<PersonalSettingFormRowsSkeleton />
			</div>
		</section>
	);
}

function WorkDayRowSkeleton() {
	return (
		<div className={WORKDAY_ROW_CLASS}>
			<div className="pt-1">
				<LabelSkeleton width="w-20" />
			</div>
			<div className="col-span-2 col-start-1 flex items-center gap-2 pb-2 sm:col-span-1 sm:col-start-2">
				<div className={cn(BAR, 'h-9 w-24')} />
				<div className={cn(BAR, 'h-px w-3')} />
				<div className={cn(BAR, 'h-9 w-24')} />
			</div>
			<div className="col-start-2 row-start-1 ml-auto sm:col-start-3">
				<div className={cn(BAR, SWITCH)} />
			</div>
		</div>
	);
}

export function WorkingHoursBodySkeleton() {
	const dayKeys = Array.from({ length: WORK_DAYS }, (_, index) => index);
	return (
		<div aria-hidden="true" className="flex w-full flex-col gap-4">
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-20" />
				<div className={cn(BAR, 'h-9 w-full max-w-sm')} />
			</div>
			<div className="flex flex-col hairline-divide-y divide-border">
				{dayKeys.map((key) => (
					<WorkDayRowSkeleton key={key} />
				))}
			</div>
		</div>
	);
}

function WorkingHoursSectionSkeleton() {
	return (
		<section className="py-8">
			<SectionTitleSkeleton width="w-36" />
			<div className="mt-5">
				<WorkingHoursBodySkeleton />
			</div>
		</section>
	);
}

export function SyncZoneBodySkeleton() {
	return (
		<div aria-hidden="true" className={SETTINGS_ROWS_CLASS}>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-20" />
				<ToggleControlSkeleton />
			</div>
			<div className={SETTINGS_ROW_CLASS}>
				<LabelSkeleton width="w-20" />
				<ToggleControlSkeleton />
			</div>
		</div>
	);
}

function SyncZoneSectionSkeleton() {
	return (
		<section className="py-8">
			<SectionTitleSkeleton width="w-44" />
			<div className="mt-5">
				<SyncZoneBodySkeleton />
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

export function PersonalDangerZoneBodySkeleton() {
	const rowKeys = Array.from({ length: DANGER_ROWS }, (_, index) => index);
	return (
		<div aria-hidden="true" className="flex w-full flex-col">
			{rowKeys.map((key) => (
				<DangerRowSkeleton key={key} />
			))}
		</div>
	);
}

function DangerZoneSectionSkeleton() {
	return (
		<section className="py-8">
			<SectionTitleSkeleton width="w-28" />
			<div className="mt-5">
				<PersonalDangerZoneBodySkeleton />
			</div>
		</section>
	);
}

/** The personal settings page: the band title row, the section nav beside the flat sections of the form. */
const SettingsPersonalSkeleton = () => {
	return (
		<PageLayout
			breadcrumb={
				<div className="flex min-w-0 items-center gap-2">
					<div className={cn(BAR, 'size-8 shrink-0')} />
					<div className={cn(BAR, 'h-4 w-16')} />
					<div className={cn(BAR, 'size-3.5 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-20')} />
					<div className={cn(BAR, 'size-3.5 rounded-sm')} />
					<div className={cn(BAR, 'h-4 w-20')} />
				</div>
			}
			mainHeaderSlot={
				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
					<div className={cn(BAR, 'h-5 w-24')} />
					<div className={cn(BAR, 'h-3 w-64')} />
				</div>
			}
		>
			<SettingsFrame navigation={<LeftSideSettingMenuSkeleton />}>
				<div className="flex flex-col gap-6 pb-8">
					<div className={cn(BAR, 'h-9 w-full lg:hidden')} />
					<div className={SETTINGS_SECTIONS_CLASS}>
						<div>
							<GeneralSectionSkeleton />
						</div>
						<div>
							<WorkingHoursSectionSkeleton />
						</div>
						<div>
							<SyncZoneSectionSkeleton />
						</div>
						<div>
							<DangerZoneSectionSkeleton />
						</div>
					</div>
				</div>
			</SettingsFrame>
		</PageLayout>
	);
};

export default SettingsPersonalSkeleton;
