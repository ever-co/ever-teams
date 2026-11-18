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

// How often a drawn report checks whether its day has ended.
const DAY_CHECK_INTERVAL_MS = 60_000;

// The calendar day in a time zone, as YYYY-MM-DD; undefined for a zone this browser does not know.
function dayIn(timeZone: string, now: Date): string | undefined {
	try {
		const parts = new Intl.DateTimeFormat('en-US', {
			timeZone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).formatToParts(now);
		const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value;
		return `${part('year')}-${part('month')}-${part('day')}`;
	} catch {
		return undefined;
	}
}

/**
 * Asks the host for a client's time report once mounted, again on `retry()`, and again when the day ends in the
 * report's time zone, so a page left open overnight never shows yesterday as today. Only the latest call's answer is
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

	const drawnReport = state.report;
	useEffect(() => {
		if (!drawnReport) {
			return undefined;
		}
		// The browser's day when the report was drawn, not the report's own date: a backend whose clock differs from the
		// browser's then gets one more call when the day ends, never one a minute.
		const drawnOn = dayIn(drawnReport.timeZone, new Date());
		if (drawnOn === undefined) {
			return undefined;
		}
		const timer = setInterval(() => {
			const dayHasEnded = dayIn(drawnReport.timeZone, new Date()) !== drawnOn;
			if (dayHasEnded) {
				void load();
			}
		}, DAY_CHECK_INTERVAL_MS);
		return () => clearInterval(timer);
	}, [drawnReport, load]);

	const retry = useCallback(() => {
		if (!mounted.current) {
			return;
		}
		void load();
	}, [load]);

	return { ...state, retry };
}
