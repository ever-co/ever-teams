import { IRole } from '@/core/types/interfaces/role/role';
import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { Button } from '@/core/components';
import { EditPenUnderlineIcon, TrashIcon } from 'assets/svg';
import { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from 'assets/svg';
import { useRoles } from '@/core/hooks/roles';
import { PermissonItem } from './permission-item';
import { EverCard } from '../common/ever-card';
import { InputField } from '../duplicated-components/_input';

export const PermissionDropDown = ({
	selectedRole,
	setSelectedRole
}: {
	selectedRole: IRole | null;
	setSelectedRole: Dispatch<SetStateAction<IRole | null>>;
}) => {
	const { roles, createRole, createRoleLoading, deleteRole, updateRole, setRoles } = useRoles();
	const [filterValue, setFilterValue] = useState<string>('');

	const [editRole, setEditRole] = useState<IRole | null>(null);
	const handleEdit = (role: IRole) => {
		setEditRole(role);
	};

	// CREATE
	const handleCreateRole = useCallback(async () => {
		if (filterValue.length) {
			const res = await createRole({
				name: filterValue
			});

			if (res) {
				// Update roles state
				setRoles([...roles, res.data]);
			}

			setFilterValue('');
		}
	}, [filterValue, createRole, setRoles, roles]);
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
				id: editRole?.id ?? ''
			});
		},
		[editRole]
	);
	const handleEditRole = useCallback(async () => {
		if (editRole) {
			const res = await updateRole(editRole);

			if (res) {
				setRoles((prev) => {
					return prev.map((role) => {
						if (role.id === editRole.id) {
							return res.data;
						}
						return role;
					});
				});
			}
			setEditRole(null);
		}
	}, [editRole, setRoles, updateRole]);

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
							name: role.name.split('_').join(' ')
						}))
						.filter((role) => role.name.toLowerCase().includes(filterValue.toLowerCase()))
				: roles.map((role) => ({
						...role,
						name: role.name.split('_').join(' ')
					})),
		[roles, filterValue]
	);

	const t = useTranslations();

	const handleDeleteRole = useCallback(
		async (roleId: string) => {
			const res = await deleteRole(roleId);

			if (res) {
				// Update roles state
				setRoles((prev) => {
					return prev.filter((role) => role.id !== roleId);
				});
			}
		},
		[deleteRole, setRoles]
	);

	return (
		<>
			<Popover className="relative bg-light--theme-light dark:bg-dark--theme-light">
				<PopoverButton className="md:min-w-[10.75rem] flex justify-between items-center px-4 py-3 text-sm border text-[#B1AEBC] outline-none rounded-xl bg-light--theme-light dark:bg-dark--theme-light">
					{selectedRole ? selectedRole.name : t('pages.permissions.SELECT_ROLES')}
					<ChevronDownIcon />
				</PopoverButton>

				<Transition
					as="div"
					enter="transition duration-100 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-75 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<PopoverPanel className="absolute w-full z-12 rounded-xl bg-light--theme-light dark:bg-dark--theme-light">
						{({ close }) => (
							<EverCard
								shadow="custom"
								className="md:px-4 py-4 rounded-x md:min-w-[14.125rem] max-h-72 overflow-auto"
								style={{ boxShadow: '0px 14px 39px rgba(0, 0, 0, 0.12)' }}
							>
								{/* Search */}
								<div className="flex items-center justify-between w-full">
									<InputField
										type="text"
										placeholder={t('common.SEARCH')}
										className="mb-0 h-11"
										wrapperClassName={'mb-0'}
										onChange={(e: ChangeEvent<HTMLInputElement>) => {
											setFilterValue(e.target.value);
										}}
										onKeyUp={handleOnKeyUp}
									/>
								</div>

								{rolesList.map((role) => (
									<div className="flex justify-between w-full py-3" key={role.name}>
										<div className="max-w-[90%]">
											{editRole && editRole.id === role.id ? (
												<InputField
													type="text"
													placeholder={'Enter Role Name'}
													className="w-full h-5 py-0 pl-0 mb-0 border-none rounded-none border-b-1"
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
												<EditPenUnderlineIcon className="w-6 h-6 cursor-pointer text-[#888F97]" />
											</span>

											<span
												onClick={() => {
													role.id && handleDeleteRole(role.id);
												}}
											>
												<TrashIcon className="cursor-pointer w-3.5" />
											</span>
										</div>
									</div>
								))}

								<Button
									className="w-full mt-3 text-xs dark:text-white dark:border-white rounded-xl"
									variant="outline"
									onClick={handleCreateRole}
									disabled={createRoleLoading || !filterValue.length}
									loading={createRoleLoading}
								>
									<PlusIcon className="w-[16px] h-[16px]" />
									{t('common.CREATE')}
									{!rolesList.length ? ` "${filterValue}"` : ''}
								</Button>
							</EverCard>
						)}
					</PopoverPanel>
				</Transition>
			</Popover>
		</>
	);
};
