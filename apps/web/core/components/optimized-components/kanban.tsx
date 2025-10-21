import dynamic from 'next/dynamic';
import { KanbanViewSkeleton } from '../common/skeleton/kanban-view-skeleton';

// Kanban View Components
export const LazyKanbanView = dynamic(
	() => import('@/core/components/pages/kanban/team-members-kanban-view').then((mod) => mod.KanbanView),
	{
		ssr: false,
		loading: () => <KanbanViewSkeleton />
	}
);

// Kanban Specific Components
export const LazyImageComponent = dynamic(() => import('@/core/components/common/image-overlapper'), {
	ssr: false,
	loading: () => <div className="w-20 h-8 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
});

export const LazyKanbanSearch = dynamic(() => import('@/core/components/pages/kanban/search-bar'), {
	ssr: false,
	loading: () => (
		<div className="min-w-fit lg:mt-0 input-border flex flex-col justify-center rounded-xl bg-[#F2F2F2] dark:bg-dark--theme-light min-h-6 px-2 max-h-full">
			<div className="w-32 h-6 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
		</div>
	)
});

export const LazyMenuKanbanCard = dynamic(() => import('@/core/components/pages/kanban/menu-kanban-card'), {
	ssr: false,
	loading: () => <div className="w-4 h-4 bg-[#F0F0F0] dark:bg-[#353741] animate-pulse rounded" />
});

// Kanban Modals
export const LazyInviteFormModal = dynamic(
	() =>
		import('@/core/components/features/teams/invite-form-modal').then((mod) => ({ default: mod.InviteFormModal })),
	{
		ssr: false
		// Note: No loading property for conditional components
		// Suspense fallback will handle loading states
	}
);
