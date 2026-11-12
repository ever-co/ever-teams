'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { employeeService } from '@/core/services/client/api/organizations/teams';
import { userService } from '@/core/services/client/api/users';
import { WorkEndNotAppliedError } from '@/core/lib/utils/member-access';

interface MemberWorkEnd {
	employeeId: string;
	organizationId: string;
	tenantId: string;
	/** The moment the member's work ends, or `null` to bring them back. */
	endWork: string | null;
}

/**
 * Deactivates a member or restores them. Once Gauzy answered, the teams and the employee lists are read again: it
 * leaves a member whose work ended out of every team, and puts a restored one back in theirs.
 */
export function useMemberWorkEnd() {
	const queryClient = useQueryClient();
	const readMembersAgain = async () => {
		await queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all });
		await queryClient.invalidateQueries({ queryKey: queryKeys.users.employees.all });
	};
	const mutation = useMutation({
		mutationFn: (workEnd: MemberWorkEnd) => employeeService.setEmployeeWorkEnd(workEnd),
		onSuccess: readMembersAgain,
		onError: async (error) => {
			// Gauzy answers the same when someone else made the change first: the lists then show who is where
			if (error instanceof WorkEndNotAppliedError) {
				await readMembersAgain();
			}
		},
		meta: { handlesOwnError: true }
	});

	return { setMemberWorkEnd: mutation.mutateAsync };
}

/** Gives a workspace role to a member's account, then reads the teams again: the role comes with their members. */
export function useWorkspaceRoleAssignment() {
	const queryClient = useQueryClient();
	const mutation = useMutation({
		mutationFn: (assignment: { userId: string; roleId: string }) => userService.assignUserRole(assignment),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.organizationTeams.all }),
		meta: { handlesOwnError: true }
	});

	return { assignWorkspaceRole: mutation.mutateAsync };
}
