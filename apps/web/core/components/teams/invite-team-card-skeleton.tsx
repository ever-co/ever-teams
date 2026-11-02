import { clsxm } from '@/core/lib/utils';
import { DragHandle } from '@/core/components/icons';
import { EverCard } from '../common/ever-card';
import { VerticalSeparator } from '../duplicated-components/separator';

const BAR = 'animate-pulse rounded-md bg-foreground/5';

const InviteUserTeamCardSkeleton = ({ className }: { className?: string }) => {
	return (
		<EverCard shadow="custom" className={clsxm('relative flex items-center py-4', className)}>
			<div className="absolute left-1 text-muted-foreground opacity-40">
				<DragHandle className="size-3.5" />
			</div>
			<div className="flex w-82.5 items-center gap-3 px-4">
				<div className="size-8 rounded-full hairline-border border-dashed border-foreground/20" />
				<div className={clsxm(BAR, 'h-5 w-40')} />
			</div>
			<VerticalSeparator />

			<div className="flex w-82.5 items-start px-4">
				<div className={clsxm(BAR, 'mr-2 h-2.5 w-30')} />
			</div>
			<VerticalSeparator className="ml-2" />

			<div className="flex w-48 flex-col items-end justify-center gap-2 px-4">
				<div className={clsxm(BAR, 'h-5 w-30')} />
				<div className={clsxm(BAR, 'h-2.5 w-40')} />
			</div>
			<VerticalSeparator />

			<div className="flex w-48 flex-col items-center justify-center gap-2">
				<div className={clsxm(BAR, 'h-5 w-30')} />
				<div className={clsxm(BAR, 'h-2.5 w-40')} />
			</div>
			<VerticalSeparator />

			<div className="flex w-48 flex-col items-end justify-center gap-2 px-4">
				<div className={clsxm(BAR, 'h-5 w-30')} />
				<div className={clsxm(BAR, 'h-2.5 w-40')} />
			</div>
		</EverCard>
	);
};

export default InviteUserTeamCardSkeleton;
