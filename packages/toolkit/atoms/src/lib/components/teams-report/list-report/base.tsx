/** @jsxImportSource theme-ui */

import { cn, formatTime, Progress } from '@ever-teams/toolkit-ui';
import { cva, VariantProps } from 'class-variance-authority';
import { IProjectsStats } from '@hooks/useProjectsStats';
import { ITasksStats } from '@hooks/useTasksStats';
import { IActivitiesStats } from '@ever-teams/toolkit-types';
import { useTranslation } from 'react-i18next';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';

/**
 * Skeleton component that mimics the ItemDetail structure
 */
const ItemDetailSkeleton: React.FC<{ size?: 'default' | 'sm' | 'lg' | null }> = ({ size }) => {
	return (
		<div className="flex justify-between items-start text-xs animate-pulse">
			{/* Name skeleton - matches w-[55%] */}
			<div className="w-[55%]">
				<div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-3/4"></div>
			</div>

			{/* Right section skeleton - matches w-[40%] */}
			<div className="flex gap-4 w-[40%] justify-between items-center">
				{/* Percentage skeleton */}
				<div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-12"></div>

				{/* Progress bar skeleton - only show when size !== 'sm' */}
				{size !== 'sm' && <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full flex-1 mx-2"></div>}

				{/* Time skeleton */}
				<div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-md w-16"></div>
			</div>
		</div>
	);
};

/**
 * Skeleton loader that displays multiple ItemDetailSkeleton components
 */
const TeamsListSkeleton: React.FC<{ size?: 'default' | 'sm' | 'lg' | null; itemCount?: number }> = ({
	size,
	itemCount = 4
}) => {
	return (
		<div className={'flex flex-col p-6 gap-4 relative max-h-[300px] overflow-y-auto custom-scroll'}>
			{Array.from({ length: itemCount }, (_, index) => (
				<ItemDetailSkeleton key={index} size={size} />
			))}
		</div>
	);
};

interface ItemDetailProps {
	name: string;
	percentage: number;
	time: number;
	size?: 'default' | 'sm' | 'lg' | null;
}

interface ITeamsBaseListProps extends VariantProps<typeof teamsBaseListVariants> {
	className?: string;
	title: string;
	stats: { data: IProjectsStats | ITasksStats | IActivitiesStats | null; loading: boolean };
}

/**
 * A single item in the teams report list, showing the name, percentage,
 * a progress bar, and the total time worked.
 *
 * @param {{ name: string, percentage: number, time: number }} props
 * @returns {ReactElement}
 */
const ItemDetail: React.FC<ItemDetailProps> = ({ name, percentage, time, size }) => {
	return (
		<div className="flex justify-between items-start text-xs">
			<span className="text-sm w-[55%] font-normal">{name}</span>
			<div className="flex gap-4 w-[40%] justify-between items-center">
				<span className="text-sm">{percentage.toFixed(2)}%</span>
				{size !== 'sm' && <Progress className=" h-2" value={Math.ceil(percentage)} />}
				<span className="text-sm font-mono">{formatTime(time)}</span>
			</div>
		</div>
	);
};

const teamsBaseListVariants = cva(
	'rounded-xl shadow-2xl rounded-2xl bg-white dark:bg-black text-gray-900 dark:text-gray-100 py-4',
	{
		variants: {
			variant: {
				default: '',
				bordered: 'border-2 border-secondaryColor'
			},
			size: {
				default: 'w-[600px]',
				sm: 'w-[400px]',
				lg: 'w-[800px]'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

/**
 * A component that renders a base list for teams reports with customizable variants and sizes.
 *
 * @param {Object} props - The properties object.
 * @param {'default' | 'bordered'} [props.variant='default'] - The visual variant of the list.
 * @param {'default' | 'sm' | 'lg'} [props.size='default'] - The size variant of the list.
 * @param {string} props.className - Additional CSS class names.
 * @param {string} props.type - The type of report being displayed, used for the header text.
 * @param {{ data: Array<Object> | null, loading: boolean }} [props.stats={ data: null, loading: false }] - The stats data to be displayed in the list and a loading state.
 * @returns {ReactElement} The rendered component displaying a list with a header and item details.
 */

const TeamsBaseList = ({
	variant,
	size,
	className,
	title,
	stats = { data: null, loading: false }
}: ITeamsBaseListProps) => {
	const { t } = useTranslation();
	return (
		<div className={cn(teamsBaseListVariants({ variant, size, className }))} sx={{ borderColor: 'borderColor' }}>
			<div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 rounded-t-xl px-6  pb-2  font-bold">
				<h1 className="capitalize">{title}</h1>
				{/* <TeamsDateRangePicker /> */}
			</div>
			{stats.loading ? (
				<TeamsListSkeleton size={size} itemCount={4} />
			) : (
				<div className={'flex flex-col p-6 gap-4 relative max-h-[300px] overflow-y-auto custom-scroll'}>
					{stats.data &&
						stats.data.map((item, index) => (
							<ItemDetail
								key={index}
								name={'name' in item ? item.name : item.title}
								percentage={Number(item.durationPercentage)}
								time={Number(item.duration)}
								size={size}
							/>
						))}
					{(!stats.data || stats?.data.length === 0) && (
						<p className="text-center text-gray-400">{t('NO_DATA.no_data_available')}</p>
					)}
				</div>
			)}
			<TeamsTimerFooter />
		</div>
	);
};

export { TeamsBaseList, ItemDetail, teamsBaseListVariants, ItemDetailSkeleton, TeamsListSkeleton };
