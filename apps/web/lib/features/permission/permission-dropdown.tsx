import {
	ChangeEvent,
	Dispatch,
	KeyboardEvent,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from 'react';
import { Button, Card, InputField } from 'lib/components';
import { PermissonItem } from './permission-item';
import { clsxm } from '@app/utils';
import { useTranslation } from 'lib/i18n';
import { Popover, Transition } from '@headlessui/react';
import { ArrowDown, Edit2Icon, TrashIcon } from 'lib/components/svgs';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useRoles } from '@app/hooks/features/useRoles';
import { IRole } from '@app/interfaces';

export const PermissionDropDown = ({
	selectedRole,
	setSelectedRole,
}: {
	selectedRole: IRole | null;
	setSelectedRole: Dispatch<SetStateAction<IRole | null>>;
}) => {
	const {
		getRoles,
		roles,
		createRole,
		createRoleLoading,
		deleteRole,
		updateRole,
	} = useRoles();
	const [filterValue, setFilterValue] = useState<string>('');

	const [editRole, setEditRole] = useState<IRole | null>(null);
	const handleEdit = (role: IRole) => {
		setEditRole(role);
	};

	useEffect(() => {
		getRoles();
	}, [getRoles]);

	// CREATE
	const handleCreateRole = useCallback(async () => {
		if (filterValue.length) {
			await createRole({
				name: filterValue,
			});
			setFilterValue('');
		}
	}, [filterValue, createRole]);
	const handleOnKeyUp = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter') {
			handleCreateRole();
		}
	};

	// UPDATE
	const handleEditChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			setEditRole({
				...editRole,
				name: e.target.value,
			});
		},
		[editRole]
	);
	const handleEditRole = useCallback(async () => {
		if (editRole) {
			await updateRole(editRole);
			setEditRole(null);
		}
	}, [editRole, updateRole]);
	const handleEditOnKeyUp = (event: KeyboardEvent<HTMLElement>) => {
		if (event.key === 'Enter') {
			handleEditRole();
		}
	};

	const rolesList = useMemo(
		() =>
			/* eslint-disable no-mixed-spaces-and-tabs */
			filterValue
				? roles
						.map((role) => ({
							...role,
							name: role.name.split('_').join(' '),
						}))
						.filter((role) =>
							role.name.toLowerCase().includes(filterValue.toLowerCase())
						)
				: roles.map((role) => ({
						...role,
						name: role.name.split('_').join(' '),
				  })),
		[roles, filterValue]
	);

	const { trans } = useTranslation();

	return (
		<>
			<Popover className="relative bg-light--theme-light dark:bg-dark--theme-light">
				<Popover.Button className="md:min-w-[10.75rem] flex justify-between items-center px-4 py-3 text-sm border text-[#B1AEBC] outline-none rounded-xl bg-light--theme-light dark:bg-dark--theme-light">
					{selectedRole
						? selectedRole.name
						: trans.pages.permissions.SELECT_ROLES}
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
						{({ close }) => (
							<Card
								shadow="custom"
								className="md:px-4 py-4 rounded-x md:min-w-[14.125rem] max-h-72 overflow-auto"
								style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
							>
								{/* Search */}
								<div className="flex items-center justify-between w-full">
									<InputField
										type="text"
										placeholder={trans.common.SEARCH}
										className="mb-0 h-11"
										wrapperClassName={'mb-0'}
										onChange={(e: ChangeEvent<HTMLInputElement>) => {
											setFilterValue(e.target.value);
										}}
										onKeyUp={handleOnKeyUp}
									/>
								</div>

								{rolesList.map((role) => (
									<div
										className="flex justify-between w-full py-3"
										key={role.name}
									>
										<div className="max-w-[90%]">
											{editRole && editRole.id === role.id ? (
												<InputField
													type="text"
													placeholder={'Enter Role Name'}
													className="w-full mb-0 h-5 border-none pl-0 py-0 rounded-none border-b-1"
													noWrapper
													autoFocus
													defaultValue={role.name}
													onBlur={handleEditRole}
													onChange={handleEditChange}
													onKeyUp={handleEditOnKeyUp}
												/>
											) : (
												<PermissonItem
													title={role.name.toLowerCase()}
													className={clsxm(['font-medium'])}
													onClick={() => {
														setSelectedRole(role);
														close();
													}}
												/>
											)}
										</div>

										<div className="flex justify-end gap-1">
											<span
												onClick={() => {
													handleEdit(role);
												}}
											>
												<Edit2Icon className="cursor-pointer stroke-[#888F97]" />
											</span>

											<span
												onClick={() => {
													role.id && deleteRole(role.id);
												}}
											>
												<TrashIcon className="cursor-pointer" />
											</span>
										</div>
									</div>
								))}

								<Button
									className="w-full text-xs mt-3 dark:text-white dark:border-white rounded-xl"
									variant="outline"
									onClick={handleCreateRole}
									disabled={createRoleLoading || !filterValue.length}
									loading={createRoleLoading}
								>
									<PlusIcon className="w-[16px] h-[16px]" />
									{trans.common.CREATE}
									{!rolesList.length ? ` "${filterValue}"` : ''}
								</Button>
							</Card>
						)}
					</Popover.Panel>
				</Transition>
			</Popover>
		</>
	);
};
