import { cn } from '@/lib/utils';
import { Checkbox } from '@components/ui/checkbox';
import Image from 'next/image';
import { ProjectTableDataType } from './data-table';
import { CalendarDays, Ellipsis } from 'lucide-react';
import { useTaskStatus } from '@/app/hooks';
import { useMemo } from 'react';
import moment from 'moment';
import AvatarStack from '@components/shared/avatar-stack';
import { useTranslations } from 'next-intl';

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
			data?.members?.map((el) => ({
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
					<Ellipsis size={20} />
				</div>

				<div className="w-full items-center flex gap-6">
					<p className=" font-medium">{t('common.STATUS')}</p>
					<div style={{ backgroundColor: statusColorsMap.get(data?.status) }} className="rounded px-4 py-1">
						{data?.status ?? '-'}
					</div>
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
						<div>{managers?.length > 0 ? <AvatarStack maxVisible={2} avatars={members} /> : '-'}</div>
					</div>
				</div>
			</div>
		</div>
	);
}
