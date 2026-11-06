import { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import {
	IEmployeeNotification,
	IEmployeeNotificationSetting,
	IEmployeeNotificationUpdateInput,
	IMarkAllNotificationsReadResponse
} from '@/core/types/interfaces/common/employee-notification';
import { serverFetch } from '../fetch';

interface IGauzyCall {
	bearer_token: string;
	tenantId: string;
}

export function getEmployeeNotificationsRequest({ query, bearer_token, tenantId }: IGauzyCall & { query: string }) {
	return serverFetch<PaginationResponse<IEmployeeNotification>>({
		path: `/employee-notification?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function updateEmployeeNotificationRequest({
	id,
	data,
	bearer_token,
	tenantId
}: IGauzyCall & { id: string; data: IEmployeeNotificationUpdateInput }) {
	return serverFetch<IEmployeeNotification>({
		path: `/employee-notification/${id}`,
		method: 'PUT',
		body: data,
		bearer_token,
		tenantId
	});
}

export function markAllEmployeeNotificationsReadRequest({ bearer_token, tenantId }: IGauzyCall) {
	return serverFetch<IMarkAllNotificationsReadResponse>({
		path: '/employee-notification/mark-all-read',
		method: 'PUT',
		body: {},
		bearer_token,
		tenantId
	});
}

export function getEmployeeNotificationSettingsRequest({
	query,
	bearer_token,
	tenantId
}: IGauzyCall & { query: string }) {
	return serverFetch<PaginationResponse<IEmployeeNotificationSetting>>({
		path: `/employee-notification-setting?${query}`,
		method: 'GET',
		bearer_token,
		tenantId
	});
}

export function createEmployeeNotificationSettingRequest({
	data,
	bearer_token,
	tenantId
}: IGauzyCall & { data: Record<string, unknown> }) {
	return serverFetch<IEmployeeNotificationSetting>({
		path: '/employee-notification-setting',
		method: 'POST',
		body: data,
		bearer_token,
		tenantId
	});
}

export function updateEmployeeNotificationSettingRequest({
	id,
	data,
	bearer_token,
	tenantId
}: IGauzyCall & { id: string; data: Record<string, unknown> }) {
	return serverFetch<IEmployeeNotificationSetting>({
		path: `/employee-notification-setting/${id}`,
		method: 'PUT',
		body: data,
		bearer_token,
		tenantId
	});
}
