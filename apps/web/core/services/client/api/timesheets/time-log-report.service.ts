import qs from 'qs';
import { APIService } from '../../api.service';
import { GAUZY_API_BASE_SERVER_URL, TIMESHEET_RELATIONS } from '@/core/constants/config/constants';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { validateApiResponse } from '@/core/types/schemas/utils/validation';
import {
	owedReportDaySchema,
	projectBudgetReportSchema,
	type TOwedReportDay,
	type TProjectBudgetReport
} from '@/core/types/schemas/timer/time-log-reports.schema';

/**
 * A report range sent as the two exact instants that bound it, with the reader's time zone: Gauzy cuts the days in
 * that zone, so bounds moved to midnight UTC would shift the first and last hours of the period for anyone not on
 * UTC.
 */
export interface TimeLogReportRange {
	from: Date;
	to: Date;
	timeZone: string;
	employeeIds?: ReadonlyArray<string>;
	projectIds?: ReadonlyArray<string>;
	teamIds?: ReadonlyArray<string>;
}

export type ChangedTimeLogKind = 'added' | 'edited';

function listOrUndefined(values: ReadonlyArray<string> | undefined) {
	const hasValues = Boolean(values) && (values?.length ?? 0) > 0;
	if (!hasValues) {
		return undefined;
	}
	return [...(values ?? [])];
}

class TimeLogReportService extends APIService {
	private rangeParamsOf(range: TimeLogReportRange) {
		return {
			tenantId: this.tenantId,
			organizationId: this.organizationId,
			startDate: range.from.toISOString(),
			endDate: range.to.toISOString(),
			timeZone: range.timeZone,
			employeeIds: listOrUndefined(range.employeeIds),
			projectIds: listOrUndefined(range.projectIds),
			teamIds: listOrUndefined(range.teamIds)
		};
	}

	private changeFilterOf(kind: ChangedTimeLogKind) {
		if (kind === 'added') {
			return { logType: [ETimeLogType.MANUAL] };
		}
		return { isEdited: true };
	}

	/**
	 * Time added by hand (`added`, the MANUAL log type) or changed after it was recorded (`edited`, any log type
	 * with `editedAt` set). Gauzy keeps no previous start or end, so an edit is known by its date only.
	 */
	getChangedTimeLogs = async (range: TimeLogReportRange, kind: ChangedTimeLogKind): Promise<ITimeLog[]> => {
		const params = {
			...this.rangeParamsOf(range),
			...this.changeFilterOf(kind),
			relations: [...TIMESHEET_RELATIONS]
		};
		const query = qs.stringify(params);
		const response = await this.get<ITimeLog[]>(`/timesheet/time-log?${query}`, { tenantId: this.tenantId });
		return response.data ?? [];
	};

	/** Per day and per member: the tracked duration and that time at the member's bill rate, in the rate's currency. */
	getOwedAmountReport = async (range: TimeLogReportRange): Promise<TOwedReportDay[]> => {
		const query = qs.stringify(this.rangeParamsOf(range));
		const response = await this.get<unknown>(`/timesheet/time-log/report/owed-report?${query}`, {
			tenantId: this.tenantId
		});
		return validateApiResponse(owedReportDaySchema.array(), response.data ?? [], 'getOwedAmountReport response');
	};

	/** Projects with time logged in the range, each with its budget and what that time spent of it. */
	getProjectBudgetReport = async (range: TimeLogReportRange): Promise<TProjectBudgetReport[]> => {
		const query = qs.stringify(this.rangeParamsOf(range));
		const response = await this.get<unknown>(`/timesheet/time-log/project-budget-limit?${query}`, {
			tenantId: this.tenantId
		});
		return validateApiResponse(
			projectBudgetReportSchema.array(),
			response.data ?? [],
			'getProjectBudgetReport response'
		);
	};
}

export const timeLogReportService = new TimeLogReportService(GAUZY_API_BASE_SERVER_URL.value);
