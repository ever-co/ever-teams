import { useModal } from '@/app/hooks';
import { IProject } from '@/app/interfaces';
import { HorizontalSeparator } from '@/lib/components';
import AddOrEditProjectModal from '@/lib/features/project/add-or-edit-project';
import { ArchiveProjectModal } from '@/lib/features/project/archive-project-modal';
import { DeleteProjectConfirmModal } from '@/lib/features/project/delete-project-modal';
import { Menu, Transition } from '@headlessui/react';
import { Archive, Ellipsis, Eye, Pencil, Trash } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';

export type ProjectViewDataType = {
	project: {
		id: string;
		name: IProject['name'];
		imageUrl: IProject['imageUrl'];
		color: IProject['color'];
	};
	status: IProject['status'];
	archivedAt: IProject['archivedAt'];
	isArchived: IProject['isArchived'];
	startDate: IProject['startDate'];
	endDate: IProject['endDate'];
	members: IProject['members'];
	managers: IProject['members'];
	teams: IProject['teams'];
};

export function ProjectItemActions({ item }: { item: ProjectViewDataType }) {
	const {
		openModal: openDeleteProjectModal,
		closeModal: closeDeleteProjectModal,
		isOpen: isDeleteProjectModalOpen
	} = useModal();
	const {
		openModal: openArchiveProjectModal,
		closeModal: closeArchiveProjectModal,
		isOpen: isArchiveProjectModalOpen
	} = useModal();
	const { isOpen: isProjectModalOpen, closeModal: closeProjectModal, openModal: openProjectModal } = useModal();

	const t = useTranslations();

	return (
		<>
			<Menu as="div" className="relative inline-block text-left">
				<div>
					<Menu.Button>
						<Ellipsis />
					</Menu.Button>
				</div>
				<Transition
					as={Fragment}
					enter="transition ease-out duration-100"
					enterFrom="transform opacity-0 scale-95"
					enterTo="transform opacity-100 scale-100"
					leave="transition ease-in duration-75"
					leaveFrom="transform opacity-100 scale-100"
					leaveTo="transform opacity-0 scale-95"
				>
					<Menu.Items className="absolute z-[999] right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white dark:bg-dark-lighter shadow-lg ring-1 ring-black/5 focus:outline-none">
						<div className="p-1 flex flex-col gap-1">
							<Menu.Item>
								{({ active }) => (
									<button
										className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Eye size={15} /> <span>{t('common.VIEW_INFO')}</span>
									</button>
								)}
							</Menu.Item>
							<Menu.Item>
								{({ active }) => (
									<button
										onClick={openProjectModal}
										className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Pencil size={15} /> <span>{t('common.EDIT')}</span>
									</button>
								)}
							</Menu.Item>
							<Menu.Item>
								{({ active }) => (
									<button
										onClick={openArchiveProjectModal}
										className={`${active && 'bg-primary/10'} gap-2 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Archive size={15} /> <span>{t('common.ARCHIVE')}</span>
									</button>
								)}
							</Menu.Item>
							<HorizontalSeparator />
							<Menu.Item>
								{({ active }) => (
									<button
										onClick={openDeleteProjectModal}
										className={`${active && 'bg-red-400/10'} gap-2 text-red-600 group flex w-full items-center rounded-md px-2 py-2 text-xs`}
									>
										<Trash size={15} /> <span>{t('common.DELETE')}</span>
									</button>
								)}
							</Menu.Item>
						</div>
					</Menu.Items>
				</Transition>
			</Menu>
			<DeleteProjectConfirmModal
				key={`${item.project.id}-delete-project`}
				projectId={item.project.id}
				open={isDeleteProjectModalOpen}
				closeModal={closeDeleteProjectModal}
			/>
			<AddOrEditProjectModal
				key={`${item.project.id}-add-or-edit-project`}
				projectId={item.project.id}
				mode="edit"
				closeModal={closeProjectModal}
				open={isProjectModalOpen}
			/>
			<ArchiveProjectModal
				key={`${item.project.id}-archive-project`}
				projectId={item.project.id}
				open={isArchiveProjectModalOpen}
				closeModal={closeArchiveProjectModal}
			/>
		</>
	);
}
