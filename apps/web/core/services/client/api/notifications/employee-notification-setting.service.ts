import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import {
	IEmployeeNotificationSetting,
	TEmployeeNotificationSettingInput
} from '@/core/types/interfaces/common/employee-notification';

/**
 * Client for Gauzy's notification preferences (`/employee-notification-setting`): one row per employee, one
 * switch per notification type. Gauzy reads the row before filing a notification and skips the types turned off.
 */
class EmployeeNotificationSettingService extends APIService {
	/** The employee's row, or null when they never changed a preference (every type is then on). */
	getForEmployee = async (
		scope: IEntityRecordScope,
		employeeId: string,
		signal?: AbortSignal
	): Promise<IEmployeeNotificationSetting | null> => {
		const query = qs.stringify({
			where: { tenantId: scope.tenantId, organizationId: scope.organizationId, employeeId },
			take: 1
		});
		const response = await this.get<PaginationResponse<IEmployeeNotificationSetting>>(
			`/employee-notification-setting?${query}`,
			{ signal }
		);

		return response.data.items[0] ?? null;
	};

	/** Gauzy files the row for the caller's own employee; `preferences` is required by its DTO. */
	create = async (
		scope: IEntityRecordScope,
		input: TEmployeeNotificationSettingInput
	): Promise<IEmployeeNotificationSetting> => {
		const response = await this.post<IEmployeeNotificationSetting>('/employee-notification-setting', {
			...input,
			preferences: {},
			tenantId: scope.tenantId,
			organizationId: scope.organizationId
		});

		return response.data;
	};

	update = async (
		id: string,
		scope: IEntityRecordScope,
		input: TEmployeeNotificationSettingInput
	): Promise<IEmployeeNotificationSetting> => {
		const response = await this.put<IEmployeeNotificationSetting>(`/employee-notification-setting/${id}`, {
			...input,
			tenantId: scope.tenantId,
			organizationId: scope.organizationId
		});

		return response.data;
	};
}

export const employeeNotificationSettingService = new EmployeeNotificationSettingService(
	GAUZY_API_BASE_SERVER_URL.value
);
