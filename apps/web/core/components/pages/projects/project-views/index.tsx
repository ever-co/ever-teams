import { Menu, Transition } from '@headlessui/react';
import { Archive, Ellipsis, Eye, Pencil, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { HorizontalSeparator } from '@/core/components/duplicated-components/separator';
import { TOrganizationProject } from '@/core/types/schemas';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';

export type ProjectViewDataType = {
	project: {
		id: string;
		name: TOrganizationProject['name'];
		imageUrl: TOrganizationProject['imageUrl'];
		color: TOrganizationProject['color'];
	};
	status: TOrganizationProject['status'];
	archivedAt: TOrganizationProject['archivedAt'];
	isArchived: TOrganizationProject['isArchived'];
	startDate: TOrganizationProject['startDate'];
	endDate: TOrganizationProject['endDate'];
	createdAt: TOrganizationProject['createdAt'];
	members: TOrganizationProject['members'];
	managers: TOrganizationProject['members'];
	teams: TOrganizationProject['teams'];
};

/**
 * Project item actions menu (Edit, Archive, Delete)
 *
 * Uses the global modal pattern to avoid rendering N modals for N items,
 * which was causing "Maximum update depth exceeded" errors.
 *
 * Permissions:
 * - View Info: Available to all users
 * - Edit/Archive/Delete: Only for Admins or Project Managers
 *
 */
export function ProjectItemActions({ item }: { item: ProjectViewDataType }) {
	const { openEditModal, openArchiveModal, openDeleteModal, openViewInfoModal } = useProjectActionModal();
	const t = useTranslations();
	const { canEdit, canArchive, canDelete } = useProjectPermissions({ members: item.members });

	const showSeparator = canDelete && (canEdit || canArchive);

	return (
		<Menu as="div" className="inline-block relative text-left">
			<div>
				<Menu.Button>
					<Ellipsis />
				</Menu.Button>
			</div>
			<Transition
				as="div"
				enter="transition ease-out duration-100"
				enterFrom="transform opacity-0 scale-95"
				enterTo="transform opacity-100 scale-100"
				leave="transition ease-in duration-75"
				leaveFrom="transform opacity-100 scale-100"
				leaveTo="transform opacity-0 scale-95"
			>
				<Menu.Items className="absolute z-[999] right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none">
					<div className="flex flex-col gap-1 p-1">
						{/* View Info - Available to all users */}
						<Menu.Item>
							{({ active }) => (
								<button
									onClick={() => openViewInfoModal(item.project.id)}
									className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
								>
									<Eye size={15} /> <span>{t('common.VIEW_INFO')}</span>
								</button>
							)}
						</Menu.Item>

						{/* Edit - Only for Admins or Project Managers */}
						{canEdit && (
							<Menu.Item>
								{({ active }) => (
									<button
										onClick={() => openEditModal(item.project.id)}
										className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Pencil size={15} /> <span>{t('common.EDIT')}</span>
									</button>
								)}
							</Menu.Item>
						)}

						{/* Archive - Only for Admins or Project Managers */}
						{canArchive && (
							<Menu.Item>
								{({ active }) => (
									<button
										onClick={() => openArchiveModal(item.project.id)}
										className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Archive size={15} /> <span>{t('common.ARCHIVE')}</span>
									</button>
								)}
							</Menu.Item>
						)}

						{/* Separator - Only show if delete is available */}
						{showSeparator && <HorizontalSeparator />}

						{/* Delete - Only for Admins or Project Managers */}
						{canDelete && (
							<Menu.Item>
								{({ active }) => (
									<button
										onClick={() => openDeleteModal(item.project.id)}
										className={`${active && 'bg-red-400/10'} gap-2 text-red-600 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Trash size={15} /> <span>{t('common.DELETE')}</span>
									</button>
								)}
							</Menu.Item>
						)}
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	);
}
