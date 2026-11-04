import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import { IEntityRecordScope } from '@/core/types/interfaces/common/entity-record';
import {
	IEmployeeNotification,
	IEmployeeNotificationUpdateInput,
	IMarkAllNotificationsReadResponse
} from '@/core/types/interfaces/common/employee-notification';

/** Gauzy's `PaginationQueryDTO.take` is `@Max(100)`. */
export const NOTIFICATION_INBOX_PAGE_SIZE = 50;

const SENDER_RELATIONS = ['sentByEmployee', 'sentByEmployee.user'];

export interface INotificationInboxScope extends IEntityRecordScope {
	/** The caller's own employee: Gauzy does not narrow the list for holders of CHANGE_SELECTED_EMPLOYEE. */
	receiverEmployeeId: string;
}

function receiverWhere(scope: INotificationInboxScope) {
	return {
		tenantId: scope.tenantId,
		organizationId: scope.organizationId,
		receiverEmployeeId: scope.receiverEmployeeId,
		isArchived: false
	};
}

/**
 * Client for Gauzy's employee notifications (`/employee-notification`): assignments, mentions, comments,
 * invitations and broadcasts filed for the signed-in employee.
 */
class EmployeeNotificationService extends APIService {
	/** The newest notifications that are not archived, with their sender. */
	getInbox = async (
		scope: INotificationInboxScope,
		signal?: AbortSignal
	): Promise<PaginationResponse<IEmployeeNotification>> => {
		const query = qs.stringify({
			where: receiverWhere(scope),
			relations: SENDER_RELATIONS,
			order: { createdAt: 'DESC', id: 'DESC' },
			take: NOTIFICATION_INBOX_PAGE_SIZE
		});
		const response = await this.get<PaginationResponse<IEmployeeNotification>>(`/employee-notification?${query}`, {
			signal
		});

		return response.data;
	};

	/**
	 * How many unread notifications wait. Read from the `total` of a one-row page: the generic `/count` route
	 * of this controller is shadowed by its `/:id` route and answers 400.
	 */
	getUnreadCount = async (scope: INotificationInboxScope, signal?: AbortSignal): Promise<number> => {
		const query = qs.stringify({
			where: { ...receiverWhere(scope), isRead: false },
			take: 1
		});
		const response = await this.get<PaginationResponse<IEmployeeNotification>>(`/employee-notification?${query}`, {
			signal
		});

		return response.data.total;
	};

	update = async (id: string, input: IEmployeeNotificationUpdateInput): Promise<IEmployeeNotification> => {
		const response = await this.put<IEmployeeNotification>(`/employee-notification/${id}`, input);

		return response.data;
	};

	/** Gauzy marks the caller's own notifications only, whatever their role. */
	markAllAsRead = async (): Promise<IMarkAllNotificationsReadResponse> => {
		const response = await this.put<IMarkAllNotificationsReadResponse>('/employee-notification/mark-all-read', {});

		return response.data;
	};
}

export const employeeNotificationService = new EmployeeNotificationService(GAUZY_API_BASE_SERVER_URL.value);
