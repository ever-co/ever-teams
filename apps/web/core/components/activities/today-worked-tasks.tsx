import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTodayWorkedTime } from '@/core/hooks/activities/use-today-worked-time';
import { secondsToTime } from '@/core/lib/helpers/date-and-time';
import { TTaskStatistic } from '@/core/types/schemas/activities/statistics.schema';
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow
} from '@/core/components/common/table';

/**
 * Today's worked time of a team member, task by task, read from the member's
 * `totalTodayTasks` so the footer matches the total shown on the card.
 */
export function TodayWorkedTasks({ memberId }: { memberId: string }) {
	const t = useTranslations();
	const { hours, minutes, totalSeconds, currentMember } = useTodayWorkedTime({ id: memberId });

	const tasks = useMemo<TTaskStatistic[]>(
		() => [...(currentMember?.totalTodayTasks ?? [])].sort((a, b) => (b.duration || 0) - (a.duration || 0)),
		[currentMember?.totalTodayTasks]
	);

	if (tasks.length === 0) {
		return null;
	}

	return (
		<Table className="mb-6">
			<TableHeader>
				<TableRow>
					<TableHead className="px-3 h-9">{t('common.TASK')}</TableHead>
					<TableHead className="px-3 h-9 text-right">{t('common.DURATION')}</TableHead>
					<TableHead className="px-3 h-9 text-right">%</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{tasks.map((task) => {
					const duration = task.duration || 0;
					const { hours: h, minutes: m } = secondsToTime(duration);

					return (
						<TableRow key={task.id}>
							<TableCell className="px-3 py-2 break-words">{task.title}</TableCell>
							<TableCell className="px-3 py-2 text-right whitespace-nowrap">
								{h}h : {m}m
							</TableCell>
							<TableCell className="px-3 py-2 text-right whitespace-nowrap">
								{totalSeconds ? Math.round((duration / totalSeconds) * 100) : 0}%
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell className="px-3 py-2">{t('common.TOTAL_WORKED_TODAY')}</TableCell>
					<TableCell className="px-3 py-2 text-right whitespace-nowrap">
						{hours}h : {minutes}m
					</TableCell>
					<TableCell className="px-3 py-2" />
				</TableRow>
			</TableFooter>
		</Table>
	);
}
