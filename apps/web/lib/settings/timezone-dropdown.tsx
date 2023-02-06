import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'lib/components';
// import timeZones from './timezones';
import { mapTimezoneItems, TimezoneItem } from 'lib/features';
import { useTimezoneSettings } from '@app/hooks';
import { clsxm } from '@app/utils';
// import { ITimezoneItemList } from '@app/interfaces';

export const TimezoneDropDown = () =>
	// currentTimezone: any,
	// onChangeTimezone: any
	{
		const { activeTimezone, setActiveTimezone } = useTimezoneSettings();

		// const timeZonesMap: ITimezoneItemList[] = []; // TODO: we should import here from timeZones

		const items = useMemo(() => mapTimezoneItems([]), []);

		const [timezoneItem, setTimezoneItem] = useState<TimezoneItem | null>(null);

		useEffect(() => {
			setTimezoneItem(items.find((t) => t.data === activeTimezone) || null);
		}, [activeTimezone, items]);

		const onChangeLanguage = useCallback(
			(item: TimezoneItem) => {
				if (item.data) {
					setActiveTimezone(item.data);
				}
			},
			[setActiveTimezone]
		);

		return (
			<Dropdown
				className="md:w-[469px]"
				buttonClassName={clsxm(
					'py-0 font-medium',
					items.length === 0 && ['py-2']
				)}
				value={timezoneItem}
				onChange={(e: any) => onChangeLanguage(e)}
				items={items}
			/>
		);
	};
