'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useClientsQuery } from '@/core/hooks/clients/use-clients-query';
import { useReportProjectClients } from '@/core/hooks/dashboards/use-report-clients';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { canReadClients, clientNamesOf } from '@/core/lib/utils/clients';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { clientOfProjectLogOf, clientRowsOf, type TimeActivityRow } from '@/core/lib/utils/dashboards/time-activity';
import {
	clientSplitItemsOf,
	namedSplitCountOf,
	projectSplitItemsOf,
	splitRowsOf,
	splitTotalOf,
	type TimeSplitMode
} from '@/core/lib/utils/dashboards/time-split';
import type { ITimeLogGroupedDailyReport } from '@/core/types/interfaces/activity/activity-report';

interface TimeSplitSource {
	/** The rows the page shows: they give the split by project. */
	rows: ReadonlyArray<DailyReportRow>;
	/** The daily report behind them, read again with each project's client for the split by client. */
	report: ReadonlyArray<ITimeLogGroupedDailyReport>;
	/** Keeps the rows the page keeps (a member sees only their own time). Every row by default. */
	keepRow?: (row: DailyReportRow) => boolean;
}

function keepEveryRow() {
	return true;
}

function effectiveModeOf(picked: TimeSplitMode, mayReadClients: boolean): TimeSplitMode {
	if (!mayReadClients) {
		return 'project';
	}
	return picked;
}

function itemsOf(isClientMode: boolean, rows: ReadonlyArray<DailyReportRow>, clientRows: TimeActivityRow[]) {
	if (isClientMode) {
		return clientSplitItemsOf(clientRows);
	}
	return projectSplitItemsOf(rows);
}

/**
 * "Where the time went": the time in view split by project, or by client for someone who may read the clients. The
 * client of each project's time follows the rule of the report's client filter and grouping; the clients and the
 * projects are read only once the split by client is picked.
 */
export function useTimeSplit({ rows, report, keepRow = keepEveryRow }: TimeSplitSource) {
	const t = useTranslations();
	const [pickedMode, setMode] = useState<TimeSplitMode>('project');
	const { myPermissions } = useMyRolePermissionsQuery();
	const mayReadClients = canReadClients(myPermissions);
	const mode = effectiveModeOf(pickedMode, mayReadClients);
	const isClientMode = mode === 'client';

	// The archived projects too: the report names no archived client beside its project
	const projectClients = useReportProjectClients({
		includesArchived: true,
		isEnabled: isClientMode
	});
	const clientsQuery = useClientsQuery({ includeArchived: true, enabled: isClientMode });
	const { clientIds } = projectClients;
	const { clients } = clientsQuery;
	const withoutTeamLabel = t('dashboard.NO_TEAM_GROUP');

	const clientRows = useMemo(() => {
		if (!isClientMode) {
			return [];
		}
		const clientOf = clientOfProjectLogOf(clientIds, clientNamesOf(clients));
		return clientRowsOf(report, clientOf, withoutTeamLabel).filter(keepRow);
	}, [clientIds, clients, isClientMode, keepRow, report, withoutTeamLabel]);

	const items = useMemo(() => itemsOf(isClientMode, rows, clientRows), [clientRows, isClientMode, rows]);
	const splitRows = useMemo(() => splitRowsOf(items), [items]);

	const areClientNamesPending = !clientsQuery.isLoaded && !clientsQuery.isError;
	const isLookupPending = projectClients.isPending || areClientNamesPending;
	const isClientLookupPending = isClientMode && isLookupPending;
	// Without the projects no time can be told apart by client; without the names, the report's own names remain
	const isClientLookupError = isClientMode && projectClients.isError;

	const { refetch: refetchProjects } = projectClients;
	const { refetch: refetchClients } = clientsQuery;
	const retryClientLookup = useCallback(() => {
		refetchProjects();
		void refetchClients();
	}, [refetchClients, refetchProjects]);

	return {
		mode,
		setMode,
		canSplitByClient: mayReadClients,
		rows: splitRows,
		totalSeconds: splitTotalOf(items),
		namedCount: namedSplitCountOf(items),
		isClientLookupPending,
		isClientLookupError,
		retryClientLookup
	};
}

export type TimeSplitState = ReturnType<typeof useTimeSplit>;
