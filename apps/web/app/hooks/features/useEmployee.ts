import { getWorkingEmployeesAPI } from '@app/services/client/api';
import {
	workingEmployeesEmailState,
	workingEmployeesState
} from '@app/stores/employee';
import { useCallback, useEffect } from 'react';
import { useRecoilState } from 'recoil';

import { useQuery } from '../useQuery';

export const useEmployee = () => {
	const [workingEmployees, setWorkingEmployees] = useRecoilState(
		workingEmployeesState
	);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useRecoilState(
		workingEmployeesEmailState
	);

	const {
		queryCall: getWorkingEmployeeQueryCall,
		loading: getWorkingEmployeeLoading
	} = useQuery(getWorkingEmployeesAPI);

	const getWorkingEmployee = useCallback(() => {
		getWorkingEmployeeQueryCall().then((data) => {
			if (data?.data?.items && data?.data?.items?.length) {
				const items = data.data.items || [];
				setWorkingEmployees(items);
				setWorkingEmployeesEmail(items.map((item) => item.user?.email || ''));
			}
		});
	}, [
		getWorkingEmployeeQueryCall,
		setWorkingEmployees,
		setWorkingEmployeesEmail
	]);

	useEffect(() => {
		getWorkingEmployee();
	}, [getWorkingEmployee]);

	return {
		getWorkingEmployeeQueryCall,
		getWorkingEmployeeLoading,
		workingEmployees,
		workingEmployeesEmail
	};
};
