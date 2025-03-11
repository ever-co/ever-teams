import { cn } from '@/lib/utils';
import { Checkbox } from '@components/ui/checkbox';
import Image from 'next/image';
import { ProjectTableDataType } from './data-table';
import { Archive, CalendarDays, Ellipsis, Eye, Pencil, Trash } from 'lucide-react';
import { useModal, useTaskStatus } from '@/app/hooks';
import { Fragment, useMemo } from 'react';
import moment from 'moment';
import AvatarStack from '@components/shared/avatar-stack';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Menu, Transition } from '@headlessui/react';
import { HorizontalSeparator } from '@/lib/components';
import { DeleteProjectConfirmModal } from '@/lib/features/project/delete-project-modal';
import AddOrEditProjectModal from '@/lib/features/project/add-or-edit-project';
import { ArchiveProjectModal } from '@/lib/features/project/archive-project-modal';

interface IGridItemProps {
	data: ProjectTableDataType;
}

export default function GridItem(props: IGridItemProps) {
	const { data } = props;

	const { taskStatus } = useTaskStatus();

	const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
		return new Map(taskStatus.map((status) => [status.name, status.color]));
	}, [taskStatus]);

	const members = useMemo(
		() =>
			data?.members
				?.filter((el) => !el.isManager)
				?.map((el) => ({
					imageUrl: el?.employee?.user?.imageUrl,
					name: el?.employee?.fullName
				})) || [],
		[data?.members]
	);

	const managers = useMemo(
		() =>
			data?.members
				?.filter((el) => el.isManager)
				?.map((el) => ({
					imageUrl: el?.employee?.user?.imageUrl,
					name: el?.employee?.fullName
				})) || [],
		[data?.members]
	);

	const teams = useMemo(
		() =>
			data?.teams?.map((el) => ({
				name: el?.name
			})) || [],
		[data?.teams]
	);

	const t = useTranslations();
	const { resolvedTheme } = useTheme();

	return (
		<div className="w-[24rem] shrink-0 border rounded-xl p-4 gap-4 flex">
			<Checkbox className=" shrink-0" />
			<div className=" h-full flex flex-col gap-8 grow">
				<div className="w-full gap-4 flex items-center justify-between">
					<div className="flex items-center font-medium gap-2">
						<div
							style={{ backgroundColor: data?.project?.color }}
							className={cn(
								'w-10 h-10  border overflow-hidden flex items-center justify-center rounded-xl'
							)}
						>
							{!data?.project?.imageUrl ? (
								data?.project?.name?.substring(0, 2)
							) : (
								<Image
									alt={data?.project?.name ?? ''}
									height={40}
									width={40}
									className="w-full h-full"
									src={data?.project?.imageUrl}
								/>
							)}
						</div>
						<p>{data?.project?.name}</p>
					</div>
					<ProjectItemActions item={data} />
				</div>

				<div className="w-full items-center flex gap-6">
					<p className=" font-medium">{t('common.STATUS')}</p>
					{data?.status ? (
						<div
							style={{
								backgroundColor:
									resolvedTheme == 'light'
										? statusColorsMap.get(data?.status) ?? 'transparent'
										: '#6A7280'
							}}
							className="rounded px-4 py-1"
						>
							{data?.status}
						</div>
					) : (
						'-'
					)}
				</div>

				<div className="w-full flex items-center gap-10">
					<div className="flex flex-col gap-2">
						<p className="font-medium">{t('common.START_DATE')}</p>
						<div className="flex items-center gap-1">
							{data?.startDate ? (
								<>
									<CalendarDays size={15} className=" text-slate-400" />
									<p>{moment(data?.startDate).format('D.MM.YYYY')}</p>
								</>
							) : (
								'-'
							)}
						</div>
					</div>

					<div className="flex flex-col gap-2">
						<p className="font-medium">{t('common.END_DATE')}</p>
						<div className="flex items-center gap-1">
							{data?.endDate ? (
								<>
									<CalendarDays size={15} className=" text-slate-400" />
									<p>{moment(data?.endDate).format('D.MM.YYYY')}</p>
								</>
							) : (
								'-'
							)}
						</div>
					</div>
				</div>

				<div className="w-full flex items-center justify-between">
					<div className="w-full flex flex-col gap-2">
						<p className="font-medium">{t('common.MEMBERS')}</p>
						<div>{members?.length > 0 ? <AvatarStack maxVisible={3} avatars={members} /> : '-'}</div>
					</div>

					<div className="w-full flex flex-col gap-2">
						<p className="font-medium">{t('common.TEAMS')}</p>
						<div>{teams?.length > 0 ? <AvatarStack maxVisible={2} avatars={teams} /> : '-'}</div>
					</div>

					<div className="w-full flex flex-col gap-2">
						<p className="font-medium">{t('common.MANAGERS')}</p>
						<div>{managers?.length > 0 ? <AvatarStack maxVisible={2} avatars={managers} /> : '-'}</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export function ProjectItemActions({ item }: { item: ProjectTableDataType }) {
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
