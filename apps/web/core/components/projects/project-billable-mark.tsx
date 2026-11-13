'use client';

import { useTranslations } from 'next-intl';
import { DollarCircle } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { isBillableByDefault } from '@/core/lib/utils/project-billable';
import type { TOrganizationProject } from '@/core/types/schemas';

const BILLABLE_MARK =
	'inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-ink dark:bg-primary/15';

export function ProjectBillableMark({
	project,
	hidesBelowSm = false,
	className
}: Readonly<{ project: Pick<TOrganizationProject, 'billable'>; hidesBelowSm?: boolean; className?: string }>) {
	const t = useTranslations();
	const isBillable = isBillableByDefault(project);
	if (!isBillable) {
		return null;
	}
	const label = t('pages.projects.billable.LABEL');
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={cn(BILLABLE_MARK, hidesBelowSm && 'max-sm:hidden', className)}
		>
			<DollarCircle aria-hidden="true" className="size-4" />
		</span>
	);
}
