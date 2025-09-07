'use client';
import { setActiveTeamIdCookie, setOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { activeTeamIdState, isTeamMemberState, organizationTeamsState } from '@/core/stores';
import { useCallback } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { useSyncRef } from '../../common';
import { useAuthenticateUser } from '../../auth';
import { TOrganizationTeam } from '@/core/types/schemas';
import { ZodValidationError } from '@/core/types/schemas/utils/validation';
import { queryKeys } from '@/core/query/keys';
import { toast } from 'sonner';
import { useCacheInvalidation } from '../../common/use-cache-invalidation';

/**
 *Creates a custom hook for creating an organization team.
 *
 * @returns {Object} An object containing:
 * - `loading`: A boolean indicating if team creation is in progress
 * - `createOrganizationTeam`: A function to create a team with a given name
 */

export function useCreateOrganizationTeam() {
	const [teams, setTeams] = useAtom(organizationTeamsState);
	const teamsRef = useSyncRef(teams);
	const setActiveTeamId = useSetAtom(activeTeamIdState);
	const { refreshToken, $user } = useAuthenticateUser();
	const [isTeamMember, setIsTeamMember] = useAtom(isTeamMemberState);

	// Use cache invalidation hook - much cleaner than manual invalidations
	const { smartInvalidate } = useCacheInvalidation();

	// React Query mutation with full validation and critical side-effects preservation
	const createOrganizationTeamMutation = useMutation({
		mutationFn: ({ name, user }: { name: string; user: any }) => {
			return organizationTeamService.createOrganizationTeam(name, user);
		},
		mutationKey: queryKeys.organizationTeams.mutations.create(null),
		onSuccess: async (response, { name }) => {
			try {
				const dt = response.data.items || [];
				const created = dt.find((t: TOrganizationTeam) => t.name === name);

				if (created) {
					// 1. Update cookies first (no re-renders)
					setActiveTeamIdCookie(created.id);
					setOrganizationIdCookie(created.organizationId || '');

					// 2. Update team member status if needed (minimal re-render)
					if (!isTeamMember) {
						setIsTeamMember(true);
					}

					/**
					 * 3. Refresh token BEFORE updating state to avoid conflicts
					 * Refresh Token needed for the first time when new Organization is created,
					 * As in backend permissions are getting updated
					 */
					await refreshToken();

					// 4. Update teams list first
					setTeams(dt);

					// 5. Set active team ID AFTER teams are updated to ensure proper synchronization
					setActiveTeamId(created.id);

					// 6. Success notification (no cache invalidation needed since we already have fresh data)
					// Note: Removed queryClient.invalidateQueries to prevent conflicts with manual state updates
					toast.success('Team created successfully', {
						description: `Team "${name}" has been created and you are now a member.`
					});
					// Cache invalidation using semantic hook - much cleaner and more maintainable!
					await smartInvalidate('team-creation');
				}
			} catch (error) {
				console.error('Error in team creation success handler:', error);
				// Still show success since team was created
				toast.success('Team created successfully');
			}
		},
		onError: (error) => {
			// Enhanced error handling with Zod validation errors
			if (error instanceof ZodValidationError) {
				toast.error('Create team validation failed:', {
					description: JSON.stringify({
						message: error.message,
						issues: error.issues
					})
				});
				console.error('Create team validation failed:', {
					message: error.message,
					issues: error.issues
				});
				return;
			}
			toast.error('Create team validation failed');
			// Original error will be thrown and handled by calling code
		}
	});

	// Preserve exact same interface and logic as original
	const createOrganizationTeam = useCallback(
		(name: string) => {
			const teams = teamsRef.current;
			const $name = name.trim();
			const teamExists = teams.find((t: TOrganizationTeam) => t.name.toLowerCase() === $name.toLowerCase());

			if (teamExists) {
				return Promise.reject(new Error('Team with this name already exists'));
			}
			if ($name.length < 2) {
				return Promise.reject(new Error('Team name must be at least 2 characters long'));
			}
			if (!$user.current) {
				return Promise.reject(new Error('User authentication required'));
			}

			// Use React Query mutation with Promise interface preserved
			return createOrganizationTeamMutation.mutateAsync({ name: $name, user: $user.current });
		},
		[createOrganizationTeamMutation, teamsRef, $user]
	);

	return {
		createOrganizationTeam,
		loading: createOrganizationTeamMutation.isPending // Map to legacy loading interface
	};
}
