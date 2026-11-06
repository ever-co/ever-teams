import { Check } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';

interface ITaskFilter {
	type: 'open' | 'closed';
	count: number;
	selected: boolean;
	handleChange?: any;
}
const TaskFilter = ({ type, count, selected, handleChange }: ITaskFilter) => {
	return (
		<div
			className={cn(
				'flex h-7 min-w-[95px] cursor-pointer items-center gap-2 rounded-full px-3 text-xs transition-colors',
				selected && 'bg-foreground font-medium text-background shadow-sm hairline-ring ring-foreground/5',
				!selected && 'bg-foreground/5 text-muted-foreground hover:text-foreground'
			)}
			onClick={handleChange}
		>
			{type === 'open' ? (
				<div
					className={cn(
						'size-2.5 rounded-full',
						selected && 'bg-success',
						!selected && 'bg-current opacity-50'
					)}
				/>
			) : (
				<Check className="size-4" />
			)}
			<div className="w-full">{count + ' ' + type}</div>
		</div>
	);
};

export default TaskFilter;
