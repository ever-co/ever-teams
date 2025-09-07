'use client';

import { useCallback, useMemo, useState, useOptimistic, startTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useTeamTasks } from '@/core/hooks/organizations/teams/use-team-tasks';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';

// Types for optimistic actions
type OptimisticAction = { type: 'assign'; member: any } | { type: 'unassign'; memberId: string };

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

			// Create complete member object with all required fields
			const newMember = {
				...member.employee,
				id: member.employeeId,
				userId: member.employee.userId
			};
			// Immediate optimistic update wrapped in startTransition
			startTransition(() => {
				addOptimisticUpdate({ type: 'assign', member: newMember });
			});
			setLoadingStates((prev) => ({ ...prev, [member.employeeId!]: 'assign' }));

			try {
				const updatedMembers = [...(task.members || []), newMember];
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

				// Error toast (optimistic rollback happens automatically)
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

			// Immediate optimistic update wrapped in startTransition
			startTransition(() => {
				addOptimisticUpdate({ type: 'unassign', memberId: member.employeeId! });
			});
			setLoadingStates((prev) => ({ ...prev, [member.employeeId!]: 'unassign' }));

			try {
				const updatedMembers = task.members?.filter((m) => m.id !== member.employeeId);

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

				// Error toast (optimistic rollback happens automatically)
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

	// Helper function to check loading state
	const isLoading = useCallback(
		(employeeId: string, action?: 'assign' | 'unassign') => {
			const currentState = loadingStates[employeeId];
			return action ? currentState === action : currentState !== null;
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
		isLoading
	};
}
