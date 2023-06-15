import { useMemo, useState } from 'react';
import { Button, Dropdown } from 'lib/components';
import { mapPermissionItems, PermissonItem } from './permission-item';
import { PlusIcon } from '@heroicons/react/24/solid';
import { clsxm } from '@app/utils';
import { useTranslation } from 'lib/i18n';

export const PermissionDropDown = ({
	publicTeam,
}: {
	publicTeam?: boolean;
}) => {
	const permissions = [
		{
			name: 'Viewer',
		},
		{
			name: 'Member',
		},
		{
			name: 'Manager',
		},
		{
			name: 'Manager (Admin)',
		},
	];

	const { trans } = useTranslation();

	const items = useMemo(() => mapPermissionItems(permissions), [permissions]);
	const [permissionsItem, setPermissionsItem] = useState<PermissonItem | null>(
		items[0]
	);

	return (
		<>
			<Dropdown
				className="md:w-[223px]"
				optionsClassName="md:w-[223px]"
				buttonClassName={clsxm(
					'py-0 font-medium h-11'
					// items.length === 0 && ['py-2']
				)}
				value={permissionsItem}
				items={items}
				closeOnChildrenClick={false}
				// loading={teamsFetching} // TODO: Enable loading in future when we implement better data fetching library like TanStack
			>
				<Button
					className="w-full text-base dark:text-white dark:border-white rounded-xl"
					variant="outline"
				>
					<PlusIcon className="w-[20px] h-[20px]" />
					{trans.common.CREATE_ROLE}
				</Button>
			</Dropdown>
		</>
	);
};
