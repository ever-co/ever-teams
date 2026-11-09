'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { ArrowLeft, FileText, Trash } from '@/core/components/icons';
import { useDocsTrash } from '@/core/hooks/docs/use-docs-tree';
import { pageTitle } from '@/core/lib/utils/docs-tree';
import type { IDocumentPage } from '@/core/types/interfaces/common/docs';

interface DocsTrashProps {
	onRestore: (page: IDocumentPage) => Promise<void>;
	onDelete: (page: IDocumentPage) => Promise<void>;
}

/** The pages in the trash: each can go back to the tree, or away for good. */
export function DocsTrash({ onRestore, onDelete }: DocsTrashProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { pages, isLoading, isError, retry } = useDocsTrash(true);
	const [deleting, setDeleting] = useState<IDocumentPage | null>(null);
	const [busyId, setBusyId] = useState<string | null>(null);
	const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }), [locale]);

	const run = async (page: IDocumentPage, action: (page: IDocumentPage) => Promise<void>) => {
		setBusyId(page.id);
		try {
			await action(page);
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
				<Link href="/docs" className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground lg:hidden" aria-label={t('docs.BACK')}>
					<ArrowLeft className="size-4" />
				</Link>
				<Trash className="size-4 text-muted-foreground" aria-hidden="true" />
				<h2 className="text-sm font-semibold">{t('docs.TRASH')}</h2>
			</div>
			<div className="min-h-0 flex-1 overflow-y-auto p-4">
				{isLoading && <p className="text-sm text-muted-foreground">{t('docs.LOADING')}</p>}
				{isError && (
					<div className="text-sm">
						<p className="text-muted-foreground">{t('docs.LOAD_ERROR')}</p>
						<Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => retry()}>
							{t('docs.RETRY')}
						</Button>
					</div>
				)}
				{!isLoading && !isError && pages.length === 0 && (
					<AnimatedEmptyState title={t('docs.TRASH_EMPTY_TITLE')} message={t('docs.TRASH_EMPTY_TEXT')} showBorder={false} />
				)}
				{pages.length > 0 && (
					<ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
						{pages.map((page) => (
							<li key={page.id} className="flex items-center gap-3 px-3 py-2">
								<span className="flex size-6 shrink-0 items-center justify-center text-lg" aria-hidden="true">
									{page.icon || <FileText className="size-4 text-muted-foreground" />}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{pageTitle(page, t('docs.UNTITLED'))}</p>
									<p className="text-xs text-muted-foreground">
										{page.archivedAt ? t('docs.TRASHED_AT', { date: dateFormat.format(new Date(page.archivedAt)) }) : t('docs.IN_TRASH')}
									</p>
								</div>
								<Button type="button" variant="outline" size="sm" disabled={busyId === page.id} onClick={() => void run(page, onRestore)}>
									{t('docs.RESTORE')}
								</Button>
								<Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={busyId === page.id} onClick={() => setDeleting(page)}>
									{t('docs.DELETE_FOREVER')}
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>
			<AlertDialogConfirmation
				isOpen={deleting !== null}
				onOpenChange={(open) => !open && setDeleting(null)}
				title={t('docs.DELETE_FOREVER')}
				description={t('docs.DELETE_FOREVER_TEXT', { title: pageTitle(deleting, t('docs.UNTITLED')) })}
				confirmText={t('docs.DELETE_FOREVER')}
				cancelText={t('docs.CANCEL')}
				loading={busyId !== null && busyId === deleting?.id}
				onConfirm={() => {
					if (!deleting) return;
					void run(deleting, onDelete).then(() => setDeleting(null));
				}}
				onCancel={() => setDeleting(null)}
			/>
		</div>
	);
}
