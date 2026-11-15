'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Calendar as CalendarIcon } from '@/core/components/icons';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { shownDayOf } from '@/core/lib/utils/date-only';
import { dayWritingOf } from '@/core/lib/utils/typed-date-time';
import { Calendar } from './calendar';
import { PickerField, type PickerFieldProps } from './picker-field';

/** A day as `YYYY-MM-DD`, `''` for none: the value, the earliest day (`min`) and the latest one (`max`). */
export type DateFieldProps = PickerFieldProps;

type DayMatcher = { before: Date } | { after: Date };

function outOfRangeDaysOf(earliest: Date | null, latest: Date | null) {
	const matchers: DayMatcher[] = [];
	if (earliest) {
		matchers.push({ before: earliest });
	}
	if (latest) {
		matchers.push({ after: latest });
	}
	return matchers;
}

/**
 * A day typed in the workspace's date format, or picked on the app's calendar (#5318). It takes and gives the value of
 * the native date field it replaced, so a form keeps its own logic.
 */
export function DateField({ value, min, max, ...props }: Readonly<DateFieldProps>) {
	const t = useTranslations();
	const locale = useWorkspaceLocale();
	const writing = useMemo(() => dayWritingOf(locale), [locale]);
	const selected = shownDayOf(value) ?? undefined;
	const earliest = shownDayOf(min);
	const latest = shownDayOf(max);

	return (
		<PickerField
			{...props}
			value={value}
			min={min}
			max={max}
			writing={writing}
			pickerLabel={t('common.PICK_A_DATE')}
			pickerIcon={<CalendarIcon aria-hidden="true" />}
			renderPicker={(pick) => (
				<Calendar
					mode="single"
					selected={selected}
					defaultMonth={selected ?? earliest ?? latest ?? undefined}
					disabled={outOfRangeDaysOf(earliest, latest)}
					onSelect={(day: Date | undefined) => {
						if (day) {
							pick(localDayKeyOf(day));
						}
					}}
					initialFocus
				/>
			)}
		/>
	);
}
