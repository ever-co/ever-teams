import { cn } from '@/core/lib/helpers';
import { Checkbox } from '@/core/components/common/checkbox';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo } from 'react';
import moment from 'moment';
import AvatarStack from '@/core/components/common/avatar-stack';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { Button } from '@/core/components';
import { Calendar, RotateLeft } from '@/core/components/icons';
import { ProjectItemActions, ProjectStatusChip, ProjectViewDataType, projectStatusColor } from '..';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useProjectActionModal } from '@/core/hooks/use-project-action-modal';

interface IGridItemProps {
	data: ProjectViewDataType;
	isSelected: boolean;
	onSelect?: (projectId: string) => void;
}

export default function GridItem(props: IGridItemProps) {
	const { data, isSelected, onSelect } = props;
	const { openRestoreModal } = useProjectActionModal();

	const { taskStatuses } = useTaskStatusesQuery();

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
				'w-full rounded-xl bg-card hairline-ring ring-border shadow-sm shadow-black/6.5',
				isSelected && 'ring-primary/40'
			)}
		>
			<div className="flex w-full shrink-0 gap-3 p-4">
				<Checkbox onCheckedChange={handleSelect} checked={isSelected} className="mt-2 shrink-0" />
				<div className="flex h-full min-w-0 grow flex-col gap-4">
					<div className="flex w-full items-start justify-between gap-2">
						<Link
							href={`/projects/${data?.project?.id}`}
							className="group flex min-w-0 items-center gap-2.5 rounded-md font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							<div
								style={{ backgroundColor: data?.project?.color ?? undefined }}
								className="flex size-8 flex-none items-center justify-center overflow-hidden rounded-md text-xs font-medium hairline-ring ring-border"
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
							<p className="line-clamp-2 text-sm font-medium transition-colors group-hover:text-primary-ink">
								{data?.project?.name}
							</p>
						</Link>
						{data?.isArchived ? (
							<Button
								onClick={() => openRestoreModal(data.project.id)}
								variant="outline"
								size="default"
								className="shrink-0"
							>
								<RotateLeft />
								<span>{t('common.RESTORE')}</span>
							</Button>
						) : (
							<ProjectItemActions item={data} />
						)}
					</div>

					{!data?.isArchived && (
						<div className="flex w-full items-center gap-2">
							<p className="text-xs text-muted-foreground">{t('common.STATUS')}</p>
							{data?.status ? (
								<ProjectStatusChip
									color={projectStatusColor(resolvedTheme, statusColorsMap.get(data?.status))}
								>
									{data?.status}
								</ProjectStatusChip>
							) : (
								<span className="text-sm text-muted-foreground">-</span>
							)}
						</div>
					)}

					<div className="grid w-full grid-cols-2 gap-4">
						<div className="flex flex-col gap-1">
							<p className="text-xs text-muted-foreground">{t('common.START_DATE')}</p>
							<div className="flex items-center gap-1.5 text-sm tabular-nums">
								{data?.startDate ? (
									<>
										<Calendar className="size-3.5 text-muted-foreground" />
										<p>{moment(data?.startDate).format('D.MM.YYYY')}</p>
									</>
								) : (
									<span className="text-sm text-muted-foreground">-</span>
								)}
							</div>
						</div>

						<div className="flex flex-col gap-1">
							<p className="text-xs text-muted-foreground">{t('common.END_DATE')}</p>
							<div className="flex items-center gap-1.5 text-sm tabular-nums">
								{data?.endDate ? (
									<>
										<Calendar className="size-3.5 text-muted-foreground" />
										<p>{moment(data?.endDate).format('D.MM.YYYY')}</p>
									</>
								) : (
									<span className="text-sm text-muted-foreground">-</span>
								)}
							</div>
						</div>
					</div>

					<div className="grid w-full grid-cols-3 gap-4 hairline-t border-dashed border-border pt-4">
						<div className="flex min-w-0 flex-col gap-1.5">
							<p className="text-xs text-muted-foreground">{t('common.MEMBERS')}</p>
							<div>
								{members?.length > 0 ? (
									<AvatarStack maxVisible={3} avatars={members} />
								) : (
									<span className="text-sm text-muted-foreground">-</span>
								)}
							</div>
						</div>

						<div className="flex min-w-0 flex-col gap-1.5">
							<p className="text-xs text-muted-foreground">{t('common.TEAMS')}</p>
							<div>
								{teams?.length > 0 ? (
									<AvatarStack maxVisible={2} avatars={teams} />
								) : (
									<span className="text-sm text-muted-foreground">-</span>
								)}
							</div>
						</div>

						<div className="flex min-w-0 flex-col gap-1.5">
							<p className="text-xs text-muted-foreground">{t('common.MANAGERS')}</p>
							<div>
								{managers?.length > 0 ? (
									<AvatarStack maxVisible={2} avatars={managers} />
								) : (
									<span className="text-sm text-muted-foreground">-</span>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
