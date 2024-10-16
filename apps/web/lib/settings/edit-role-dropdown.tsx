import { Dropdown } from 'lib/components';
import { clsxm } from '@app/utils';
import {useRoles} from "@app/hooks/features/useRoles";
import { IRoleList, OT_Member } from "@app/interfaces";
import {useCallback, useEffect, useMemo, useState} from "react";
import {mapRoleItems, RoleItem} from "../features/roles/role-item";


export const EditUserRoleDropdown = ({ member, handleRoleChange }: { member: OT_Member,handleRoleChange : (newRoleId: string) => void}) => {
	const {roles} =  useRoles()

	const items = useMemo(() => mapRoleItems(roles as IRoleList[]), [roles]);

	const [roleItem, setRoleItem] = useState<RoleItem | null>(null);

	useEffect(() => {
		setRoleItem(items.find(t => t.key === member?.roleId) || null);
	}, [items]);

	const onChange = useCallback(
		(item: RoleItem) => {
			if (item.data) {
				setRoleItem(item);
			}
			if(item?.data?.id)
				handleRoleChange(item?.data?.id)
		},
		[]
	);

	return (
		<>
			<Dropdown
				className="min-w-fit max-w-sm bg-[#FFFFFF] dark:bg-dark--theme-light w-1"
				buttonClassName={clsxm(
					'py-0 font-medium h-12 w-[12rem] text-[#282048] dark:text-white'
				)}
				value={roleItem}
				onChange={onChange}
				items={items}
			></Dropdown>
		</>
	);
};
