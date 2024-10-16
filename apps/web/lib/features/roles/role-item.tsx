import { IRoleList } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { DropdownItem } from 'lib/components';

export type RoleItem = DropdownItem<IRoleList>;

export function mapRoleItems(roles: IRoleList[]) {
	const items = roles.map<RoleItem>((role: IRoleList) => {
		return {
			key: role.id,
			Label: ({ selected }) => (
				<div className="flex justify-between">
					<RoleItem title={role.name} className={selected ? 'font-medium' : ''} />
				</div>
			),
			selectedLabel: <RoleItem title={role.name} className="py-2 mb-0" />,
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
	className?: string;
	color?: string;
	disabled?: boolean;
}) {
	return (
		<div className={clsxm('flex items-center justify-start space-x-2 text-sm cursor-pointer mb-4', className)}>
			<span className={clsxm('text-normal dark:text-white')}>{title}</span>
		</div>
	);
}
