import { getMyTasks } from '@ever-teams/api';
import { useEffect, useState } from 'react';
import { IHookResponse, ITeamTask } from '@ever-teams/toolkit-types';
import { toast } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '@lib/context/teams-context';
import { useKitOptions } from '@components/teams-provider/kit-options';

const useMyTasks = ({ projectId }: { projectId: string | null }): IHookResponse<ITeamTask[] | null> => {
	const [tasks, setTasks] = useState<IHookResponse<ITeamTask[] | null>>({
		data: null,
		loading: false
	});

	const { authenticatedUser: user, token, selectedOrganization: organizationId } = useTeamsContext();
	const { hostSignIn } = useKitOptions();

	useEffect(() => {
		// A token from the host's getToken does not reach the tasks: no read, so no refusal to show
		if (hostSignIn) {
			setTasks({ data: [], loading: false });
			return;
		}
		if (user && organizationId) {
			(async () => {
				setTasks((prev) => ({ ...prev, loading: true }));
				const userTasks = await getMyTasks(user, token, projectId, organizationId);

				if ('message' in userTasks || 'error' in userTasks) {
					const errorMessage =
						'message' in userTasks
							? Array.isArray(userTasks.message)
								? userTasks.message.join(', ')
								: userTasks.message
							: String(userTasks.error);

					toast({
						variant: 'destructive',
						description: errorMessage
					});
					setTasks((prev) => ({ ...prev, loading: false }));

					return;
				}
				setTasks({ data: userTasks, loading: false });
			})();
		}
	}, [user, projectId, organizationId, hostSignIn]);

	return tasks;
};

export { useMyTasks };
