import { Dropdown } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { IPeriod } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { PeriodItem, mapPeriodItems } from './period-items';

export const PeriodDropdown = ({
	setValue,
	active
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IPeriod | null;
}) => {
	const [PeriodList, setPeriod] = useState<IPeriod[]>([
		{
			title: 'Private'
		},
		{
			title: 'Public'
		}
	]);

	const items: any = useMemo(() => mapPeriodItems(PeriodList), [PeriodList]);

	const [PeriodItem, setPeriodItem] = useState<PeriodItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: PeriodItem) => {
			if (item.data) {
				setPeriodItem(item);
				setValue('Period', item.data.title);
			}
		},
		[setPeriodItem, setValue]
	);

	useEffect(() => {
		if (!PeriodItem) {
			setPeriodItem(items[0]);
		}
	}, [PeriodItem, items]);

	useEffect(() => {
		if (active && PeriodList.every((Period) => Period.title !== active.title)) {
			setPeriod([...PeriodList, active]);
		}
	}, [PeriodList, setPeriod, setPeriodItem, active]);

	useEffect(() => {
		if (active) {
			setPeriodItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-[150px] max-w-sm"
				buttonClassName={clsxm(
					'py-0 font-medium h-[54px] w-[150px]',
					PeriodList.length === 0 && ['py-2']
				)}
				value={PeriodItem}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};
