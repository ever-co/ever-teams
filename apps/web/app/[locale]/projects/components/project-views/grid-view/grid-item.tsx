import { cn } from '@/lib/utils';
import { Checkbox } from '@/core/components/ui/checkbox';
import Image from 'next/image';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { useModal, useTaskStatus } from '@/app/hooks';
import { useCallback, useMemo } from 'react';
import moment from 'moment';
import AvatarStack from '@/core/components/shared/avatar-stack';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { RestoreProjectModal } from '@/core/components/features/project/restore-project-modal';
import { ProjectItemActions, ProjectViewDataType } from '..';

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

	const statusColorsMap: Map<string | undefined, string | undefined> = useMemo(() => {
		return new Map(taskStatuses.map((status) => [status.name, status.color]));
	}, [taskStatuses]);

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

	const handleSelect = useCallback(() => {
		onSelect?.(data?.project?.id);
	}, [data?.project?.id, onSelect]);

	return (
		<div
			className={cn(
				'w-full bg-white dark:bg-dark--theme-light rounded-lg overflow-hidden border border-gray-200 dark:border-dark--theme-light',
				'hover:border-primary dark:hover:border-primary transition-colors duration-200'
			)}
		>
			<div className="w-full shrink-0 p-3 flex">
				<Checkbox onCheckedChange={handleSelect} checked={isSelected} className="shrink-0 mt-1" />
				<div className="h-full flex flex-col gap-6 grow ml-3">
					<div className="w-full flex items-center justify-between">
						<div className="flex items-center font-medium gap-2">
							<div
								style={{ backgroundColor: data?.project?.color }}
								className={cn(
									'w-9 h-9 border overflow-hidden flex items-center justify-center rounded-lg'
								)}
							>
								{!data?.project?.imageUrl ? (
									data?.project?.name?.substring(0, 2)
								) : (
									<Image
										alt={data?.project?.name ?? ''}
										height={36}
										width={36}
										className="w-full h-full object-cover"
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
						<div className="w-full items-center flex gap-4">
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

					<div className="w-full flex items-center gap-10">
						<div className="flex flex-col gap-2">
							<p className="text-sm font-medium">{t('common.START_DATE')}</p>
							<div className="flex items-center gap-1">
								{data?.startDate ? (
									<>
										<CalendarDays size={15} className=" text-slate-400" />
										<p>{moment(data?.startDate).format('D.MM.YYYY')}</p>
									</>
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<p className="text-sm font-medium">{t('common.END_DATE')}</p>
							<div className="flex items-center gap-1">
								{data?.endDate ? (
									<>
										<CalendarDays size={15} className=" text-slate-400" />
										<p>{moment(data?.endDate).format('D.MM.YYYY')}</p>
									</>
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>
					</div>

					<div className="w-full flex items-center justify-between">
						<div className="w-full flex flex-col gap-2">
							<p className="text-sm font-medium">{t('common.MEMBERS')}</p>
							<div>
								{members?.length > 0 ? (
									<AvatarStack maxVisible={3} avatars={members} />
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>

						<div className="w-full flex flex-col gap-2">
							<p className="text-sm font-medium">{t('common.TEAMS')}</p>
							<div>
								{teams?.length > 0 ? (
									<AvatarStack maxVisible={2} avatars={teams} />
								) : (
									<span className="text-sm text-gray-500">-</span>
								)}
							</div>
						</div>

						<div className="w-full flex flex-col gap-2">
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
