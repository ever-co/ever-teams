'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { RichTextView } from '@/core/components/common/rich-editor/rich-text-view';
import { ArrowLeft, X } from '@/core/components/icons';
import { useDocsVersion, useDocsVersions } from '@/core/hooks/docs/use-docs-versions';
import { cn } from '@/core/lib/helpers';
import type { IDocumentVersion } from '@/core/types/interfaces/common/docs';

interface DocsVersionPanelProps {
	pageId: string;
	onClose: () => void;
	onRestore: (versionId: string) => Promise<void>;
}

function authorOf(version: IDocumentVersion): string | null {
	const user = version.createdBy?.user;
	if (!user) return null;
	const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
	return user.name || full || null;
}

/** The page's versions by day; one opens as a preview and can be put back. */
export function DocsVersionPanel({ pageId, onClose, onRestore }: DocsVersionPanelProps) {
	const t = useTranslations();
	const locale = useLocale();
	const { days, isLoading, isError, retry, total } = useDocsVersions(pageId, true);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { version, isLoading: isPreviewLoading } = useDocsVersion(pageId, selectedId, true);
	const [isConfirming, setIsConfirming] = useState(false);
	const [isRestoring, setIsRestoring] = useState(false);

	const timeFormat = useMemo(() => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }), [locale]);
	const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }), [locale]);
	const todayKey = useMemo(() => dayKeyOf(new Date()), []);
	const yesterdayKey = useMemo(() => dayKeyOf(new Date(Date.now() - 86_400_000)), []);

	const dayLabel = (day: string) => {
		if (day === todayKey) return t('docs.TODAY');
		if (day === yesterdayKey) return t('docs.YESTERDAY');
		const date = new Date(`${day}T00:00:00`);
		return Number.isNaN(date.getTime()) ? day : dayFormat.format(date);
	};

	const restore = async () => {
		if (!selectedId) return;
		setIsRestoring(true);
		try {
			await onRestore(selectedId);
			setIsConfirming(false);
			setSelectedId(null);
		} finally {
			setIsRestoring(false);
		}
	};

	return (
		<aside className="flex h-full w-full flex-col border-l border-border bg-background lg:w-80" aria-label={t('docs.VERSION_HISTORY')}>
			<div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
				{selectedId ? (
					<button type="button" onClick={() => setSelectedId(null)} aria-label={t('docs.BACK')} className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
						<ArrowLeft className="size-4" />
					</button>
				) : null}
				<h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{selectedId ? t('docs.VERSION_PREVIEW') : t('docs.VERSION_HISTORY')}</h2>
				<button type="button" onClick={onClose} aria-label={t('docs.CLOSE')} className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground">
					<X className="size-4" />
				</button>
			</div>
			{selectedId ? (
				<div className="flex min-h-0 flex-1 flex-col">
					<div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
						{isPreviewLoading || !version ? (
							<p className="text-sm text-muted-foreground">{t('docs.LOADING')}</p>
						) : (
							<>
								<h3 className="mb-3 text-lg font-semibold">{version.name}</h3>
								<RichTextView value={version.contentHtml ?? ''} emptyState={<p className="text-sm text-muted-foreground">{t('docs.EMPTY_VERSION')}</p>} />
							</>
						)}
					</div>
					<div className="shrink-0 border-t border-border p-3">
						<Button type="button" className="w-full" disabled={!version || isRestoring} onClick={() => setIsConfirming(true)}>
							{t('docs.RESTORE_VERSION')}
						</Button>
					</div>
				</div>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto p-2">
					{isLoading && <p className="px-2 py-1 text-sm text-muted-foreground">{t('docs.LOADING')}</p>}
					{isError && (
						<div className="px-2 py-1 text-sm">
							<p className="text-muted-foreground">{t('docs.LOAD_ERROR')}</p>
							<Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => retry()}>
								{t('docs.RETRY')}
							</Button>
						</div>
					)}
					{!isLoading && !isError && total === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">{t('docs.NO_VERSIONS')}</p>}
					{days.map((group) => (
						<section key={group.day} className="mb-2">
							<h3 className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{dayLabel(group.day)}</h3>
							<ul className="flex flex-col gap-px">
								{group.versions.map((item) => {
									const author = authorOf(item);
									return (
										<li key={item.id}>
											<button
												type="button"
												onClick={() => setSelectedId(item.id)}
												className={cn('flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-foreground/[0.05]')}
											>
												<span className="text-sm">{timeFormat.format(new Date(item.lastSavedAt))}</span>
												<span className="truncate text-xs text-muted-foreground">{author ? t('docs.VERSION_BY', { name: author }) : item.name}</span>
											</button>
										</li>
									);
								})}
							</ul>
						</section>
					))}
				</div>
			)}
			<AlertDialogConfirmation
				isOpen={isConfirming}
				onOpenChange={setIsConfirming}
				title={t('docs.RESTORE_VERSION')}
				description={t('docs.RESTORE_VERSION_TEXT')}
				confirmText={t('docs.RESTORE')}
				cancelText={t('docs.CANCEL')}
				loading={isRestoring}
				onConfirm={() => void restore()}
				onCancel={() => setIsConfirming(false)}
			/>
		</aside>
	);
}

function dayKeyOf(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
