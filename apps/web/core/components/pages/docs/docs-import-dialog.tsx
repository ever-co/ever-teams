'use client';

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/core/components/common/dialog';
import { RadioMark } from '@/core/components/common/radio-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { FileZip, Spinner } from '@/core/components/icons';
import type { DocsImportRun } from '@/core/hooks/docs/use-docs-import';
import {
	DOCS_IMPORT_REPORT_ROWS,
	errorKeyOf,
	formatLimit,
	importProgressPercent,
	importReportGroups,
	isZipFile,
	phaseKeyOf,
	reasonKeyOf
} from '@/core/lib/utils/docs-import';
import { EDocumentVisibility, type IDocumentSpace } from '@/core/types/interfaces/common/docs';
import type { IDocumentImportTarget } from '@/core/types/interfaces/common/docs-import';

/** The items not imported that the report lists; the others are counted under it. */
const NOT_IMPORTED_ROWS = DOCS_IMPORT_REPORT_ROWS * 2;

/** Where the import may land. */
interface DocsImportChoice {
	key: string;
	label: string;
	target: IDocumentImportTarget;
}

interface DocsImportDialogProps {
	open: boolean;
	/** The largest zip the platform takes (its probe). */
	maxZipBytes: number;
	/** The page the import may land under (the open page), if any. */
	parent: { id: string; name: string } | null;
	/** The reader's team spaces, on a platform with Docs collaboration. */
	teamSpaces: IDocumentSpace[];
	/** The import run, which the page owns (`useDocsImportRun`): it outlives the dialog. */
	run: DocsImportRun;
	/** Opens an imported page (and closes the dialog). */
	onOpenPage: (pageId: string) => void;
	onClose: () => void;
}

/**
 * Import of an exported workspace into Docs (ever-gauzy `docs-import-export` FR-17): pick a zip (a Markdown vault or
 * an HTML export zip), choose where it lands (under the open page, or at the top of the workspace, a team space or
 * the private pages), start, follow the progress, then read the report: the imported pages to open, and what was not
 * imported, with the reason. The import goes on on the platform when the dialog closes.
 *
 * Mounted only while it is open (its owner renders it then). The run is the page's: a dialog closed while an import
 * runs shows its progress, or its report, when it opens again; otherwise each opening starts afresh.
 */
export function DocsImportDialog({ open, maxZipBytes, parent, teamSpaces, run, onOpenPage, onClose }: DocsImportDialogProps) {
	const t = useTranslations();
	const inputRef = useRef<HTMLInputElement>(null);
	const [file, setFile] = useState<File | null>(null);
	const [fileError, setFileError] = useState<string | null>(null);

	const choices = useMemo<DocsImportChoice[]>(
		() => [
			...(parent ? [{ key: 'parent', label: t('docs.IMPORT.UNDER', { title: parent.name || t('docs.UNTITLED') }), target: { parentId: parent.id } }] : []),
			{ key: 'workspace', label: t('docs.WORKSPACE'), target: { visibility: EDocumentVisibility.ORGANIZATION } },
			...teamSpaces.map((space) => ({
				key: `team:${space.organizationTeamId}`,
				label: space.name || t('docs.TEAM_SPACE'),
				target: { visibility: EDocumentVisibility.TEAM, organizationTeamId: space.organizationTeamId ?? null }
			})),
			{ key: 'private', label: t('docs.PRIVATE'), target: { visibility: EDocumentVisibility.PRIVATE } }
		],
		[parent, t, teamSpaces]
	);
	// The page's owner mounts the dialog when it opens, so every opening starts from a fresh state.
	const [choiceKey, setChoiceKey] = useState<string>(parent ? 'parent' : 'workspace');

	const limit = maxZipBytes ? formatLimit(maxZipBytes) : '';
	const groups = importReportGroups(run.current);
	const progress = importProgressPercent(run.current);
	const shownError = fileError ?? (run.error ? errorKeyOf(run.error) : null);

	const pick = (event: ChangeEvent<HTMLInputElement>) => {
		const picked = event.target.files?.[0] ?? null;
		setFile(picked);
		if (picked && !isZipFile(picked)) setFileError('docs.IMPORT.ERROR.NOT_A_ZIP');
		else if (picked && maxZipBytes && picked.size > maxZipBytes) setFileError('docs.IMPORT.ERROR.TOO_LARGE');
		else setFileError(null);
	};

	const start = () => {
		const choice = choices.find((candidate) => candidate.key === choiceKey);
		if (!file || fileError || !choice) return;
		void run.start(file, choice.target);
	};

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t('docs.IMPORT.TITLE')}</DialogTitle>
					<DialogDescription>{t('docs.IMPORT.INTRO', { limit })}</DialogDescription>
				</DialogHeader>

				{run.step === 'pick' && (
					<div className="flex flex-col gap-4">
						<input ref={inputRef} type="file" accept=".zip,application/zip" className="hidden" onChange={pick} aria-label={t('docs.IMPORT.CHOOSE_FILE')} />
						<div className="flex min-w-0 items-center gap-3">
							<Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
								<FileZip className="size-4" />
								{t('docs.IMPORT.CHOOSE_FILE')}
							</Button>
							<span className="min-w-0 truncate text-sm text-muted-foreground">{file?.name ?? t('docs.IMPORT.NO_FILE')}</span>
						</div>
						{shownError && (
							<p role="alert" className="text-sm text-destructive">
								{t(shownError as Parameters<typeof t>[0], { limit })}
							</p>
						)}
						<div className="flex flex-col gap-1" role="radiogroup" aria-label={t('docs.IMPORT.TARGET')}>
							<span className="text-sm font-medium text-foreground">{t('docs.IMPORT.TARGET')}</span>
							{choices.map((choice) => (
								<button
									key={choice.key}
									type="button"
									role="radio"
									aria-checked={choiceKey === choice.key}
									onClick={() => setChoiceKey(choice.key)}
									className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-foreground/[0.05]"
								>
									<RadioMark isChecked={choiceKey === choice.key} />
									<span className="truncate">{choice.label}</span>
								</button>
							))}
						</div>
					</div>
				)}

				{(run.step === 'uploading' || run.step === 'running') && (
					<div className="flex flex-col gap-2" aria-live="polite">
						<span className="flex items-center gap-2 text-sm text-foreground">
							<Spinner className="size-4 animate-spin" />
							{run.step === 'uploading' ? t('docs.IMPORT.UPLOADING') : t(phaseKeyOf(run.current?.phase))}
						</span>
						<div
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={run.step === 'uploading' ? run.uploadPercent : progress}
							className="h-2 w-full overflow-hidden rounded-full bg-foreground/10"
						>
							<div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${run.step === 'uploading' ? run.uploadPercent : progress}%` }} />
						</div>
						{run.step === 'running' && (
							<span className="text-xs text-muted-foreground">
								{t('docs.IMPORT.PROGRESS', { done: run.current?.processedItems ?? 0, total: run.current?.totalItems ?? 0 })}
							</span>
						)}
						{run.trackingError && (
							<div role="alert" className="flex items-center justify-between gap-3 text-xs text-destructive">
								<span>{t('docs.IMPORT.TRACKING_ERROR')}</span>
								<Button type="button" variant="outline" size="sm" onClick={run.retryRead}>
									{t('docs.RETRY')}
								</Button>
							</div>
						)}
						<span className="text-xs text-muted-foreground">{t('docs.IMPORT.BACKGROUND_HINT')}</span>
					</div>
				)}

				{run.step === 'done' && run.current && (
					<div className="flex min-h-0 flex-col gap-3" role="status">
						{run.current.status === 'FAILED' ? (
							<p className="text-sm text-destructive">{t(errorKeyOf(run.current.errorCode), { limit })}</p>
						) : (
							<>
								<p className="text-sm text-foreground">
									{t('docs.IMPORT.SUMMARY', {
										imported: run.current.importedCount,
										skipped: run.current.skippedCount,
										failed: run.current.failedCount
									})}
								</p>
								{groups.unresolvedLinks > 0 && <p className="text-xs text-muted-foreground">{t('docs.IMPORT.UNRESOLVED', { count: groups.unresolvedLinks })}</p>}
								{groups.pages.length > 0 && (
									<section className="flex flex-col gap-1">
										<h3 className="text-sm font-medium">{t('docs.IMPORT.PAGES')}</h3>
										<ul className="max-h-48 overflow-y-auto rounded-md border border-border p-1">
											{groups.pages.slice(0, DOCS_IMPORT_REPORT_ROWS).map((item) => (
												<li key={item.path}>
													<button
														type="button"
														onClick={() => item.documentId && onOpenPage(item.documentId)}
														className="w-full truncate rounded px-2 py-1 text-left text-sm text-primary hover:bg-foreground/[0.05]"
													>
														{item.name || item.path}
													</button>
												</li>
											))}
										</ul>
										{groups.pages.length > DOCS_IMPORT_REPORT_ROWS && (
											<span className="text-xs text-muted-foreground">{t('docs.IMPORT.MORE', { count: groups.pages.length - DOCS_IMPORT_REPORT_ROWS })}</span>
										)}
									</section>
								)}
								{groups.notImported.length > 0 && (
									<section className="flex flex-col gap-1">
										<h3 className="text-sm font-medium">{t('docs.IMPORT.NOT_IMPORTED')}</h3>
										<ul className="max-h-48 overflow-y-auto rounded-md border border-border p-1">
											{groups.notImported.slice(0, NOT_IMPORTED_ROWS).map((item) => (
												<li key={item.path} className="flex items-center justify-between gap-3 px-2 py-1 text-sm">
													<span className="min-w-0 truncate">{item.path}</span>
													<span className="shrink-0 text-xs text-muted-foreground">{t(reasonKeyOf(item.reason))}</span>
												</li>
											))}
										</ul>
										{groups.notImported.length > NOT_IMPORTED_ROWS && (
											<span className="text-xs text-muted-foreground">{t('docs.IMPORT.MORE', { count: groups.notImported.length - NOT_IMPORTED_ROWS })}</span>
										)}
									</section>
								)}
								{run.current.report?.truncated && <p className="text-xs text-muted-foreground">{t('docs.IMPORT.TRUNCATED')}</p>}
							</>
						)}
					</div>
				)}

				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onClose}>
						{run.step === 'pick' ? t('docs.CANCEL') : t('docs.CLOSE')}
					</Button>
					{run.step === 'pick' && (
						<Button type="button" disabled={!file || Boolean(fileError)} onClick={start}>
							{t('docs.IMPORT.START')}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
