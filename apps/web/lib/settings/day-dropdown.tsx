import { Dropdown } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { IDay } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { DayItem, mapDayItems } from './day-items';

export const DayDropdown = ({ setValue, active }: { setValue: UseFormSetValue<FieldValues>; active?: IDay | null }) => {
	const t = useTranslations();
	const [DayList, setDay] = useState<IDay[]>(t('timer.DAY_LIST', { returnObjects: true }));

	const items: any = useMemo(() => mapDayItems(DayList), [DayList]);

	const [DayItem, setDayItem] = useState<DayItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: DayItem) => {
			if (item.data) {
				setDayItem(item);
				setValue('Day', item.data.title);
			}
		},
		[setDayItem, setValue]
	);

	useEffect(() => {
		if (!DayItem) {
			setDayItem(items[0]);
		}
	}, [DayItem, items]);

	useEffect(() => {
		if (active && DayList.every((Day) => Day.title !== active.title)) {
			setDay([...DayList, active]);
		}
	}, [DayList, setDay, setDayItem, active]);

	useEffect(() => {
		if (active) {
			setDayItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-fit max-w-sm bg-[#FFFFFF] dark:bg-dark--theme-light w-1"
				buttonClassName={clsxm(
					'py-0 font-medium h-14 w-[12rem] text-[#282048] dark:text-white',
					DayList.length === 0 && ['py-2']
				)}
				value={DayItem}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};
