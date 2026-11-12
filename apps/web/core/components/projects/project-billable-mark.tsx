'use client';

import { useTranslations } from 'next-intl';
import { DollarCircle } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { isBillableByDefault } from '@/core/lib/utils/project-billable';
import type { TOrganizationProject } from '@/core/types/schemas';

function toneOf(isBillable: boolean) {
	if (isBillable) {
		return 'text-primary-ink';
	}
	return 'text-muted-foreground/45';
}

function labelKeyOf(isBillable: boolean) {
	if (isBillable) {
		return 'pages.projects.billable.LABEL' as const;
	}
	return 'pages.projects.billable.NOT_BILLABLE' as const;
}

export function ProjectBillableMark({
	project,
	className
}: Readonly<{ project: Pick<TOrganizationProject, 'billable'>; className?: string }>) {
	const t = useTranslations();
	const isBillable = isBillableByDefault(project);
	const label = t(labelKeyOf(isBillable));
	return (
		<span
			role="img"
			aria-label={label}
			title={label}
			className={cn('inline-flex shrink-0 items-center', toneOf(isBillable), className)}
		>
			<DollarCircle aria-hidden="true" className="size-3.5" />
		</span>
	);
}
