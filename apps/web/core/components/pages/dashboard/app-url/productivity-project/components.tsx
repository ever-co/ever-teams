import { format, parseISO } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { TableCell, TableRow } from '@/core/components/common/table';
import { cn } from '@/core/lib/helpers';
import {
	ActivityRowProps,
	DateHeaderRowProps,
	DateSummaryRowProps,
	ProgressBarProps,
	ProjectHeaderRowProps
} from '@/core/types/interfaces/activity/productivity-project';
import { useTranslations } from 'next-intl';

function initialsOf(fullName: string | undefined) {
	const words = (fullName ?? '').split(' ');
	const firstLetters = words.map((word) => word[0] ?? '');
	return firstLetters.join('').toUpperCase();
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage, className }) => (
	<div className={cn('flex gap-2 items-center', className)}>
		<div className="w-full h-1.5 overflow-hidden rounded-full bg-foreground/10">
			<div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
		</div>
		<span className="w-10 text-right tabular-nums text-muted-foreground">{Math.round(percentage)}%</span>
	</div>
);

export const ActivityRow: React.FC<ActivityRowProps> = ({ employee, activity }) =>
	employee && (
		<TableRow>
			<TableCell></TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Avatar className="w-8 h-8">
						{employee.user?.imageUrl && (
							<AvatarImage src={employee.user.imageUrl} alt={employee.fullName} />
						)}
						<AvatarFallback>{initialsOf(employee?.fullName)}</AvatarFallback>
					</Avatar>
					<span className="text-foreground">{employee.fullName}</span>
				</div>
			</TableCell>
			<TableCell className="text-muted-foreground">{activity.title}</TableCell>
			<TableCell className="tabular-nums text-foreground">
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
		<TableRow className="hairline-t border-border bg-foreground/2.5 font-medium hover:bg-foreground/2.5">
			<TableCell></TableCell>
			<TableCell colSpan={2} className="text-sm text-muted-foreground">
				Total for {format(parseISO(date), 'MMM dd')}
			</TableCell>
			<TableCell className="font-semibold tabular-nums text-foreground">
				{formatDuration(totalDuration.toString())}
			</TableCell>
			<TableCell>
				<ProgressBar percentage={totalPercentage} className="text-foreground" />
			</TableCell>
		</TableRow>
	);
};

export const ProjectHeaderRow: React.FC<ProjectHeaderRowProps> = ({ projectName }) => (
	<TableRow className="bg-foreground/2.5 hover:bg-foreground/2.5">
		<TableCell colSpan={5} className="py-2">
			<div className="flex items-center gap-2">
				<Avatar className="w-6 h-6">
					<AvatarImage src="/ever-teams-logo.svg" alt={projectName} />
					<AvatarFallback>
						{projectName
							.split(' ')
							.map((n) => n[0])
							.join('')}
					</AvatarFallback>
				</Avatar>
				<span className="font-medium text-foreground">{projectName}</span>
			</div>
		</TableCell>
	</TableRow>
);

export const DateHeaderRow: React.FC<DateHeaderRowProps> = ({ date, activities }) => {
	const t = useTranslations();

	return (
		<TableRow className="hover:bg-transparent">
			<TableCell className="text-sm font-medium text-foreground">
				{format(parseISO(date), 'EEEE dd MMM yyyy')}
			</TableCell>
			<TableCell colSpan={4}>
				<div className="flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
					{activities.length} {t('common.ACTIVITIES')} •{' '}
					{Array.from(new Set(activities.map((a) => a.employee.id))).length} {t('common.MEMBERS')}
				</div>
			</TableCell>
		</TableRow>
	);
};

const formatDuration = (seconds: number | string): string => {
	let totalSeconds: number;

	if (typeof seconds === 'string') {
		totalSeconds = parseInt(seconds);
	} else {
		totalSeconds = seconds;
	}

	if (isNaN(totalSeconds) || totalSeconds < 0) {
		console.warn('Invalid time value:', seconds);
		return '00:00:00';
	}

	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const remainingSeconds = totalSeconds % 60;

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};
