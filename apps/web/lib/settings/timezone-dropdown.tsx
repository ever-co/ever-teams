import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dropdown } from 'lib/components';
import timeZones from './timezones';
import { mapTimezoneItems, TimezoneItem } from 'lib/features';
import { useTimezoneSettings } from '@app/hooks';
import { clsxm } from '@app/utils';

export const TimezoneDropDown = ({
	currentTimezone,
	onChangeTimezone,
}: {
	currentTimezone: any;
	onChangeTimezone: any;
}) => {
	const { activeTimezone, setActiveTimezone } = useTimezoneSettings();

	const timeZonesMap: string[] = timeZones; // TODO: we should import here from timeZones

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
		[setActiveTimezone]
	);

	return (
		<Dropdown
			className="md:w-[469px]"
			buttonClassName={clsxm(
				'py-0 font-medium h-[54px]',
				items.length === 0 && ['py-2']
			)}
			value={timezoneItem as any}
			onChange={(e: any) => onChange(e)}
			items={items as any}
		/>
	);
};
