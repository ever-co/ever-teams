'use client';

import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { IClientTimeReport } from '@ever-teams/toolkit-types';
import { Card, cn, formatTime, Progress } from '@ever-teams/toolkit-ui';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { KIT_NOTICE_ACTION, KIT_NOTICE_SURFACE, kitNoticeTone } from '@components/teams-ui-components/notice-surface';
import { TeamsReportDisplayer } from '@components/teams-ui-components/report-displayer';
import { ClientTimeReport, GetClientTimeReport, useClientTimeReport } from '@hooks/useClientTimeReport';

export interface ITeamsClientTimeReportProps {
	// The host's own backend call that returns the report: no Ever Teams credential reaches the page.
	getReport: GetClientTimeReport;
	className?: string;
}

type ClientProject = IClientTimeReport['projects'][number];

// The projects with the most time first, in a copy: the host's array keeps its order.
function byTimeSpent(projects: IClientTimeReport['projects']): ClientProject[] {
	const sorted = [...projects];
	sorted.sort((first, second) => second.seconds - first.seconds);
	return sorted;
}

// The host's backend may count fractions of a second: the report draws whole seconds, as the timer does. Only what is
// drawn is rounded: the projects' order, their bars and whether the week has time use the seconds as given.
const wholeSeconds = (seconds: number): number => Math.floor(seconds);

// A project's bar is relative to the project with the most time.
function shareOf(seconds: number, largest: number): number {
	if (largest <= 0) {
		return 0;
	}
	return Math.round((seconds * 100) / largest);
}

function ReportHeading({ id, clientName }: Readonly<{ id: string; clientName?: string }>) {
	const { t } = useTranslation();
	return (
		<h2 id={id} className="flex min-w-0 flex-col">
			<span className="text-xs font-normal text-gray-400 dark:text-white/50">{t('CLIENT_REPORT.title')}</span>{' '}
			{clientName && <span className="truncate text-lg font-medium">{clientName}</span>}
		</h2>
	);
}

interface IReportTilesProps {
	today?: number;
	week?: number;
	loading?: boolean;
}

function ReportTiles({ today = 0, week = 0, loading = false }: Readonly<IReportTilesProps>) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-wrap gap-3">
			<TeamsReportDisplayer
				label={t('CLIENT_REPORT.today')}
				workedTime={today}
				showProgress={false}
				maxWorkHours={8}
				loading={loading}
				className="flex-1"
			/>
			<TeamsReportDisplayer
				label={t('CLIENT_REPORT.this_week')}
				workedTime={week}
				showProgress={false}
				maxWorkHours={40}
				loading={loading}
				className="flex-1"
			/>
		</div>
	);
}

function ProjectRow({ project, largest }: Readonly<{ project: ClientProject; largest: number }>) {
	const duration = formatTime(wholeSeconds(project.seconds));
	const share = shareOf(project.seconds, largest);
	return (
		<li className="flex min-w-0 flex-col gap-1">
			<div className="flex items-center justify-between gap-3 text-sm">
				<span className="min-w-0 truncate" title={project.name}>
					{project.name}
				</span>
				<span className="shrink-0 lining-nums tabular-nums">{duration}</span>
			</div>
			<Progress
				className="h-2"
				value={share}
				aria-label={project.name}
				aria-valuenow={share}
				aria-valuetext={duration}
			/>
		</li>
	);
}

function ProjectBreakdown({ projects }: Readonly<{ projects: IClientTimeReport['projects'] }>) {
	const { t } = useTranslation();
	const headingId = useId();
	if (projects.length === 0) {
		return null;
	}
	const sorted = byTimeSpent(projects);
	const largest = sorted[0].seconds;
	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-3">
			<h3 id={headingId} className="text-sm font-medium">
				{t('CLIENT_REPORT.by_project')}
			</h3>
			<ul className="flex flex-col gap-3">
				{sorted.map((project) => (
					<ProjectRow key={project.id} project={project} largest={largest} />
				))}
			</ul>
		</section>
	);
}

function ReportError({ onRetry }: Readonly<{ onRetry: () => void }>) {
	const { t } = useTranslation();
	return (
		<div
			role="alert"
			className={cn(
				'flex flex-wrap items-center justify-between gap-2',
				KIT_NOTICE_SURFACE,
				kitNoticeTone('error')
			)}
		>
			<span className="min-w-0">{t('CLIENT_REPORT.error')}</span>
			<button type="button" onClick={onRetry} className={KIT_NOTICE_ACTION}>
				{t('CLIENT_REPORT.retry')}
			</button>
		</div>
	);
}

function ClientReportBody({ state }: Readonly<{ state: ClientTimeReport }>) {
	const { t } = useTranslation();
	if (state.status === 'loading') {
		return <ReportTiles loading />;
	}
	if (state.status === 'error') {
		return <ReportError onRetry={state.retry} />;
	}
	const { report } = state;
	const hasTimeThisWeek = report.week.seconds > 0;
	if (!hasTimeThisWeek) {
		return <p className="text-sm text-gray-400">{t('CLIENT_REPORT.empty', { client: report.client.name })}</p>;
	}
	return (
		<>
			<ReportTiles today={wholeSeconds(report.today.seconds)} week={wholeSeconds(report.week.seconds)} />
			<ProjectBreakdown projects={report.projects} />
		</>
	);
}

/**
 * The time spent for one client: today, this week, and this week by project. The host's backend gets the report from
 * the Ever Teams API with its embed credential and `getReport` returns it, so the client's portal shows it without an
 * Ever Teams account and without any token in the browser.
 */
export function TeamsClientTimeReport({ getReport, className }: Readonly<ITeamsClientTimeReportProps>) {
	const headingId = useId();
	const state = useClientTimeReport(getReport);
	const isLoading = state.status === 'loading';
	return (
		<Card
			role="region"
			aria-labelledby={headingId}
			aria-busy={isLoading}
			className={cn(
				'flex w-full min-w-0 max-w-[600px] flex-col gap-4 rounded-xl bg-white p-5 shadow-2xl dark:bg-black dark:text-white dark:shadow-white/10',
				className
			)}
		>
			<ReportHeading id={headingId} clientName={state.report?.client.name} />
			<ClientReportBody state={state} />
			<TeamsTimerFooter />
		</Card>
	);
}
