'use client';

import { memo, useCallback, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AnimatedHeight } from '@/core/components/common/animated-height';
import { EntityTile } from '@/core/components/common/entity-tile';
import { GroupToggle } from '@/core/components/dashboards/kit/dashboard-layout';
import { DASHBOARD_SURFACE, SECTION_HEADER, SECTION_META } from '@/core/components/dashboards/kit/recipes';
import { cn } from '@/core/lib/helpers';
import { amountTextOf, type BudgetRow } from '@/core/lib/utils/dashboards/project-budget';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { RiskDot, typeTextOf } from './budget-cells';

type Translate = ReturnType<typeof useTranslations>;

const PROJECTS_PATH = '/projects';

const COUNT_CHIP =
	'inline-flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-[5px] bg-foreground/[0.06] px-1 text-[11px] font-medium tabular-nums text-muted-foreground';

const ROW =
	'relative flex min-h-11 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-foreground/[0.03] has-[a:focus-visible]:bg-foreground/[0.03] [content-visibility:auto] [contain-intrinsic-size:auto_52px]';

function projectPathOf(projectId: string) {
	return `${PROJECTS_PATH}/${projectId}`;
}

function rowMetaOf(row: BudgetRow, t: Translate) {
	const typeText = typeTextOf(row, t);
	const membersCount = row.project.membersCount;
	if (typeof membersCount !== 'number') {
		return typeText;
	}
	const membersText = t('dashboard.projectBudget.MEMBERS_COUNT', { count: membersCount });
	return `${typeText} · ${membersText}`;
}

const UnbudgetedRow = memo(function UnbudgetedRow({ row }: Readonly<{ row: BudgetRow }>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const project = row.project;
	const spentText = amountTextOf(row.spent, row, locale);
	return (
		<li className={ROW}>
			<span aria-hidden="true" className="flex shrink-0">
				<EntityTile name={project.name} color={project.color} imageUrl={project.imageUrl} />
			</span>
			<span className="flex min-w-0 flex-1 flex-col">
				<Link
					href={projectPathOf(project.id)}
					prefetch={false}
					className="truncate text-[13px] text-foreground outline-none after:absolute after:inset-0 focus-visible:underline"
				>
					{project.name}
				</Link>
				<span className="truncate text-xs text-muted-foreground">{rowMetaOf(row, t)}</span>
			</span>
			<span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
				<span className="text-xs text-muted-foreground">{t('dashboard.projectBudget.COLUMN_SPENT')}</span>
				<span className="text-[13px] font-medium text-foreground">{spentText}</span>
			</span>
		</li>
	);
});

/** Closed under a board that shows projects; open when the board is empty, so a filter on it is not hidden away. */
export function ProjectBudgetUnbudgeted({
	rows,
	isOpenByDefault
}: Readonly<{ rows: ReadonlyArray<BudgetRow>; isOpenByDefault: boolean }>) {
	const t = useTranslations();
	const [openOverride, setOpenOverride] = useState<boolean | null>(null);
	const isOpen = openOverride ?? isOpenByDefault;
	const toggle = useCallback(() => setOpenOverride(!isOpen), [isOpen]);
	const label = t('dashboard.projectBudget.RISK_NO_BUDGET');
	const hasRows = rows.length > 0;
	if (!hasRows) {
		return null;
	}
	return (
		<section aria-label={label} className={DASHBOARD_SURFACE}>
			<header className={SECTION_HEADER}>
				<GroupToggle isOpen={isOpen} onToggle={toggle} className="min-w-0">
					<RiskDot risk="noBudget" />
					<span className="truncate">{label}</span>
					<span className={COUNT_CHIP}>{rows.length}</span>
				</GroupToggle>
				<span className={cn(SECTION_META, 'max-sm:hidden')}>
					{t('dashboard.projectBudget.UNBUDGETED_NOTE')}
				</span>
			</header>
			<AnimatedHeight>
				{isOpen && (
					<ul className="flex flex-col px-2 pb-2">
						{rows.map((row) => (
							<UnbudgetedRow key={row.key} row={row} />
						))}
					</ul>
				)}
			</AnimatedHeight>
		</section>
	);
}
