import { CHARACTER_LIMIT_TO_SHOW } from '@app/constants';
import { clsxm } from '@app/utils';
import { DropdownItem, InputField, Tooltip } from 'lib/components';
import { Edit2Icon, TrashIcon } from 'lib/components/svgs';

export type PermissonItem = DropdownItem<{ name: string }>;

export function mapPermissionItems(permission: { name: string }[]) {
	const items = permission.map<PermissonItem>((permission, index) => {
		return {
			key: permission.name,
			Label: ({ selected }) => (
				<Tooltip
					label={permission.name || ''}
					placement="auto"
					enabled={
						(permission.name || '').trim().length > CHARACTER_LIMIT_TO_SHOW - 5
					}
				>
					{index === 0 && (
						<InputField
							type="text"
							placeholder={'Search'}
							className="mb-0 h-11"
							wrapperClassName={'mb-0'}
						/>
					)}
					<div className="flex justify-between w-full py-3">
						<div className="max-w-[90%]">
							<PermissonItem
								title={permission.name}
								className={clsxm(selected && ['font-medium'])}
							/>
						</div>

						<div className="flex justify-end w-full">
							<Edit2Icon className="cursor-pointer" />
							<TrashIcon className="cursor-pointer" />
						</div>
					</div>
				</Tooltip>
			),
			selectedLabel: (
				<Tooltip
					label={permission.name || ''}
					placement="auto"
					enabled={
						(permission.name || '').trim().length > CHARACTER_LIMIT_TO_SHOW - 5
					}
				>
					<PermissonItem title={permission.name} className="py-2 mb-0" />
				</Tooltip>
			),
			data: permission,
		};
	});

	// if (items.length > 0) {
	// 	items.unshift({
	// 		key: 0,
	// 		Label: () => (
	// 			<div className="flex justify-between pr-2 pl-2 pt-3 pb-3">
	// 				<PermissonItem
	// 					title={'Select Roles'}
	// 					className="w-full cursor-default"
	// 					disabled
	// 				/>
	// 				{/* <SettingsOutlineIcon className="opacity-70" /> */}
	// 			</div>
	// 		),
	// 		disabled: true,
	// 	});
	// }

	return items;
}

export function PermissonItem({
	title,
	className,
	disabled,
}: {
	title?: string;
	className?: string;
	disabled?: boolean;
}) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-start space-x-2 text-sm',
				'cursor-pointer max-w-full',
				className,
				disabled && ['dark:text-default']
			)}
		>
			<span
				className={clsxm(
					'text-normal',
					'whitespace-nowrap text-ellipsis overflow-hidden',
					disabled && ['dark:text-default']
				)}
			>
				{title}
			</span>
		</div>
	);
}
