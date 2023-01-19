import { useMemo, useState } from 'react';
import {
	Dropdown,
} from 'lib/components';
import timeZones from './timezones';
import { clsxm } from '@app/utils';
import { mapTimezoneItems } from 'lib/features';

export const TimezoneDropDown = ({currectTimezone, onChangeTimezone}:any) => {
const items = useMemo(() => mapTimezoneItems(timeZones), [timeZones]);
	return (
		<Dropdown
			className="md:w-[469px]"
			buttonClassName={clsxm(
				'py-0 font-medium',
				timeZones.length === 0 && ['py-2']
			)}
			value={currectTimezone}
			onChange={onChangeTimezone}
			items={items}
			// loading={languagesFetching}
		>
		</Dropdown>
	);
};
