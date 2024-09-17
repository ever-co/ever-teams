import { getWorkingEmployeesAPI, updateEmployeeAPI } from '@app/services/client/api';
import { workingEmployeesEmailState, workingEmployeesState } from '@app/stores/employee';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';

import { useQuery } from '../useQuery';
import { useAuthenticateUser } from './useAuthenticateUser';
import { IUpdateEmployee } from '@app/interfaces';
import { useFirstLoad } from '../useFirstLoad';

export const useEmployee = () => {
	const { user } = useAuthenticateUser();
	const [workingEmployees, setWorkingEmployees] = useRecoilState(workingEmployeesState);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useRecoilState(workingEmployeesEmailState);
	const { firstLoad, firstLoadData: firstLoadDataEmployee } = useFirstLoad();

	const { queryCall: getWorkingEmployeeQueryCall, loading: getWorkingEmployeeLoading } =
		useQuery(getWorkingEmployeesAPI);

	const getWorkingEmployee = useCallback(() => {
		if (!user?.tenantId) {
			return;
		}
		getWorkingEmployeeQueryCall(user?.tenantId, user?.employee.organizationId).then(({ data }) => {
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
	const { queryCall: employeeUpdateQuery, loading: isLoading } = useQuery(updateEmployeeAPI);

	const updateEmployee = useCallback(({ id, data }: { id: string; data: IUpdateEmployee }) => {
		employeeUpdateQuery({ id, data })
			.then((res) => res.data)
			.catch((error) => {
				console.log(error);
			});
	}, [employeeUpdateQuery]);

	return { updateEmployee, isLoading };
};
