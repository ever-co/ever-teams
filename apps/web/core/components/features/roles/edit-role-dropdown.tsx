import { Dropdown } from '@/core/components';
import { clsxm } from '@/core/lib/utils';
import { IRole, IRoleList, IOrganizationTeamMember } from '@/core/types/interfaces/to-review';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { mapRoleItems, RoleItem } from '@/core/components/roles/role-item';
import { useRoles } from '@/core/hooks/roles';

export const EditUserRoleDropdown = ({
	member,
	handleRoleChange
}: {
	member: IOrganizationTeamMember;
	handleRoleChange: (newRole: IRole) => void;
}) => {
	const { roles } = useRoles();

	const items = useMemo(
		() => mapRoleItems(roles.filter((role) => ['MANAGER', 'EMPLOYEE'].includes(role.name)) as IRoleList[]),
		[roles]
	);

	const [roleItem, setRoleItem] = useState<RoleItem | null>(null);

	useEffect(() => {
		setRoleItem(items.find((t) => t.key === member?.roleId) || null);
	}, [items, member?.roleId]);

	const onChange = useCallback(
		(item: RoleItem) => {
			if (item.data) {
				setRoleItem(item);
			}
			if (item.data?.id && item.data.data) {
				handleRoleChange(item.data?.data);
			}
		},
		[handleRoleChange]
	);

	return (
		<>
			<Dropdown
				className="min-w-fit max-w-sm bg-[#FFFFFF] dark:bg-dark--theme-light w-1"
				buttonClassName={clsxm('py-0 font-medium h-12 w-[12rem] text-[#282048] dark:text-white')}
				value={roleItem}
				onChange={onChange}
				items={items}
			></Dropdown>
		</>
	);
};
