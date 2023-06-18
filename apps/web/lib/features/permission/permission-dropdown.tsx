import { useMemo } from 'react';
import { Card, InputField } from 'lib/components';
import { PermissonItem } from './permission-item';
import { clsxm } from '@app/utils';
import { useTranslation } from 'lib/i18n';
import { Popover, Transition } from '@headlessui/react';
import { ArrowDown, Edit2Icon, TrashIcon } from 'lib/components/svgs';

export const PermissionDropDown = () => {
	const permissions = useMemo(
		() => [
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
		],
		[]
	);

	const { trans } = useTranslation();

	return (
		<>
			<Popover className="relative bg-light--theme-light dark:bg-dark--theme-light">
				<Popover.Button className="md:min-w-[10.75rem] flex justify-between items-center px-4 py-3 text-sm border text-[#B1AEBC] outline-none rounded-xl bg-light--theme-light dark:bg-dark--theme-light">
					{trans.pages.permissions.SELECT_ROLES}
					<ArrowDown />
				</Popover.Button>

				<Transition
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<Popover.Panel className="absolute z-12 rounded-xl bg-light--theme-light dark:bg-dark--theme-light w-full">
						<Card
							shadow="custom"
							className="md:px-4 py-4 rounded-x md:min-w-[14.125rem]"
							style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
						>
							{/* Search */}
							<div className="flex items-center justify-between w-full">
								<InputField
									type="text"
									placeholder={trans.common.SEARCH}
									className="mb-0 h-11"
									wrapperClassName={'mb-0'}
								/>
							</div>

							{permissions.map((permission) => (
								<div
									className="flex justify-between w-full py-3"
									key={permission.name}
								>
									<div className="max-w-[90%]">
										<PermissonItem
											title={permission.name}
											className={clsxm(['font-medium'])}
										/>
									</div>

									<div className="flex justify-end w-full gap-1">
										<Edit2Icon className="cursor-pointer" />
										<TrashIcon className="cursor-pointer" />
									</div>
								</div>
							))}
						</Card>
					</Popover.Panel>
				</Transition>
			</Popover>
		</>
	);
};
