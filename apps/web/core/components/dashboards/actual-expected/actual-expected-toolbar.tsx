'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/core/components/common/segmented-control';
import { Users, X } from '@/core/components/icons';
import {
	PropertyFilterMenu,
	type PropertyFilterCategory,
	type PropertyFilterSelection
} from '@/core/components/tasks/property-filter-menu';
import type { PlanGrouping, PlanMember } from '@/core/lib/utils/dashboards/actual-expected';
import { MemberFace } from './plan-cells';

type MemberFilterField = 'members';

export function PlanMemberFilterMenu({
	members,
	selectedIds,
	onChange,
	onClear
}: Readonly<{
	members: ReadonlyArray<PlanMember>;
	selectedIds: string[];
	onChange: (employeeIds: string[]) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const categories = useMemo<PropertyFilterCategory<MemberFilterField>[]>(
		() => [
			{
				field: 'members',
				icon: <Users />,
				label: t('common.MEMBERS'),
				keepsCase: true,
				options: members.map((member) => ({
					value: member.employeeId,
					name: member.name,
					icon: <MemberFace name={member.name} imageUrl={member.imageUrl} />
				}))
			}
		],
		[members, t]
	);
	const selection = useMemo<PropertyFilterSelection<MemberFilterField>>(
		() => ({ members: selectedIds }),
		[selectedIds]
	);

	return (
		<PropertyFilterMenu
			categories={categories}
			selection={selection}
			onChange={(_field, values) => onChange(values)}
			onClear={onClear}
		/>
	);
}

export function AppliedPlanMemberFilters({
	members,
	selectedIds,
	onRemove,
	onClear
}: Readonly<{
	members: ReadonlyArray<PlanMember>;
	selectedIds: string[];
	onRemove: (employeeId: string) => void;
	onClear: () => void;
}>) {
	const t = useTranslations();
	const picked = members.filter((member) => selectedIds.includes(member.employeeId));
	const hasPicked = picked.length > 0;
	if (!hasPicked) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap items-center gap-1.5 pb-3">
			{picked.map((member) => (
				<span
					key={member.employeeId}
					className="inline-flex h-7 max-w-64 items-center gap-1.5 rounded-full bg-card pr-1 pl-2.5 text-xs hairline-ring ring-foreground/10"
				>
					<span className="shrink-0 text-muted-foreground">{t('common.MEMBER')}:</span>
					<MemberFace name={member.name} imageUrl={member.imageUrl} />
					<span className="truncate font-medium text-foreground">{member.name}</span>
					<button
						type="button"
						aria-label={t('dashboard.weeklyLimit.REMOVE_MEMBER', { name: member.name })}
						onClick={() => onRemove(member.employeeId)}
						className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
					>
						<X className="size-3" />
					</button>
				</span>
			))}
			<button
				type="button"
				onClick={onClear}
				className="h-7 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{t('common.CLEAR_FILTERS')}
			</button>
		</div>
	);
}

export function PlanGroupingControl({
	grouping,
	onGroupingChange
}: Readonly<{ grouping: PlanGrouping; onGroupingChange: (grouping: PlanGrouping) => void }>) {
	const t = useTranslations();
	const items = [
		{ value: 'member' as const, label: t('dashboard.weeklyLimit.GROUPING_MEMBER') },
		{ value: 'day' as const, label: t('dashboard.actualExpected.GROUPING_DAY') }
	];
	return (
		<SegmentedControl<PlanGrouping>
			items={items}
			value={grouping}
			onValueChange={onGroupingChange}
			ariaLabel={t('dashboard.weeklyLimit.GROUPING_LABEL')}
		/>
	);
}
