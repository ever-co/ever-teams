import { cn } from '@/lib/utils';
import { Checkbox } from '@components/ui/checkbox';
import Image from 'next/image';
import { CalendarDays, RotateCcw } from 'lucide-react';
import { useModal, useTaskStatus } from '@/app/hooks';
import { useCallback, useMemo } from 'react';
import moment from 'moment';
import AvatarStack from '@components/shared/avatar-stack';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { RestoreProjectModal } from '@/lib/features/project/restore-project-modal';
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
		<>
			<div className="w-[24rem] shrink-0 border rounded-xl p-4 gap-4 flex">
				<Checkbox onCheckedChange={handleSelect} checked={isSelected} className=" shrink-0" />
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
						{data?.isArchived ? (
							<button
								onClick={openRestoreProjectModal}
								className={` bg-[#E2E8F0] text-[#3E1DAD] gap-2 group flex items-center rounded-md px-2 py-2 text-xs`}
							>
								<RotateCcw size={15} /> <span>{t('common.RESTORE')}</span>
							</button>
						) : (
							<ProjectItemActions item={data} />
						)}
					</div>

					{!data?.isArchived ? (
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
					) : (
						<div className="flex flex-col gap-2">
							<p className="font-medium">{t('common.ARCHIVE_AT')}</p>
							<div className="flex items-center gap-1">
								{data?.archivedAt ? (
									<>
										<CalendarDays size={15} className=" text-slate-400" />
										<p>{moment(data?.archivedAt).format('D.MM.YYYY')}</p>
									</>
								) : (
									'-'
								)}
							</div>
						</div>
					)}

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
			<RestoreProjectModal
				projectId={data?.project.id}
				open={isRestoreProjectModalOpen}
				closeModal={closeRestoreProjectModal}
			/>
		</>
	);
}
