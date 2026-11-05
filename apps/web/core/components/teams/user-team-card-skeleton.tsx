import { clsxm } from '@/core/lib/utils';
import { DragHandle } from '@/core/components/icons';
import { EverCard } from '../common/ever-card';
import { VerticalSeparator } from '../duplicated-components/separator';

const UserTeamCardSkeletonCard = ({ className }: { className?: string }) => {
	return (
		<EverCard shadow="custom" className={clsxm('relative flex items-center py-4', className)}>
			<div className="absolute left-1 text-muted-foreground opacity-40">
				<DragHandle className="size-3.5" />
			</div>
			<div className="flex w-82.5 items-center gap-3 px-4">
				<div className="size-8 rounded-full bg-foreground/5" />
				<div className="size-9 rounded-full bg-foreground/5" />
				<Skeleton height={20} width={160} borderRadius={8} className="" />
			</div>
			<VerticalSeparator />

			<div className="flex w-82.5 flex-col items-center gap-2 px-4">
				<div className="flex flex-col items-start gap-2">
					<Skeleton height={10} width={160} borderRadius={8} className="ml-2" />
					<Skeleton height={10} width={120} borderRadius={8} className="ml-2" />
				</div>
				<div className="flex items-center justify-around gap-2">
					<Skeleton height={15} width={80} borderRadius={6} className="mr-2" />
					<Skeleton height={15} width={80} borderRadius={6} className="mr-2" />
					<Skeleton height={15} width={80} borderRadius={6} className="" />
				</div>
			</div>
			<VerticalSeparator className="ml-2" />

			<div className="flex w-48 flex-col items-end justify-center gap-2 px-4">
				<Skeleton height={20} width={120} borderRadius={8} className="" />
				<Skeleton height={10} width={160} borderRadius={8} className="" />
			</div>
			<VerticalSeparator />

			<div className="flex w-48 flex-col items-center justify-center gap-2">
				<Skeleton height={20} width={120} borderRadius={8} className="" />
				<Skeleton height={10} width={160} borderRadius={8} className="" />
			</div>
			<VerticalSeparator />

			<div className="flex w-48 flex-col items-end justify-center gap-2 px-4">
				<Skeleton height={20} width={120} borderRadius={8} className="" />
				<Skeleton height={10} width={160} borderRadius={8} className="" />
			</div>
		</EverCard>
	);
};

const Skeleton = ({
	height,
	width,
	borderRadius,
	className
}: {
	height: number;
	width: number;
	borderRadius: number;
	className: string;
}) => {
	return (
		<div
			className={clsxm('animate-pulse bg-foreground/5', className)}
			style={{ borderRadius, height, width }}
		></div>
	);
};

export default UserTeamCardSkeletonCard;
