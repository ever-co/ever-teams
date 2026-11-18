'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { IClientTimeReport } from '@ever-teams/toolkit-types';

// The host's own backend call: the report reaches the page without any Ever Teams credential.
export type GetClientTimeReport = () => Promise<IClientTimeReport>;

export type ClientTimeReportState =
	| { status: 'loading'; report: null }
	| { status: 'ready'; report: IClientTimeReport }
	| { status: 'error'; report: null };

export type ClientTimeReport = ClientTimeReportState & { retry: () => void };

const LOADING: ClientTimeReportState = { status: 'loading', report: null };
const FAILED: ClientTimeReportState = { status: 'error', report: null };

/**
 * Asks the host for a client's time report once mounted, and again on `retry()`. Only the latest call's answer is
 * drawn, and none after unmount. The report stays in memory: nothing is written to the browser's storage.
 */
export function useClientTimeReport(getReport: GetClientTimeReport): ClientTimeReport {
	const [state, setState] = useState<ClientTimeReportState>(LOADING);

	// The host's latest function, set once a render commits: a new function at each render of the host does not ask
	// for the report again.
	const latestGetReport = useRef(getReport);
	useEffect(() => {
		latestGetReport.current = getReport;
	});

	const mounted = useRef(false);
	const latestCall = useRef(0);

	const load = useCallback(async () => {
		latestCall.current += 1;
		const call = latestCall.current;
		const answerCounts = () => mounted.current && call === latestCall.current;
		setState(LOADING);
		try {
			const report = await latestGetReport.current();
			if (answerCounts()) {
				setState({ status: 'ready', report });
			}
		} catch {
			if (answerCounts()) {
				setState(FAILED);
			}
		}
	}, []);

	useEffect(() => {
		mounted.current = true;
		void load();
		return () => {
			mounted.current = false;
		};
	}, [load]);

	const retry = useCallback(() => {
		if (!mounted.current) {
			return;
		}
		void load();
	}, [load]);

	return { ...state, retry };
}
