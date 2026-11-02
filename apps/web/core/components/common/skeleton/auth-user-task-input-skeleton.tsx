'use client';

import { useTranslations } from 'next-intl';
import { clsxm } from '@/core/lib/utils';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { Skeleton } from '@/core/components/common/skeleton';

const SKELETON_TONE = 'bg-foreground/[0.06]';
const PROPERTY_PILL_SKELETON_KEYS = ['status', 'priority', 'size', 'labels'];

/**
 * The task block while the active task is not known yet: the same rows at the same heights as the loaded block, so
 * the input, the estimate and the properties never flash their empty state before the task arrives.
 */
export function AuthUserTaskInputSkeleton({ className }: IClassName) {
	const t = useTranslations();
	return (
		<div role="status" className={clsxm('flex min-w-0 flex-1 flex-col gap-4 mt-8 lg:mt-0', className)}>
			<Skeleton className={clsxm(SKELETON_TONE, 'h-10 w-full rounded-lg')} />
			<div className="ml-2 flex flex-row flex-wrap items-center gap-3 md:justify-between lg:justify-start lg:gap-4">
				<div className="mb-4 flex items-center lg:mb-0">
					<span className="pr-2 font-normal text-muted-foreground">{t('common.ESTIMATE')}:</span>
					<Skeleton className={clsxm(SKELETON_TONE, 'h-4 w-14')} />
				</div>
				<div className="hidden flex-1 justify-end gap-2 md:flex md:items-center">
					{PROPERTY_PILL_SKELETON_KEYS.map((key) => (
						<Skeleton key={key} className={clsxm(SKELETON_TONE, 'h-7 w-24 rounded-full')} />
					))}
				</div>
			</div>
		</div>
	);
}
