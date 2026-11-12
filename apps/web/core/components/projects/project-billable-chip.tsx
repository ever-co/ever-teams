'use client';

import { useTranslations } from 'next-intl';
import { isBillableByDefault } from '@/core/lib/utils/project-billable';
import type { TOrganizationProject } from '@/core/types/schemas';

/** Marks a project whose time starts as not billable. A billable project carries no mark. */
export function ProjectNotBillableChip({ project }: Readonly<{ project: Pick<TOrganizationProject, 'billable'> }>) {
	const t = useTranslations();
	const isBillable = isBillableByDefault(project);
	if (isBillable) {
		return null;
	}
	return (
		<span className="inline-flex h-6 shrink-0 items-center rounded-md bg-foreground/5 px-2 text-xs font-medium whitespace-nowrap text-muted-foreground">
			{t('pages.projects.billable.NOT_BILLABLE')}
		</span>
	);
}
