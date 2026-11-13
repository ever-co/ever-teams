'use client';

import { useTranslations } from 'next-intl';
import { SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { TIME_IMPORT_HEADERS, type TimeImportColumn } from '@/core/lib/utils/time-import-sheet';
import { TIME_IMPORT_EXAMPLES } from './time-import-copy';

const HEADER_CHIP =
	'inline-flex h-6 w-fit items-center rounded-md bg-foreground/[0.05] px-1.5 font-mono text-[11px] text-foreground';

type Requirement = 'required' | 'oneOfTwo' | 'optional';

interface GuideRow {
	column: TimeImportColumn;
	description: string;
	requirement: Requirement;
}

interface TimeImportColumnsGuideProps {
	canImportForOthers: boolean;
	matchesEveryTeamTask: boolean;
}

export function TimeImportColumnsGuide({
	canImportForOthers,
	matchesEveryTeamTask
}: Readonly<TimeImportColumnsGuideProps>) {
	const t = useTranslations();
	// The browser's zone, the one the rows are read in
	const browserFormat = Intl.DateTimeFormat();
	const { timeZone } = browserFormat.resolvedOptions();

	let taskDescription = t('timeImport.columns.TASK_OWN');
	if (matchesEveryTeamTask) {
		taskDescription = t('timeImport.columns.TASK_ANY');
	}

	const rows: GuideRow[] = [
		{ column: 'date', description: t('timeImport.columns.DATE', TIME_IMPORT_EXAMPLES), requirement: 'required' },
		{
			column: 'startTime',
			description: t('timeImport.columns.START_TIME', TIME_IMPORT_EXAMPLES),
			requirement: 'required'
		},
		{
			column: 'endTime',
			description: t('timeImport.columns.END_TIME', TIME_IMPORT_EXAMPLES),
			requirement: 'oneOfTwo'
		},
		{
			column: 'duration',
			description: t('timeImport.columns.DURATION', TIME_IMPORT_EXAMPLES),
			requirement: 'oneOfTwo'
		},
		{ column: 'project', description: t('timeImport.columns.PROJECT'), requirement: 'optional' },
		{ column: 'task', description: taskDescription, requirement: 'optional' },
		{ column: 'notes', description: t('timeImport.columns.NOTES'), requirement: 'optional' },
		{
			column: 'billable',
			description: t('timeImport.columns.BILLABLE', TIME_IMPORT_EXAMPLES),
			requirement: 'optional'
		}
	];
	if (canImportForOthers) {
		rows.push({
			column: 'memberEmail',
			description: t('timeImport.columns.MEMBER_EMAIL'),
			requirement: 'optional'
		});
	}

	const requirementLabels: Record<Requirement, string | null> = {
		required: t('timeImport.columns.REQUIRED'),
		oneOfTwo: t('timeImport.columns.ONE_OF_TWO'),
		optional: null
	};

	return (
		<SettingsSection
			title={t('timeImport.COLUMNS_TITLE')}
			description={t('timeImport.COLUMNS_DESCRIPTION', { timeZone })}
		>
			<SettingsSurface>
				<dl className="flex flex-col hairline-divide-y divide-border">
					{rows.map((row) => {
						const requirementLabel = requirementLabels[row.requirement];
						return (
							<div
								key={row.column}
								className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
							>
								<dt className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 sm:w-44">
									<code className={HEADER_CHIP}>{TIME_IMPORT_HEADERS[row.column]}</code>
									{requirementLabel && (
										<span className="text-[11px] font-medium text-muted-foreground">
											{requirementLabel}
										</span>
									)}
								</dt>
								<dd className="min-w-0 flex-1 text-xs leading-5 text-pretty text-muted-foreground">
									{row.description}
								</dd>
							</div>
						);
					})}
				</dl>
			</SettingsSurface>
		</SettingsSection>
	);
}
