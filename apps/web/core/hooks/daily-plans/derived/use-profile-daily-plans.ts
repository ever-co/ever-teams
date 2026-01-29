import { useMemo } from 'react';
import { useAuthenticateUser } from '../../auth';
import { IUseDailyPlanOptions, useEmployeeDailyPlansQuery, useMyDailyPlansQuery } from '../queries';

/**
 * Returns daily plans for a given employee or the current user.
 * Automatically switches between `useMyDailyPlansQuery` and `useEmployeeDailyPlansQuery`
 * based on whether `employeeId` matches the authenticated user.
 *
 * @param employeeId - Employee ID (optional, defaults to current user)
 * @param options - Query options ({ enabled })
 */
export const useProfileDailyPlans = (employeeId?: string, options: IUseDailyPlanOptions = {}) => {
	const { enabled = true } = options;
	const { user } = useAuthenticateUser();
	const isViewingOtherEmployee = useMemo(
		() => !!employeeId && employeeId !== user?.employeeId && employeeId !== user?.employee?.id,
		[employeeId, user?.employeeId, user?.employee?.id]
	);

	const getDayPlansByEmployeeQuery = useEmployeeDailyPlansQuery(employeeId, {
		enabled: isViewingOtherEmployee && enabled
	});
	const getMyDailyPlansQuery = useMyDailyPlansQuery({ enabled: !isViewingOtherEmployee && enabled });

	return isViewingOtherEmployee
		? getDayPlansByEmployeeQuery.data || { items: [], total: 0 }
		: getMyDailyPlansQuery.data || { items: [], total: 0 };
};
