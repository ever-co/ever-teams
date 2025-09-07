'use client';

import { useCallback, useMemo, useState, useOptimistic, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useTeamTasks } from '@/core/hooks/organizations/teams/use-team-tasks';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

// Types for optimistic actions
type TaskMember = NonNullable<TTask['members']>[number];
type OptimisticAction =
	| { type: 'assign'; member: TaskMember }
	| { type: 'unassign'; memberId: string }
	| { type: 'reset'; next: TaskMember[] };

// Loading states type
type LoadingStates = Record<string, 'assign' | 'unassign' | null>;

/**
 * Custom hook for managing task member assignments with optimistic updates
 * Provides a clean API for assigning/unassigning members with immediate UI feedback
 */
export function useTaskMemberManagement(task: TTask | null, memberList: TOrganizationTeamEmployee[]) {
	const { updateTask } = useTeamTasks();
	const t = useTranslations();

	// Optimistic state for immediate UI updates
	const [optimisticMembers, addOptimisticUpdate] = useOptimistic(
		task?.members || [],
		(currentMembers, action: OptimisticAction) => {
			switch (action.type) {
				case 'assign':
					return [...currentMembers, action.member];
				case 'unassign':
					return currentMembers.filter((m) => m.id !== action.memberId);
				case 'reset':
					return action.next;
				default:
					return currentMembers;
			}
		}
	);

	// Loading states per user
	const [loadingStates, setLoadingStates] = useState<LoadingStates>({});

	// Optimistic assign member function
	const assignMember = useCallback(
		async (member: TOrganizationTeamEmployee) => {
			if (!task || !member?.employeeId || !member?.employee?.userId) return;

			// Prevent duplicate assignment using current task members (more reliable than optimistic state)
			const currentMembers = task.members || [];
			if (currentMembers.some((m) => m.userId === member.employee!.userId)) {
				return;
			}

			// Create complete member object with all required fields
			const newMember: TaskMember = {
				...member.employee,
				id: member.employeeId,
				userId: member.employee.userId
			} as TaskMember;
			// Immediate optimistic update wrapped in startTransition
			startTransition(() => {
				addOptimisticUpdate({ type: 'assign', member: newMember });
			});
			setLoadingStates((prev) => ({ ...prev, [member.employeeId!]: 'assign' }));

			try {
				// Dedupe payload by userId to prevent server-side duplicates
				const updatedMembers = Array.from(
					new Map([...(task.members ?? []), newMember].map((m) => [m.userId, m])).values()
				);

				await updateTask({
					...task,
					members: updatedMembers
				});

				// Success toast
				toast.success(t('task.toastMessages.TASK_ASSIGNED'), {
					description: `${member.employee?.fullName || 'Member'} has been assigned to the task`
				});
			} catch (error) {
				console.error('Failed to assign member:', error);

				// Manual optimistic rollback to original state
				startTransition(() => {
					addOptimisticUpdate({ type: 'reset', next: task?.members || [] });
				});

				// Error toast
				toast.error(t('task.toastMessages.TASK_ASSIGNMENT_FAILED'), {
					description: `Failed to assign ${member.employee?.fullName || 'member'} to the task`
				});
				throw error;
			} finally {
				setLoadingStates((prev) => ({ ...prev, [member.employeeId!]: null }));
			}
		},
		[task, updateTask, t, addOptimisticUpdate]
	);

	// Optimistic unassign member function
	const unassignMember = useCallback(
		async (member: TOrganizationTeamEmployee) => {
			if (!task || !member?.employeeId) return;

			// Prevent unassigning member that's not actually assigned (use current task members)
			const currentMembers = task.members || [];
			if (!currentMembers.some((m) => m.id === member.employeeId)) {
				return;
			}

			// Immediate optimistic update wrapped in startTransition
			startTransition(() => {
				addOptimisticUpdate({ type: 'unassign', memberId: member.employeeId! });
			});
			setLoadingStates((prev) => ({ ...prev, [member.employeeId!]: 'unassign' }));

			try {
				// Ensure updatedMembers is always an array, never undefined
				const updatedMembers = (task.members ?? []).filter((m) => m.id !== member.employeeId);

				await updateTask({
					...task,
					members: updatedMembers
				});

				// Success toast
				toast.success(t('task.toastMessages.TASK_UNASSIGNED'), {
					description: `${member.employee?.fullName || 'Member'} has been unassigned from the task`
				});
			} catch (error) {
				console.error('Failed to unassign member:', error);

				// Manual optimistic rollback to original state
				startTransition(() => {
					addOptimisticUpdate({ type: 'reset', next: task?.members || [] });
				});

				// Error toast
				toast.error(t('task.toastMessages.TASK_ASSIGNMENT_FAILED'), {
					description: `Failed to unassign ${member.employee?.fullName || 'member'} from the task`
				});
				throw error;
			} finally {
				setLoadingStates((prev) => ({ ...prev, [member.employeeId!]: null }));
			}
		},
		[task, updateTask, t, addOptimisticUpdate]
	);

	// Computed member lists with performance optimization
	const { assignedMembers, unassignedMembers } = useMemo(() => {
		if (!memberList.length) return { assignedMembers: [], unassignedMembers: [] };

		// Use Set for O(1) lookup performance
		const assignedUserIds = new Set(optimisticMembers.map((m) => m.userId));

		const assigned: TOrganizationTeamEmployee[] = [];
		const unassigned: TOrganizationTeamEmployee[] = [];

		// Single pass through memberList for better performance
		for (const member of memberList) {
			if (!member.employee?.isActive) continue;

			if (assignedUserIds.has(member.employee.userId)) {
				assigned.push(member);
			} else {
				unassigned.push(member);
			}
		}

		return { assignedMembers: assigned, unassignedMembers: unassigned };
	}, [memberList, optimisticMembers]);

	// Helper function to check loading state with proper undefined handling
	const isLoading = useCallback(
		(employeeId: string, action?: 'assign' | 'unassign') => {
			const currentState = loadingStates[employeeId];
			// Use Boolean() to treat undefined/null as false (not loading)
			return action ? currentState === action : Boolean(currentState);
		},
		[loadingStates]
	);

	// Helper function to get loading state safely
	const getLoadingState = useCallback(
		(employeeId: string): 'assign' | 'unassign' | null => {
			return loadingStates[employeeId] ?? null;
		},
		[loadingStates]
	);

	return {
		optimisticMembers,
		assignedMembers,
		unassignedMembers,
		loadingStates,
		assignMember,
		unassignMember,
		isLoading,
		getLoadingState
	};
}
