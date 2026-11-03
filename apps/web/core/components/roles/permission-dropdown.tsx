import { clsxm } from '@/core/lib/utils';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { Button } from '@/core/components';
import { ChevronDown, Pencil, Plus, Trash } from '@/core/components/icons';
import { controlRecipe } from '@/core/components/common/input';
import { ChangeEvent, Dispatch, KeyboardEvent, SetStateAction, useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRolesQuery } from '@/core/hooks/roles/use-roles-query';
import { useRolesMutations } from '@/core/hooks/roles/use-roles-mutations';
import { PermissonItem } from './permission-item';
import { EverCard } from '../common/ever-card';
import { InputField } from '../duplicated-components/_input';
import { TRole } from '@/core/types/schemas';

const TRIGGER_CLASS = clsxm(
	controlRecipe,
	'flex h-9 items-center justify-between gap-2 px-2.5 text-muted-foreground md:min-w-[10.75rem]'
);

export const PermissionDropDown = ({
	selectedRole,
	setSelectedRole
}: {
	selectedRole: TRole | null;
	setSelectedRole: Dispatch<SetStateAction<TRole | null>>;
}) => {
	const { roles } = useRolesQuery();
	const { createRole, createRoleLoading, deleteRole, updateRole } = useRolesMutations();
	const [filterValue, setFilterValue] = useState<string>('');

	const [editRole, setEditRole] = useState<TRole | null>(null);
	const handleEdit = (role: TRole) => {
		setEditRole(role);
	};

	// CREATE
	const handleCreateRole = useCallback(async () => {
		if (filterValue.length) {
			await createRole({
				name: filterValue
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
				id: editRole?.id ?? ''
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
			await deleteRole(roleId);
		},
		[deleteRole]
	);

	return (
		<>
			<Popover className="relative">
				<PopoverButton className={TRIGGER_CLASS}>
					{selectedRole ? selectedRole.name : t('pages.permissions.SELECT_ROLES')}
					<ChevronDown className="size-4 shrink-0" />
				</PopoverButton>

				<Transition
					as="div"
					enter="transition duration-150 ease-out"
					enterFrom="transform scale-95 opacity-0"
					enterTo="transform scale-100 opacity-100"
					leave="transition duration-150 ease-out"
					leaveFrom="transform scale-100 opacity-100"
					leaveTo="transform scale-95 opacity-0"
				>
					<PopoverPanel className="absolute z-12 mt-1 w-full">
						{({ close }) => (
							<EverCard
								shadow="bigger"
								className="max-h-72 overflow-auto py-2 md:min-w-[14.125rem] md:px-3"
							>
								{/* Search */}
								<div className="flex justify-between items-center w-full">
									<InputField
										type="text"
										placeholder={t('common.SEARCH')}
										className="mb-0 h-8"
										wrapperClassName={'mb-0'}
										onChange={(e: ChangeEvent<HTMLInputElement>) => {
											setFilterValue(e.target.value);
										}}
										onKeyUp={handleOnKeyUp}
									/>
								</div>

								{rolesList.map((role) => (
									<div
										className="flex w-full items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5"
										key={role.name}
									>
										<div className="max-w-[90%]">
											{editRole && editRole.id === role.id ? (
												<InputField
													type="text"
													placeholder={'Enter Role Name'}
													className="py-0 pl-0 mb-0 w-full h-5 rounded-none border-none border-b-1"
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

										<div className="flex gap-1 justify-end">
											<span
												onClick={() => {
													handleEdit(role);
												}}
											>
												<Pencil className="size-4 cursor-pointer text-muted-foreground hover:text-foreground" />
											</span>

											<span
												onClick={() => {
													role.id && handleDeleteRole(role.id);
												}}
											>
												<Trash className="size-4 cursor-pointer text-muted-foreground hover:text-destructive-ink" />
											</span>
										</div>
									</div>
								))}

								<Button
									className="mt-3 w-full"
									variant="outline"
									size="default"
									onClick={handleCreateRole}
									disabled={createRoleLoading || !filterValue.length}
									loading={createRoleLoading}
								>
									<Plus className="size-4" />
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
