'use client';

import { memo, useMemo } from 'react';
import { type DottedLanguageObjectStringPaths, useLocale, useTranslations } from 'next-intl';
import { DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { ExportMenu, type ExportOption } from '@/core/components/dashboards/kit/export-menu';
import { PeriodPicker } from '@/core/components/dashboards/kit/period-picker';
import { SegmentedControl, type SegmentedControlItem } from '@/core/components/common/segmented-control';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterSelection
} from '@/core/components/tasks/property-filter-menu';
import { Users, X } from '@/core/components/icons';
import { formatPeriod, type Period } from '@/core/lib/utils/dashboard-period';
import { APPS_URLS_VIEWS, type AppsUrlsView, type UsagePerson } from '@/core/lib/utils/dashboards/apps-urls';
import { APPS_URLS_WEEK_START } from '@/core/hooks/dashboards/apps-urls/use-apps-urls-report';
import { PersonFace, personNameOrFallback } from './usage-cells';

type MemberFilterField = 'members';

const VIEW_LABEL_KEYS: Record<AppsUrlsView, DottedLanguageObjectStringPaths> = {
	date: 'dashboard.appsUrls.VIEW_DATE',
	employee: 'dashboard.appsUrls.VIEW_EMPLOYEE',
	project: 'dashboard.appsUrls.VIEW_PROJECT',
	application: 'dashboard.appsUrls.VIEW_APPLICATION'
};

const CHIP =
	'inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10';

const CHIP_REMOVE =
	'flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

const CLEAR_BUTTON =
	'h-7 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25';

function PeriodMeta({ period }: Readonly<{ period: Period }>) {
	const locale = useLocale();
	return <span>{formatPeriod(period, locale)}</span>;
}

function selectedPeopleOf(people: ReadonlyArray<UsagePerson>, selectedIds: ReadonlyArray<string>) {
	const selected: UsagePerson[] = [];
	for (const id of selectedIds) {
		const person = people.find((candidate) => candidate.id === id);
		if (person) {
			selected.push(person);
			continue;
		}
		selected.push({ id, name: '', imageUrl: null });
	}
	return selected;
}

function AppliedMembers({
	people,
	selectedIds,
	onRemove,
	onClear
}: Readonly<{
	people: ReadonlyArray<UsagePerson>;
	selectedIds: ReadonlyArray<string>;
	onRemove: (id: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const unknownName = t('dashboard.appsUrls.UNKNOWN_MEMBER');
	const selected = selectedPeopleOf(people, selectedIds);
	if (selected.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{selected.map((person) => {
				const name = personNameOrFallback(person, unknownName);
				return (
					<span key={person.id} className={CHIP}>
						<span className="shrink-0 text-muted-foreground">
							{t('dashboard.appsUrls.APPLIED_MEMBER')}:
						</span>
						<PersonFace person={person} fallbackName={unknownName} />
						<span className="truncate font-medium text-foreground">{name}</span>
						<button
							type="button"
							aria-label={t('dashboard.appsUrls.REMOVE_FILTER', { name })}
							onClick={() => onRemove(person.id)}
							className={CHIP_REMOVE}
						>
							<X className="size-3" />
						</button>
					</span>
				);
			})}
			<button type="button" onClick={onClear} className={CLEAR_BUTTON}>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);
}

function MemberFilter({
	people,
	selectedIds,
	onChange,
	onClear
}: Readonly<{
	people: ReadonlyArray<UsagePerson>;
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const categories = useMemo<PropertyFilterCategory<MemberFilterField>[]>(() => {
		const unknownName = t('dashboard.appsUrls.UNKNOWN_MEMBER');
		const options = people.map((person) => ({
			value: person.id,
			name: personNameOrFallback(person, unknownName),
			icon: <PersonFace person={person} fallbackName={unknownName} />
		}));
		return [{ field: 'members', icon: <Users />, label: t('common.MEMBERS'), options, keepsCase: true }];
	}, [people, t]);
	const selection: PropertyFilterSelection<MemberFilterField> = { members: selectedIds };

	return (
		<PropertyFilterMenu
			categories={categories}
			selection={selection}
			onChange={(_, values) => onChange(values)}
			onClear={onClear}
		/>
	);
}

/**
 * The toolbar band: title and period on the first row with Export; the period stepper and the member filter
 * (organisation roles only, applied at once) on the second, the grouping switch at its right, applied members as
 * chips underneath.
 */
export const AppsUrlsToolbar = memo(function AppsUrlsToolbar({
	title,
	period,
	onPeriodChange,
	view,
	onViewChange,
	canFilterMembers,
	people,
	selectedEmployeeIds,
	onMembersChange,
	onClearMembers,
	isUpdating,
	exportOptions,
	isExportDisabled
}: Readonly<{
	title: string;
	period: Period;
	onPeriodChange: (period: Period) => void;
	view: AppsUrlsView;
	onViewChange: (view: AppsUrlsView) => void;
	canFilterMembers: boolean;
	people: ReadonlyArray<UsagePerson>;
	selectedEmployeeIds: string[];
	onMembersChange: (ids: string[]) => void;
	onClearMembers: () => void;
	isUpdating: boolean;
	exportOptions: ReadonlyArray<ExportOption>;
	isExportDisabled: boolean;
}>) {
	const t = useTranslations();
	const viewItems = useMemo<SegmentedControlItem<AppsUrlsView>[]>(
		() => APPS_URLS_VIEWS.map((value) => ({ value, label: t(VIEW_LABEL_KEYS[value]) })),
		[t]
	);
	const removeMember = (id: string) => {
		const remaining = selectedEmployeeIds.filter((selectedId) => selectedId !== id);
		onMembersChange(remaining);
	};

	return (
		<DashboardToolbar
			title={title}
			meta={<PeriodMeta period={period} />}
			isUpdating={isUpdating}
			updatingLabel={t('dashboard.appsUrls.UPDATING')}
			actions={<ExportMenu options={exportOptions} isDisabled={isExportDisabled} />}
			controls={
				<>
					<PeriodPicker value={period} onChange={onPeriodChange} weekStartsOn={APPS_URLS_WEEK_START} />
					{canFilterMembers && (
						<MemberFilter
							people={people}
							selectedIds={selectedEmployeeIds}
							onChange={onMembersChange}
							onClear={onClearMembers}
						/>
					)}
				</>
			}
			trailingControls={
				<SegmentedControl
					items={viewItems}
					value={view}
					onValueChange={onViewChange}
					ariaLabel={t('dashboard.appsUrls.VIEW_LABEL')}
				/>
			}
			belowControls={
				canFilterMembers && (
					<AppliedMembers
						people={people}
						selectedIds={selectedEmployeeIds}
						onRemove={removeMember}
						onClear={onClearMembers}
					/>
				)
			}
		/>
	);
});
