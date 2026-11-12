'use client';

import { type ReactNode, useId, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Button } from '@/core/components/duplicated-components/_button';
import { SettingsReadOnlyNote, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { cn } from '@/core/lib/helpers';
import type { DateOrder } from '@/core/lib/utils/time-import-cells';
import {
	CHOOSABLE_DATE_ORDERS,
	type DateOrderReading,
	type TimeImportColumnsStep as TimeImportColumnsStepData,
	type TimeImportColumnsStepField
} from '@/core/lib/utils/time-import-columns';
import type { TimeImportField, TimeImportRecord } from '@/core/lib/utils/time-import-sheet';
import { FILE_NAME_TEXT, type TimeImportCopy } from './time-import-copy';

/** One grid for the column labels and every row, once the three columns fit side by side. */
const STEP_ROW =
	'flex flex-col gap-1.5 px-4 py-2.5 sm:grid sm:grid-cols-[10rem_minmax(0,14rem)_minmax(0,1fr)] sm:items-center sm:gap-x-4';

const STEP_LABEL = 'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[13px] font-medium text-foreground';

const STEP_CONTROL = 'h-8 w-full text-[13px]';

const STEP_SAMPLE = 'truncate text-xs text-muted-foreground';

const FIRST_ROWS_HEAD = 'px-3 py-1.5 font-medium whitespace-nowrap text-muted-foreground first:pl-0';

const FIRST_ROWS_CELL = 'px-3 py-1.5 text-foreground first:pl-0';

const NOT_IN_FILE = 'none';

const NO_VALUE = '–';

const PART_SEPARATOR = ' · ';

type Requirement = 'required' | 'oneOfTwo' | 'optional';

const REQUIREMENTS: Readonly<Record<TimeImportField, Requirement>> = {
	date: 'required',
	startTime: 'required',
	endDate: 'optional',
	endTime: 'oneOfTwo',
	duration: 'oneOfTwo',
	project: 'optional',
	task: 'optional',
	notes: 'optional',
	billable: 'optional',
	memberEmail: 'optional'
};

interface ColumnOption {
	value: string;
	label: string;
}

/** The file's columns a field can be read from: those with a header, by their position in the file. */
function columnOptionsOf(headers: ReadonlyArray<string>): ColumnOption[] {
	const options: ColumnOption[] = [];
	headers.forEach((header, index) => {
		if (header !== '') {
			options.push({ value: String(index), label: header });
		}
	});
	return options;
}

function selectValueOf(columnIndex: number | null, isOptional: boolean): string {
	if (columnIndex !== null) {
		return String(columnIndex);
	}
	if (isOptional) {
		return NOT_IN_FILE;
	}
	return '';
}

function columnIndexOfValue(value: string): number | null {
	if (value === NOT_IN_FILE) {
		return null;
	}
	return Number(value);
}

function cellTextOf(record: TimeImportRecord, columnIndex: number): string {
	const cell = record.cells[columnIndex] ?? '';
	return cell.trim();
}

/** The date a file writes first, the one that tells its format or asks for it. */
function dateValueOf(dates: DateOrderReading): string | null {
	if (dates.kind === 'none') {
		return null;
	}
	return dates.value;
}

interface ColumnRowProps {
	item: TimeImportColumnsStepField;
	headers: ReadonlyArray<string>;
	options: ReadonlyArray<ColumnOption>;
	copy: TimeImportCopy;
	onChooseColumn: (field: TimeImportField, columnIndex: number | null) => void;
}

function ColumnRow({ item, headers, options, copy, onChooseColumn }: Readonly<ColumnRowProps>) {
	const t = useTranslations();
	const selectId = useId();
	const sampleId = useId();
	const requirement = REQUIREMENTS[item.field];
	const isOptional = requirement !== 'required';

	let requirementLabel: string | null = null;
	if (requirement === 'required') {
		requirementLabel = t('timeImport.columns.REQUIRED');
	}
	if (requirement === 'oneOfTwo') {
		requirementLabel = t('timeImport.columns.ONE_OF_TWO');
	}
	let chosenLabel: ReactNode = undefined;
	if (item.columnIndex !== null) {
		chosenLabel = headers[item.columnIndex];
	}
	const showsNotInFile = item.columnIndex === null && isOptional;
	if (showsNotInFile) {
		chosenLabel = <span className="text-muted-foreground">{t('timeImport.mapping.NOT_IN_FILE')}</span>;
	}

	return (
		<div className={STEP_ROW}>
			<label htmlFor={selectId} className={STEP_LABEL}>
				{copy.fieldLabel(item.field)}
				{requirementLabel && (
					<span className="text-[11px] font-medium text-muted-foreground">{requirementLabel}</span>
				)}
			</label>
			<Select
				value={selectValueOf(item.columnIndex, isOptional)}
				onValueChange={(next) => onChooseColumn(item.field, columnIndexOfValue(next))}
			>
				<SelectTrigger id={selectId} aria-describedby={sampleId} className={STEP_CONTROL}>
					<SelectValue placeholder={t('timeImport.mapping.CHOOSE_COLUMN')}>{chosenLabel}</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{isOptional && (
						<SelectItem value={NOT_IN_FILE} className="text-[13px] text-muted-foreground">
							{t('timeImport.mapping.NOT_IN_FILE')}
						</SelectItem>
					)}
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value} className="text-[13px]">
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p id={sampleId} title={item.sample ?? undefined} className={STEP_SAMPLE}>
				{item.sample ?? NO_VALUE}
			</p>
		</div>
	);
}

interface DateFormatRowProps {
	step: TimeImportColumnsStepData;
	copy: TimeImportCopy;
	onChooseDateOrder: (order: DateOrder) => void;
}

/** The format the dates are read in: asked when every date of the file fits two, else shown as the file tells it. */
function DateFormatRow({ step, copy, onChooseDateOrder }: Readonly<DateFormatRowProps>) {
	const t = useTranslations();
	const selectId = useId();
	const sampleId = useId();
	const { dates, dateOrder } = step;
	const isAsked = dates.kind === 'ambiguous';
	const value = dateValueOf(dates);

	let sample = value ?? NO_VALUE;
	let reading: string | null = null;
	if (value && dateOrder) {
		reading = copy.dateReadingOf(value, dateOrder);
	}
	if (value && reading) {
		sample = `${value}${PART_SEPARATOR}${reading}`;
	}
	let orderLabel = NO_VALUE;
	if (dateOrder) {
		orderLabel = copy.dateOrderLabel(dateOrder);
	}

	const chooseOrder = (next: string) => {
		const order = CHOOSABLE_DATE_ORDERS.find((candidate) => candidate === next);
		if (order) {
			onChooseDateOrder(order);
		}
	};

	if (!isAsked) {
		return (
			<div className={STEP_ROW}>
				<span className={STEP_LABEL}>{t('timeImport.mapping.DATE_FORMAT')}</span>
				<span className="flex h-8 items-center text-[13px] text-foreground">{orderLabel}</span>
				<p className={STEP_SAMPLE}>{sample}</p>
			</div>
		);
	}
	return (
		<div className={STEP_ROW}>
			<label htmlFor={selectId} className={STEP_LABEL}>
				{t('timeImport.mapping.DATE_FORMAT')}
			</label>
			<Select value={dateOrder ?? ''} onValueChange={chooseOrder}>
				<SelectTrigger id={selectId} aria-describedby={sampleId} className={STEP_CONTROL}>
					<SelectValue placeholder={t('timeImport.mapping.CHOOSE_DATE_FORMAT')}>
						{dateOrder && copy.dateOrderLabel(dateOrder)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					{CHOOSABLE_DATE_ORDERS.map((order) => (
						<SelectItem key={order} value={order} className="text-[13px]">
							{copy.dateOrderLabel(order)}
							{value && (
								<span className="ml-2 text-muted-foreground">{copy.dateReadingOf(value, order)}</span>
							)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<p id={sampleId} className={STEP_SAMPLE}>
				{sample}
			</p>
		</div>
	);
}

function FirstRows({ step }: Readonly<{ step: TimeImportColumnsStepData }>) {
	const t = useTranslations();
	const labelId = useId();
	const columnIndexes = step.headers.map((_, index) => index);

	return (
		<div className="flex flex-col gap-2 px-4 py-3">
			<p id={labelId} className="text-xs font-medium text-muted-foreground">
				{t('timeImport.mapping.FIRST_ROWS')}
			</p>
			<div className="overflow-x-auto">
				<table aria-labelledby={labelId} className="w-max min-w-full text-left text-xs">
					<thead>
						<tr className="hairline-b border-border">
							{columnIndexes.map((columnIndex) => (
								<th key={columnIndex} scope="col" className={FIRST_ROWS_HEAD}>
									{step.headers[columnIndex]}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="hairline-divide-y divide-border">
						{step.firstRows.map((record) => (
							<tr key={record.row}>
								{columnIndexes.map((columnIndex) => (
									<td key={columnIndex} className={FIRST_ROWS_CELL}>
										<span className="block max-w-48 truncate">
											{cellTextOf(record, columnIndex)}
										</span>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

interface TimeImportColumnsStepProps {
	fileName: string;
	step: TimeImportColumnsStepData;
	copy: TimeImportCopy;
	onChooseColumn: (field: TimeImportField, columnIndex: number | null) => void;
	onChooseDateOrder: (order: DateOrder) => void;
	onConfirm: () => void;
	onChooseAnother: () => void;
}

/**
 * The Columns step of a file the import cannot read by itself: for each part of an entry, the file's column it is
 * read from and the first value that column holds, the format of the dates when the file does not tell it, and the
 * first rows of the file under it. The rows are checked once the date, the start and the end or the duration are
 * chosen.
 */
export function TimeImportColumnsStep({
	fileName,
	step,
	copy,
	onChooseColumn,
	onChooseDateOrder,
	onConfirm,
	onChooseAnother
}: Readonly<TimeImportColumnsStepProps>) {
	const t = useTranslations();
	const blockerId = useId();
	const options = useMemo(() => columnOptionsOf(step.headers), [step.headers]);

	let blockerText: string | null = null;
	if (step.blocker === 'missing') {
		const parts = step.missing.map((column) => copy.missingPartOf(column));
		blockerText = t('timeImport.mapping.MISSING', { parts: copy.listOf(parts) });
	}
	if (step.blocker === 'dateOrder') {
		blockerText = t('timeImport.mapping.DATE_FORMAT_MISSING');
	}
	const isMixed = step.blocker === 'mixedDates';
	if (isMixed && step.dates.kind === 'mixed') {
		blockerText = copy.mixedDatesText(step.dates);
	}
	const canCheck = step.blocker === null;
	let describedBy: string | undefined = undefined;
	if (blockerText) {
		describedBy = blockerId;
	}
	const showsLeftOut = step.leftOutHeaders.length > 0;

	return (
		<SettingsSection
			id="time-import"
			title={t('timeImport.COLUMNS_TITLE')}
			description={<span className={FILE_NAME_TEXT}>{t('timeImport.mapping.DESCRIPTION', { fileName })}</span>}
		>
			<SettingsSurface>
				<div
					aria-hidden="true"
					className={cn(STEP_ROW, 'hidden py-2 text-xs font-medium text-muted-foreground sm:grid')}
				>
					<span>{t('timeImport.mapping.HEADER_PART')}</span>
					<span>{t('timeImport.mapping.HEADER_COLUMN')}</span>
					<span>{t('timeImport.mapping.HEADER_SAMPLE')}</span>
				</div>
				{step.fields.map((item) => (
					<ColumnRow
						key={item.field}
						item={item}
						headers={step.headers}
						options={options}
						copy={copy}
						onChooseColumn={onChooseColumn}
					/>
				))}
				<DateFormatRow step={step} copy={copy} onChooseDateOrder={onChooseDateOrder} />
				<FirstRows step={step} />
				<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
					{blockerText && (
						<p
							id={blockerId}
							role="status"
							className="min-w-0 flex-1 basis-56 text-xs text-pretty text-muted-foreground"
						>
							{blockerText}
						</p>
					)}
					<div className="ml-auto flex flex-wrap items-center gap-2">
						<Button type="button" variant="outline" onClick={onChooseAnother}>
							{t('timeImport.CHOOSE_ANOTHER')}
						</Button>
						<Button type="button" onClick={onConfirm} disabled={!canCheck} aria-describedby={describedBy}>
							{t('timeImport.mapping.CONTINUE', { count: step.rowCount })}
						</Button>
					</div>
				</div>
			</SettingsSurface>
			{showsLeftOut && (
				<SettingsReadOnlyNote>
					{t('timeImport.IGNORED_COLUMNS', {
						count: step.leftOutHeaders.length,
						columns: copy.listOf(step.leftOutHeaders)
					})}
				</SettingsReadOnlyNote>
			)}
		</SettingsSection>
	);
}
