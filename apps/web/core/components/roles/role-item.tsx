import { IRoleList } from '@/core/types/interfaces';
import { clsxm } from '@/core/lib/utils';
import { DropdownItem } from '@/core/components';
import React, { HTMLAttributes } from 'react';

export type RoleItem = DropdownItem<IRoleList>;

export function mapRoleItems(roles: IRoleList[]) {
	// eslint-disable-next-line react/display-name
	const RoleLabel = React.memo(({ selected, name }: { selected: boolean | undefined; name: string }) => (
		<div className="flex justify-between">
			<RoleItem title={name} className={selected ? 'font-medium' : ''} />
		</div>
	));
	const items = roles.map<RoleItem>((role: IRoleList) => {
		const name = role.name || 'Unnamed Role';
		return {
			key: role.id,
			Label: ({ selected }) => <RoleLabel selected={selected} name={name} />,
			selectedLabel: <RoleItem title={name} className="py-2 mb-0" />,
			data: role
		};
	});

	return items;
}

export function RoleItem({
	title,
	className
}: {
	title?: string;
	count?: number;
	className?: HTMLAttributes<HTMLDivElement>['className'];
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div
			role="menuitem"
			aria-label={title}
			className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-4', className)}
		>
			<span className={clsxm('text-normal dark:text-white')} title={title}>
				{title}
			</span>
		</div>
	);
}
