import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { validateApiResponse, ZodValidationError } from '@/core/types/schemas';
import {
	invoiceScheduleRunSchema,
	invoiceScheduleSchema,
	type InvoiceScheduleInput,
	type TInvoiceSchedule,
	type TInvoiceScheduleRun
} from '@/core/types/schemas/organization/invoice-schedule.schema';
import type { InvoicesScope } from './invoice.service';

/** How many runs a schedule's history reads. */
export const INVOICE_SCHEDULE_RUNS_SHOWN = 12;

/**
 * The billing schedules of the workspace's clients (Gauzy's `/invoice-schedules`): on each date of a schedule, the API
 * makes the client's invoice for the period just ended, as a draft or sent. Every call names the workspace the caller's
 * cache key holds, so a read or a write never lands in a workspace another tab switched to.
 */
class InvoiceScheduleService extends APIService {
	private logValidationError(error: unknown, message: string) {
		if (error instanceof ZodValidationError) {
			this.logger.error(message, { message: error.message, issues: error.issues }, 'InvoiceScheduleService');
		}
	}

	private scopeOf(scope?: InvoicesScope): InvoicesScope {
		return scope ?? { organizationId: this.organizationId, tenantId: this.tenantId };
	}

	/** The workspace's schedules, or one client's: a client has one at most. */
	getSchedules = async (
		options: { clientId?: string | null; scope?: InvoicesScope; signal?: AbortSignal } = {}
	): Promise<TInvoiceSchedule[]> => {
		const scope = this.scopeOf(options.scope);
		const query = qs.stringify({
			organizationId: scope.organizationId,
			...(options.clientId ? { organizationContactId: options.clientId } : {})
		});
		try {
			const response = await this.get<unknown>(`/invoice-schedules?${query}`, {
				tenantId: scope.tenantId,
				signal: options.signal
			});
			return validateApiResponse(invoiceScheduleSchema.array(), response.data ?? [], 'getSchedules API response');
		} catch (error) {
			this.logValidationError(error, 'Invoice schedules validation failed:');
			throw error;
		}
	};

	/** A schedule's latest runs, newest first, each with the invoice it made. */
	getRuns = async (
		scheduleId: string,
		options: { scope?: InvoicesScope; signal?: AbortSignal } = {}
	): Promise<TInvoiceScheduleRun[]> => {
		const scope = this.scopeOf(options.scope);
		const query = qs.stringify({ organizationId: scope.organizationId, take: INVOICE_SCHEDULE_RUNS_SHOWN });
		try {
			const url = `/invoice-schedules/${encodeURIComponent(scheduleId)}/runs?${query}`;
			const response = await this.get<unknown>(url, { tenantId: scope.tenantId, signal: options.signal });
			return validateApiResponse(invoiceScheduleRunSchema.array(), response.data ?? [], 'getRuns API response');
		} catch (error) {
			this.logValidationError(error, 'Invoice schedule runs validation failed:');
			throw error;
		}
	};

	/** Sets a client's schedule. It runs from now: a period whose invoice day is past is never billed. */
	createSchedule = async (
		clientId: string,
		input: InvoiceScheduleInput,
		scope?: InvoicesScope
	): Promise<TInvoiceSchedule> => {
		const workspace = this.scopeOf(scope);
		const body = { ...input, organizationContactId: clientId, organizationId: workspace.organizationId };
		const response = await this.post<unknown>('/invoice-schedules', body, { tenantId: workspace.tenantId });
		return validateApiResponse(invoiceScheduleSchema, response.data, 'createSchedule API response');
	};

	/**
	 * Changes a schedule: what is sent replaces what is stored. `paused: true` pauses it; `paused: false` resumes it
	 * from today, without billing the periods it skipped.
	 */
	updateSchedule = async (
		scheduleId: string,
		change: Partial<InvoiceScheduleInput> & { paused?: boolean },
		scope?: InvoicesScope
	): Promise<TInvoiceSchedule> => {
		const workspace = this.scopeOf(scope);
		const body = { ...change, organizationId: workspace.organizationId };
		const url = `/invoice-schedules/${encodeURIComponent(scheduleId)}`;
		const response = await this.put<unknown>(url, body, { tenantId: workspace.tenantId });
		return validateApiResponse(invoiceScheduleSchema, response.data, 'updateSchedule API response');
	};

	/** Deletes a schedule and its runs; the invoices it made stay. */
	deleteSchedule = async (scheduleId: string, scope?: InvoicesScope): Promise<void> => {
		const workspace = this.scopeOf(scope);
		const query = qs.stringify({ organizationId: workspace.organizationId });
		const url = `/invoice-schedules/${encodeURIComponent(scheduleId)}?${query}`;
		await this.delete(url, { tenantId: workspace.tenantId });
	};
}

export const invoiceScheduleService = new InvoiceScheduleService(GAUZY_API_BASE_SERVER_URL.value);
