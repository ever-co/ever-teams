import dynamic from 'next/dynamic';
import { ModalSkeleton } from '../common/skeleton/modal-skeleton';

const FITS_SMALL_SCREENS = 'max-w-[calc(100vw-2rem)]';

// The dialogs a timer button may open before tracking. They mount on their first opening, so their code is fetched
// then, instead of shipping with every timer and task card.
export const LazySuggestDailyPlanModal = dynamic(
	() =>
		import('@/core/components/features/daily-plan/suggest-daily-plan-modal').then((mod) => ({
			default: mod.SuggestDailyPlanModal
		})),
	{
		ssr: false,
		loading: () => <ModalSkeleton size="sm" className={FITS_SMALL_SCREENS} />
	}
);

export const LazyEnforcePlanedTaskModal = dynamic(
	() =>
		import('@/core/components/features/daily-plan/enforce-planed-task-modal').then((mod) => ({
			default: mod.EnforcePlanedTaskModal
		})),
	{
		ssr: false,
		loading: () => <ModalSkeleton size="sm" className={FITS_SMALL_SCREENS} />
	}
);

export const LazyAddTasksEstimationHoursModal = dynamic(
	() =>
		import('@/core/components/features/daily-plan/add-task-estimation-hours-modal').then((mod) => ({
			default: mod.AddTasksEstimationHoursModal
		})),
	{
		ssr: false,
		loading: () => <ModalSkeleton size="lg" className={FITS_SMALL_SCREENS} />
	}
);
