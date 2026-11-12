'use client';

import type { KeyboardEvent } from 'react';
import { Description, Field } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { BillableSwitch } from '@/core/components/common/billable-switch';
import { DollarCircle } from '@/core/components/icons';
import { PropertyRow } from '@/core/components/projects/project-properties';

interface ProjectBillableRowProps {
	/** The draft's choice: null while nobody chose, which reads as off. */
	billable: boolean | null;
	onChange: (billable: boolean) => void;
}

/** The switch submits its form on Enter, and the composer saves on its shortcut only: Enter stops here. */
function keepEnterFromSaving(event: KeyboardEvent<HTMLElement>) {
	if (event.key === 'Enter') {
		event.stopPropagation();
	}
}

export function ProjectBillableRow({ billable, onChange }: Readonly<ProjectBillableRowProps>) {
	const t = useTranslations();
	const isBillable = billable === true;
	const hint = (
		<Description className="text-xs text-muted-foreground">{t('pages.projects.billable.HELP')}</Description>
	);
	return (
		<Field onKeyUpCapture={keepEnterFromSaving}>
			<PropertyRow icon={<DollarCircle />} label={t('pages.projects.detail.BILLABLE')} hint={hint}>
				<BillableSwitch
					isBillable={isBillable}
					onChange={onChange}
					label={t('pages.projects.billable.LABEL')}
				/>
			</PropertyRow>
		</Field>
	);
}
