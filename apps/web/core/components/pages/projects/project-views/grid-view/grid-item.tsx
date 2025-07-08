import { cn } from '@/core/lib/helpers';
import { Checkbox } from '@/core/components/common/checkbox';
import Image from 'next/image';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { useModal, useTaskStatus } from '@/core/hooks';
import { useCallback, useMemo } from 'react';
import moment from 'moment';
import AvatarStack from '@/core/components/common/avatar-stack';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { ProjectItemActions, ProjectViewDataType } from '..';
import { RestoreProjectModal } from '@/core/components/features/projects/restore-project-modal';

interface IGridItemProps {
	data: ProjectViewDataType;
	isSelected: boolean;
	onSelect?: (projectId: string) => void;
}

export default function GridItem(props: IGridItemProps) {
	const { data, isSelected, onSelect } = props;
	const {
		openModal: openRestoreProjectModal,
		closeModal: closeRestoreProjectModal,
		isOpen: isRestoreProjectModalOpen
	} = useModal();
	const { taskStatuses } = useTaskStatus();

	const statusColorsMap: Map<string | undefined, string | undefined | null> = useMemo(() => {
		return new Map(taskStatuses.map((status) => [status.name, status.color]));
	}, [taskStatuses]);

	const members = useMemo(
		() =>
			data?.members
				?.filter((el) => !el.isManager)
				?.map((el) => ({
					imageUrl: el?.employee?.user?.imageUrl || '',
					name: el?.employee?.fullName || ''
				})) || [],
		[data?.members]
	);

	const managers = useMemo(
		() =>
			data?.members
				?.filter((el) => el.isManager)
				?.map((el) => ({
					imageUrl: el?.employee?.user?.imageUrl || '',
					name: el?.employee?.fullName || ''
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

	const handleSelect = useCallback(() => {
		onSelect?.(data?.project?.id);
	}, [data?.project?.id, onSelect]);

	return (
		<div
			className={cn(
				'overflow-hidden w-full bg-white rounded-lg border border-gray-200 dark:bg-dark--theme-light dark:border-dark--theme-light',
				'transition-colors duration-200 hover:border-primary dark:hover:border-primary'
			)}
		>
			<div className="flex p-3 w-full shrink-0">
				<Checkbox onCheckedChange={handleSelect} checked={isSelected} className="mt-1 shrink-0" />
				<div className="flex flex-col gap-6 ml-3 h-full grow">
					<div className="flex justify-between items-center w-full">
						<div className="flex gap-2 items-start font-medium">
							<div
								style={{ backgroundColor: data?.project?.color ?? undefined }}
								className={cn(
									'flex overflow-hidden flex-none justify-center items-center w-9 h-9 rounded-lg border'
								)}
							>
								{!data?.project?.imageUrl ? (
									data?.project?.name?.substring(0, 2)
								) : (
									<Image
										alt={data?.project?.name ?? ''}
										height={36}
										width={36}
										className="object-cover w-full h-full"
										src={data?.project?.imageUrl}
									/>
								)}
							</div>
							<p className="text-sm font-semibold">{data?.project?.name}</p>
						</div>
						{data?.isArchived ? (
							<button
								onClick={openRestoreProjectModal}
								className="bg-gray-100 hover:bg-gray-200 text-primary gap-1.5 group flex items-center rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
							>
								<RotateCcw size={14} />
								<span>{t('common.RESTORE')}</span>
							</button>
						) : (
							<ProjectItemActions item={data} />
						)}
					</div>

					{!data?.isArchived && (
						<div className="flex gap-4 items-center w-full">
							<p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('common.STATUS')}</p>
							{data?.status ? (
								<div
									style={{
										backgroundColor:
											resolvedTheme === 'light'
												? (statusColorsMap.get(data?.status) ?? 'transparent')
												: '#6A7280'
									}}
									className="rounded px-3 py-0.5 text-xs font-medium text-white"
								>
									{data?.status}
								</div>
							) : (
								<span className="text-sm text-gray-500">-</span>
							)}
						</div>
					)}

					<div className="flex gap-10 items-center w-full">
						<div className="flex flex-col gap-2">
							<p className="text-sm font-medium">{t('common.START_DATE')}</p>
							<div className="flex gap-1 items-center">
								{data?.startDate ? (
									<>
										<CalendarDays size={15} className="text-slate-400" />
										<p>{moment(data?.startDate).format('D.MM.YYYY')}</p>
									</>
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-sm font-medium">{t('common.END_DATE')}</p>
							<div className="flex gap-1 items-center">
								{data?.endDate ? (
									<>
										<CalendarDays size={15} className="text-slate-400" />
										<p>{moment(data?.endDate).format('D.MM.YYYY')}</p>
									</>
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>
					</div>

					<div className="flex justify-between items-center w-full">
						<div className="flex flex-col gap-2 w-full">
							<p className="text-sm font-medium">{t('common.MEMBERS')}</p>
							<div>
								{members?.length > 0 ? (
									<AvatarStack maxVisible={3} avatars={members} />
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-2 w-full">
							<p className="text-sm font-medium">{t('common.TEAMS')}</p>
							<div>
								{teams?.length > 0 ? (
									<AvatarStack maxVisible={2} avatars={teams} />
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-2 w-full">
							<p className="text-sm font-medium">{t('common.MANAGERS')}</p>
							<div>
								{managers?.length > 0 ? (
									<AvatarStack maxVisible={2} avatars={managers} />
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
			<RestoreProjectModal
				projectId={data?.project.id}
				open={isRestoreProjectModalOpen}
				closeModal={closeRestoreProjectModal}
			/>
		</div>
	);
}
