import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/ui/avatar';
import { TableCell, TableRow } from '@/core/components/ui/table';
import { cn } from '@/core/lib/helpers';
import {
	ActivityRowProps,
	DateHeaderRowProps,
	DateSummaryRowProps,
	ProjectHeaderRowProps,
	ProgressBarProps
} from './types';
import { formatDuration } from './utils';

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, className }) => (
	<div className={cn('flex gap-2 items-center', className)}>
		<div className="overflow-hidden w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
			<div className="h-full bg-blue-500" style={{ width: `${percentage}%` }} />
		</div>
		<span className="text-gray-600 dark:text-gray-300">{Math.round(percentage)}%</span>
	</div>
);

export const ActivityRow: React.FC<ActivityRowProps> = ({ employee, activity }) => (
	<TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800">
		<TableCell></TableCell>
		<TableCell>
			<div className="flex gap-2 items-center">
				<Avatar className="w-8 h-8">
					{employee.user?.imageUrl && <AvatarImage src={employee.user.imageUrl} alt={employee.fullName} />}
					<AvatarFallback>
						{employee.fullName
							.split(' ')
							.map((n: string) => n[0])
							.join('')
							.toUpperCase()}
					</AvatarFallback>
				</Avatar>
				<span className="text-gray-700 dark:text-gray-300">{employee.fullName}</span>
			</div>
		</TableCell>
		<TableCell className="text-gray-600 dark:text-gray-400">{activity.title}</TableCell>
		<TableCell className="text-gray-600 dark:text-gray-400">
			{formatDuration(activity.duration.toString())}
		</TableCell>
		<TableCell>
			<ProgressBar percentage={parseFloat(activity.duration_percentage)} />
		</TableCell>
	</TableRow>
);

export const DateSummaryRow: React.FC<DateSummaryRowProps> = ({ date, activities }) => {
	const totalDuration = activities.reduce((sum, { activity }) => sum + (activity.duration as number), 0);
	const totalPercentage = activities.reduce((sum, { activity }) => sum + parseFloat(activity.duration_percentage), 0);

	return (
		<TableRow className="bg-gray-800 border-t border-gray-200 dark:bg-dark--theme-light">
			<TableCell></TableCell>
			<TableCell colSpan={2} className="text-sm text-gray-500 dark:text-gray-400">
				Total for {format(new Date(date), 'MMM dd')}
			</TableCell>
			<TableCell className="text-gray-600 dark:text-gray-300">
				{formatDuration(totalDuration.toString())}
			</TableCell>
			<TableCell>
				<ProgressBar percentage={totalPercentage} className="text-gray-600 dark:text-gray-300" />
			</TableCell>
		</TableRow>
	);
};

export const ProjectHeaderRow: React.FC<ProjectHeaderRowProps> = ({ projectName }) => (
	<TableRow className="bg-gray-50/50 dark:bg-gray-800">
		<TableCell colSpan={5} className="py-2">
			<div className="flex gap-2 items-center">
				<Avatar className="w-6 h-6">
					<AvatarImage src="/ever-teams-logo.svg" alt={projectName} />
					<AvatarFallback>
						{projectName
							.split(' ')
							.map((n) => n[0])
							.join('')}
					</AvatarFallback>
				</Avatar>
				<span className="font-medium text-gray-800 dark:text-gray-300">{projectName}</span>
			</div>
		</TableCell>
	</TableRow>
);

export const DateHeaderRow: React.FC<DateHeaderRowProps> = ({ date, activities }) => (
	<TableRow className="bg-gray-50/30 dark:bg-gray-800">
		<TableCell className="text-gray-700 dark:text-gray-300">{format(new Date(date), 'EEEE dd MMM yyyy')}</TableCell>
		<TableCell colSpan={4}>
			<div className="flex gap-2 items-center text-sm text-gray-500 dark:text-gray-400">
				{activities.length} activities • {Array.from(new Set(activities.map((a) => a.employee.id))).length}{' '}
				members
			</div>
		</TableCell>
	</TableRow>
);
