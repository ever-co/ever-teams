'use client';

import { type FormEvent, useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/core/components/common/input';
import { Spinner } from '@/core/components/common/spinner';
import { Button } from '@/core/components/duplicated-components/_button';
import { SAVED_REPORT_NAME_MAX_LENGTH } from '@/core/lib/utils/dashboards/saved-report';

type NameProblem = 'required' | 'tooLong' | null;

/** A name Gauzy keeps: not blank once trimmed, 100 characters at most. */
export function savedReportNameProblemOf(name: string): NameProblem {
	const trimmed = name.trim();
	if (!trimmed) {
		return 'required';
	}
	if (trimmed.length > SAVED_REPORT_NAME_MAX_LENGTH) {
		return 'tooLong';
	}
	return null;
}

function ProblemText({ problem, id }: Readonly<{ problem: NameProblem; id: string }>) {
	const t = useTranslations();
	if (problem === 'required') {
		return (
			<p id={id} className="text-xs text-destructive">
				{t('dashboard.savedReports.NAME_REQUIRED')}
			</p>
		);
	}
	if (problem === 'tooLong') {
		return (
			<p id={id} className="text-xs text-destructive">
				{t('dashboard.savedReports.NAME_TOO_LONG')}
			</p>
		);
	}
	return null;
}

/** The name of a saved report, asked when it is saved or renamed. */
export function SavedReportNameForm({
	initialName = '',
	submitLabel,
	isSubmitting,
	onSubmit,
	onCancel
}: Readonly<{
	initialName?: string;
	submitLabel: string;
	isSubmitting: boolean;
	onSubmit: (name: string) => void;
	onCancel?: () => void;
}>) {
	const t = useTranslations();
	const inputId = useId();
	const problemId = useId();
	const [name, setName] = useState(initialName);
	const [shownProblem, setShownProblem] = useState<NameProblem>(null);

	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const problem = savedReportNameProblemOf(name);
		setShownProblem(problem);
		if (problem) {
			return;
		}
		onSubmit(name.trim());
	};

	const hasProblem = shownProblem !== null;
	let describedBy: string | undefined;
	if (hasProblem) {
		describedBy = problemId;
	}

	return (
		<form className="flex flex-col gap-2" onSubmit={submit} noValidate>
			<label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
				{t('dashboard.savedReports.NAME')}
			</label>
			<Input
				id={inputId}
				value={name}
				autoFocus
				autoComplete="off"
				maxLength={SAVED_REPORT_NAME_MAX_LENGTH + 20}
				placeholder={t('dashboard.savedReports.NAME_PLACEHOLDER')}
				aria-invalid={hasProblem}
				aria-describedby={describedBy}
				onChange={(event) => setName(event.target.value)}
			/>
			<ProblemText problem={shownProblem} id={problemId} />
			<div className="mt-1 flex justify-end gap-2">
				{onCancel && (
					<Button type="button" variant="ghost" size="sm" onClick={onCancel}>
						{t('common.CANCEL')}
					</Button>
				)}
				<Button type="submit" size="sm" disabled={isSubmitting}>
					{isSubmitting && <Spinner className="size-3.5" />}
					<span>{submitLabel}</span>
				</Button>
			</div>
		</form>
	);
}
