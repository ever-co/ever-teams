import { Dropdown } from '@/core/components';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { clsxm } from '@/core/lib/utils';
import { FieldValues, UseFormSetValue } from 'react-hook-form';
import { FilterItem, IFilter } from '../../settings/filter-items';
import { mapInvitationExpireItems, InvitationExpireItem, IInvitationExpire } from './invitation-expire-items';

export const InvitationExpireDropdown = ({
	setValue,
	active
}: {
	setValue: UseFormSetValue<FieldValues>;
	active?: IInvitationExpire | null;
}) => {
	const [expireList, setExpire] = useState<IFilter[]>([
		{
			title: 'name'
		}
	]);

	const items: any = useMemo(() => mapInvitationExpireItems(expireList), [expireList]);

	const [expireItem, setExpireItem] = useState<InvitationExpireItem | null>();

	const onChangeExpireItem = useCallback(
		(item: FilterItem) => {
			if (item.data) {
				setExpireItem(item);
				setValue('filter', item.data.title);
			}
		},
		[setExpireItem, setValue]
	);

	useEffect(() => {
		if (!expireItem && items.length > 0) {
			setExpireItem(items[0]);
		}
	}, [expireItem, items]);

	useEffect(() => {
		if (active && expireList.every((invitation) => invitation.title !== invitation.title)) {
			setExpire([...expireList, active]);
		}
	}, [expireList, setExpire, setExpireItem, active]);

	useEffect(() => {
		if (active) {
			setExpireItem(items.find((item: any) => item.key === active?.title));
		}
	}, [active, items]);

	return (
		<>
			<Dropdown
				className="min-w-[150px] max-w-sm z-50"
				buttonClassName={clsxm('py-0 font-medium h-[54px] w-[150px]', expireList.length === 0 && ['py-2'])}
				value={expireItem}
				onChange={onChangeExpireItem}
				items={items}
			></Dropdown>
		</>
	);
};
