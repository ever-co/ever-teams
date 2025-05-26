import { workingEmployeesEmailState, workingEmployeesState } from '@/core/stores/user/employee';
import { useCallback, useEffect } from 'react';
import { useAtom } from 'jotai';

import { employeeService } from '@/core/services/client/api/organizations/teams';
import { useAuthenticateUser } from '../../auth';
import { useFirstLoad, useQuery } from '../../common';
import { IUpdateEmployee } from '@/core/types/interfaces/organization/employee/IEmployee';

export const useEmployee = () => {
	const { user } = useAuthenticateUser();
	const [workingEmployees, setWorkingEmployees] = useAtom(workingEmployeesState);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useAtom(workingEmployeesEmailState);
	const { firstLoad, firstLoadData: firstLoadDataEmployee } = useFirstLoad();

	const { queryCall: getWorkingEmployeeQueryCall, loading: getWorkingEmployeeLoading } = useQuery(
		employeeService.getWorkingEmployees
	);

	const getWorkingEmployee = useCallback(() => {
		if (!user?.tenantId) {
			return;
		}
		getWorkingEmployeeQueryCall(user?.tenantId, user?.employee?.organizationId ?? '').then(({ data }) => {
			if (data?.items && data?.items?.length) {
				const items = data.items || [];

				setWorkingEmployees(items);
				setWorkingEmployeesEmail(items.map((item: any) => item.user?.email || ''));
			}
		});
	}, [getWorkingEmployeeQueryCall, setWorkingEmployees, setWorkingEmployeesEmail, user]);

	useEffect(() => {
		if (firstLoad) {
			getWorkingEmployee();
		}
	}, [getWorkingEmployee, firstLoad]);

	return {
		firstLoadDataEmployee,
		getWorkingEmployeeQueryCall,
		getWorkingEmployeeLoading,
		workingEmployees,
		workingEmployeesEmail
	};
};

export const useEmployeeUpdate = () => {
	const { queryCall: employeeUpdateQuery, loading: isLoading } = useQuery(employeeService.updateEmployee);

	const updateEmployee = useCallback(
		({ id, data }: { id: string; data: IUpdateEmployee }) => {
			employeeUpdateQuery({ id, data })
				.then((res) => res.data)
				.catch((error) => {
					console.log(error);
				});
		},
		[employeeUpdateQuery]
	);

	return { updateEmployee, isLoading };
};
