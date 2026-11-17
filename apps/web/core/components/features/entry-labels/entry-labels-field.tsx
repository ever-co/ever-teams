'use client';

import { useTranslations } from 'next-intl';

import { DialogFieldLabel } from '@/core/components/common/dialog-field-label';
import type { EntryLabel } from '@/core/lib/utils/time-log-labels';
import { EntryLabelsPicker } from './entry-labels-picker';

/**
 * The Labels field of a time entry form (Gauzy #12029): the team's labels, as tasks use them. Not shown against an API
 * without labels on entries, nor for a break, which is not work.
 */
export function EntryLabelsField({
	labelIds,
	onChange,
	isShown,
	optionalLabel,
	carriedLabels
}: Readonly<{
	labelIds: string[];
	onChange: (labelIds: string[]) => void;
	isShown: boolean;
	optionalLabel?: string;
	carriedLabels?: EntryLabel[];
}>) {
	const t = useTranslations();
	if (!isShown) {
		return null;
	}
	return (
		<div className="flex flex-col">
			<DialogFieldLabel optionalLabel={optionalLabel}>{t('common.LABELS')}</DialogFieldLabel>
			<EntryLabelsPicker value={labelIds} onChange={onChange} carriedLabels={carriedLabels} />
		</div>
	);
}
