/** @jest-environment jsdom */

import React, { type ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { WorkEndNotAppliedError } from '@/core/lib/utils/member-access';
import { useMemberWorkEnd, useWorkspaceRoleAssignment } from './use-member-access';

const mockSetEmployeeWorkEnd = jest.fn();
const mockAssignUserRole = jest.fn();

jest.mock('@/core/services/client/api/organizations/teams', () => ({
	employeeService: { setEmployeeWorkEnd: (...args: unknown[]) => mockSetEmployeeWorkEnd(...args) }
}));
jest.mock('@/core/services/client/api/users', () => ({
	userService: { assignUserRole: (...args: unknown[]) => mockAssignUserRole(...args) }
}));

function renderWithClient<Result>(useHook: () => Result) {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const invalidated = jest.spyOn(queryClient, 'invalidateQueries');
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
	const { result } = renderHook(useHook, { wrapper });
	return { result, invalidated };
}

function invalidatedKeys(invalidated: jest.SpyInstance): unknown[] {
	return invalidated.mock.calls.map(([filters]) => filters?.queryKey);
}

const WORK_END = {
	employeeId: 'employee-1',
	organizationId: 'organization-1',
	tenantId: 'tenant-1',
	endWork: '2026-11-12T10:00:00.000Z'
};

beforeEach(() => {
	mockSetEmployeeWorkEnd.mockReset();
	mockAssignUserRole.mockReset();
});

describe('useMemberWorkEnd', () => {
	it('reads the teams and the employee lists again once a member is deactivated or restored', async () => {
		mockSetEmployeeWorkEnd.mockResolvedValue(undefined);
		const { result, invalidated } = renderWithClient(() => useMemberWorkEnd());

		await act(async () => {
			await result.current.setMemberWorkEnd(WORK_END);
		});

		expect(mockSetEmployeeWorkEnd).toHaveBeenCalledWith(WORK_END);
		expect(invalidatedKeys(invalidated)).toEqual([queryKeys.organizationTeams.all, queryKeys.users.employees.all]);
	});

	it("passes the API's refusal on and reads nothing again", async () => {
		mockSetEmployeeWorkEnd.mockRejectedValue({ status: 403 });
		const { result, invalidated } = renderWithClient(() => useMemberWorkEnd());

		await act(async () => {
			await expect(result.current.setMemberWorkEnd(WORK_END)).rejects.toEqual({ status: 403 });
		});

		expect(invalidated).not.toHaveBeenCalled();
	});

	it('reads the lists again when the API did not apply the change, so they show who is where', async () => {
		mockSetEmployeeWorkEnd.mockRejectedValue(new WorkEndNotAppliedError());
		const { result, invalidated } = renderWithClient(() => useMemberWorkEnd());

		await act(async () => {
			await expect(result.current.setMemberWorkEnd(WORK_END)).rejects.toBeInstanceOf(WorkEndNotAppliedError);
		});

		expect(invalidatedKeys(invalidated)).toEqual([queryKeys.organizationTeams.all, queryKeys.users.employees.all]);
	});
});

describe('useWorkspaceRoleAssignment', () => {
	it('reads the teams again once the role is given, since the role comes with their members', async () => {
		mockAssignUserRole.mockResolvedValue(undefined);
		const { result, invalidated } = renderWithClient(() => useWorkspaceRoleAssignment());

		await act(async () => {
			await result.current.assignWorkspaceRole({ userId: 'user-2', roleId: 'role-admin' });
		});

		expect(mockAssignUserRole).toHaveBeenCalledWith({ userId: 'user-2', roleId: 'role-admin' });
		expect(invalidatedKeys(invalidated)).toEqual([queryKeys.organizationTeams.all]);
	});
});
