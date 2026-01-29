import { useMemo } from 'react';
import { useAuthenticateUser } from '../../auth';
import { IUseDailyPlanOptions, useEmployeeDailyPlansQuery, useMyDailyPlansQuery } from '../queries';

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
