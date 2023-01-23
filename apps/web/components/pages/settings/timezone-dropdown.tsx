import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Dropdown,
} from 'lib/components';
import timeZones from './timezones';
import { mapTimezoneItems, TimezoneItem } from 'lib/features';
import { useTimezoneSettings } from '@app/hooks';
import { clsxm } from '@app/utils';


export const TimezoneDropDown = () => {
	const { activeTimezone, setActiveTimezone } =
		useTimezoneSettings();

	const items = useMemo(() => mapTimezoneItems(timeZones), [timeZones]);

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
			onChange={(e:any) => onChangeLanguage(e)}
			items={items}
		>
		</Dropdown>
	);
};
