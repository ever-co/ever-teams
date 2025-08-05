import { workingEmployeesEmailState, workingEmployeesState } from '@/core/stores/user/employee';
import { useCallback, useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { employeeService } from '@/core/services/client/api/organizations/teams';
import { useAuthenticateUser } from '../../auth';
import { useFirstLoad } from '../../common';
import { queryKeys } from '@/core/query/keys';
import { TUpdateEmployee } from '@/core/types/schemas/organization/employee.schema';
import { toast } from 'sonner';

export const useEmployee = () => {
	const { user } = useAuthenticateUser();
	const [workingEmployees, setWorkingEmployees] = useAtom(workingEmployeesState);
	const [workingEmployeesEmail, setWorkingEmployeesEmail] = useAtom(workingEmployeesEmailState);
	const { firstLoadData: firstLoadDataEmployee } = useFirstLoad();

	// Memoize query parameters to prevent unnecessary re-renders
	const queryParams = useMemo(
		() => ({
			tenantId: user?.tenantId,
			organizationId: user?.employee?.organizationId
		}),
		[user?.tenantId, user?.employee?.organizationId]
	);

	// React Query for fetching working employees
	const { data: employeesData, isLoading: getWorkingEmployeeLoading } = useQuery({
		queryKey: queryKeys.users.employees.working(queryParams.tenantId, queryParams.organizationId),
		queryFn: () => employeeService.getWorkingEmployees(),
		enabled: !!queryParams.tenantId && !!queryParams.organizationId
	});

	// Sync React Query data with Jotai state
	useEffect(() => {
		if (employeesData?.items) {
			const items = employeesData.items;
			setWorkingEmployees(items);
			setWorkingEmployeesEmail(items.map((item) => item.user?.email ?? ''));
		}
	}, [employeesData, setWorkingEmployees, setWorkingEmployeesEmail]);

	// Legacy function to maintain backward compatibility
	const getWorkingEmployeeQueryCall = useCallback(() => {
		return employeeService.getWorkingEmployees();
	}, []);

	return {
		firstLoadDataEmployee,
		getWorkingEmployeeQueryCall,
		getWorkingEmployeeLoading,
		workingEmployees,
		workingEmployeesEmail
	};
};

export const useEmployeeUpdate = () => {
	const queryClient = useQueryClient();

	// React Query mutation for updating employee
	const { mutate: updateEmployeeMutation, isPending: isLoading } = useMutation({
		mutationFn: ({ id, data }: { id: string; data: TUpdateEmployee }) =>
			employeeService.updateEmployee({ id, data }),
		onSuccess: (updatedEmployee, { id }) => {
			// Invalidate and refetch employee queries
			queryClient.invalidateQueries({
				queryKey: queryKeys.users.employees.all
			});

			// Optionally update specific employee in cache
			queryClient.setQueryData(queryKeys.users.employees.detail(id), updatedEmployee);
		},
		onError: (error) => {
			toast.error('Employee update failed:', { description: error.message });
		}
	});

	// Legacy function to maintain backward compatibility
	const updateEmployee = useCallback(
		({ id, data }: { id: string; data: TUpdateEmployee }) => {
			updateEmployeeMutation({ id, data });
		},
		[updateEmployeeMutation]
	);

	return { updateEmployee, isLoading };
};
