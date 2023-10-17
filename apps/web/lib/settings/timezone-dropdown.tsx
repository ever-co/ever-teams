import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'lib/components';
import timeZones from './timezones';
import { mapTimezoneItems, TimezoneItem } from 'lib/features';
import { useTimezoneSettings } from '@app/hooks';
import { clsxm } from '@app/utils';
import moment from 'moment-timezone';

export const TimezoneDropDown = ({
	currentTimezone,
	onChangeTimezone
}: {
	currentTimezone: any;
	onChangeTimezone: any;
}) => {
	const { activeTimezone, setActiveTimezone } = useTimezoneSettings();

	const allTimezonesNames = moment.tz.names();
	const allTimezonesWithUTC = allTimezonesNames.map((item) => {
		const offset = moment.tz(item).format('Z');
		return { name: item, offset: offset };
	});

	allTimezonesWithUTC.sort((a, b) => {
		// Compare the offsets for sorting
		if (a.offset < b.offset) {
			return -1;
		}
		if (a.offset > b.offset) {
			return 1;
		}
		return 0;
	});

	const sortedTimezones = allTimezonesWithUTC.map(
		(item) => `${item.name} (UTC ${item.offset})`
	);

	const timeZonesMap: string[] = sortedTimezones; // TODO: we should import here from timeZones

	const items = useMemo(() => mapTimezoneItems(timeZonesMap), [timeZonesMap]);

	const [timezoneItem, setTimezoneItem] = useState<TimezoneItem | null>(null);

	useEffect(() => {
		setTimezoneItem(
			items.find(
				(t) => t.key === activeTimezone || t.key === currentTimezone
			) || null
		);
	}, [activeTimezone, items, currentTimezone]);

	const onChange = useCallback(
		(item: TimezoneItem) => {
			if (item.data) {
				onChangeTimezone(item.data);
				setActiveTimezone(item.data);
			}
		},
		[setActiveTimezone, onChangeTimezone]
	);

	return (
		<Dropdown
			className="md:w-[469px]"
			buttonClassName={clsxm(
				'py-0 font-medium h-[54px]',
				items.length === 0 && ['py-2'],
				'bg-light--theme-light dark:bg-dark--theme-light dark:text-white font-normal'
			)}
			value={timezoneItem as any}
			onChange={(e: any) => onChange(e)}
			items={items as any}
		/>
	);
};
