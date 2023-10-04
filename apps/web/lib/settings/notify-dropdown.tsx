import { Dropdown } from 'lib/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { INotify } from '@app/interfaces/INotify';
import { clsxm } from '@app/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { NotifyItem, mapNotifyItems } from './notify-item';

export const NotifyDropdown = ({
	setValue,
	active
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: INotify | null;
}) => {
	const [NotifyList, setNotify] = useState<INotify[]>([
		{
			title: 'Pending'
		}
	]);

	const items: any = useMemo(() => mapNotifyItems(NotifyList), [NotifyList]);

	const [NotifyItem, setNotifyItem] = useState<NotifyItem | null>();

	const onChangeActiveTeam = useCallback(
		(item: NotifyItem) => {
			if (item.data) {
				setNotifyItem(item);
				setValue('Notify', item.data.title);
			}
		},
		[setNotifyItem, setValue]
	);

	useEffect(() => {
		if (!NotifyItem) {
			setNotifyItem(items[0]);
		}
	}, [NotifyItem, items]);

	useEffect(() => {
		if (active && NotifyList.every((Notify) => Notify.title !== active.title)) {
			setNotify([...NotifyList, active]);
		}
	}, [NotifyList, setNotify, setNotifyItem, active]);

	useEffect(() => {
		if (active) {
			setNotifyItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-max max-w-sm bg-[#FFFFFF] dark:bg-dark--theme-light "
				buttonClassName={clsxm(
					'py-0 font-medium h-14 w-[14.7rem] text-[#282048] dark:text-white',
					NotifyList.length === 0 && ['py-2']
				)}
				value={NotifyItem}
				onChange={onChangeActiveTeam}
				items={items}
			></Dropdown>
		</>
	);
};
