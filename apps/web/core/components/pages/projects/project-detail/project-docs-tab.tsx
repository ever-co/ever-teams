'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AnimatedEmptyState } from '@/core/components/common/empty-state';
import { Button } from '@/core/components/duplicated-components/_button';
import { FileText, Link as LinkIcon, Plus, X } from '@/core/components/icons';
import { DocsPickPageDialog } from '@/core/components/pages/docs/docs-dialogs';
import { useDocsActions } from '@/core/hooks/docs/use-docs-actions';
import { useDocsProjectPages } from '@/core/hooks/docs/use-docs-project-pages';
import { useDocsTree } from '@/core/hooks/docs/use-docs-tree';
import { useProjectPermissions } from '@/core/hooks/projects/use-project-permissions';
import { pageTitle } from '@/core/lib/utils/docs-tree';
import { EDocumentKind, EDocumentVisibility } from '@/core/types/interfaces/common/docs';
import type { TOrganizationProject } from '@/core/types/schemas';

interface ProjectDocsTabProps {
	project: TOrganizationProject;
}

/** The pages attached to the project: open one, write a new one here, attach an existing one, or detach. */
export function ProjectDocsTab({ project }: ProjectDocsTabProps) {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const { canEdit } = useProjectPermissions({ members: project.members });
	const { pages, isLoading, isError, retry } = useDocsProjectPages(project.id, true);
	const tree = useDocsTree(true);
	// Only pages are attached (the tab and the attachments list show pages); folders are left out of the picker.
	const attachable = useMemo(() => tree.pages.filter((page) => page.kind === EDocumentKind.PAGE), [tree.pages]);
	const actions = useDocsActions();
	const [isPicking, setIsPicking] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const dateFormat = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }), [locale]);
	const attachedIds = useMemo(() => new Set(pages.map((page) => page.pageId)), [pages]);

	const newPage = async () => {
		setBusyId('new');
		try {
			const page = await actions.createPage({ name: t('docs.UNTITLED'), parentId: null, visibility: EDocumentVisibility.ORGANIZATION });
			await actions.attachToProject(page.id, project.id);
			router.push(`/docs/${encodeURIComponent(page.id)}`);
		} catch (error) {
			toast.error(error instanceof Error && error.message ? error.message : t('docs.CREATE_ERROR'));
		} finally {
			setBusyId(null);
		}
	};

	const detach = async (linkId: string) => {
		setBusyId(linkId);
		try {
			await actions.detachFromProject(linkId, project.id);
		} catch (error) {
			toast.error(error instanceof Error && error.message ? error.message : t('docs.UPDATE_ERROR'));
		} finally {
			setBusyId(null);
		}
	};

	return (
		<div className="flex flex-col gap-4 px-4 py-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="text-sm font-semibold">{t('docs.PROJECT_PAGES')}</h2>
				{canEdit && (
					<div className="flex gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => setIsPicking(true)}>
							<LinkIcon className="size-4" />
							{t('docs.ATTACH_PAGE')}
						</Button>
						<Button type="button" size="sm" disabled={busyId === 'new'} onClick={() => void newPage()}>
							<Plus className="size-4" />
							{t('docs.NEW_PAGE')}
						</Button>
					</div>
				)}
			</div>
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
				<AnimatedEmptyState title={t('docs.PROJECT_PAGES_EMPTY_TITLE')} message={t('docs.PROJECT_PAGES_EMPTY_TEXT')} showBorder={false} />
			)}
			{pages.length > 0 && (
				<ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
					{pages.map((page) => (
						<li key={page.linkId} className="flex items-center gap-3 px-3 py-2">
							<span className="flex size-6 shrink-0 items-center justify-center text-lg" aria-hidden="true">
								{page.icon || <FileText className="size-4 text-muted-foreground" />}
							</span>
							<Link href={`/docs/${encodeURIComponent(page.pageId)}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:underline">
								{pageTitle({ name: page.name }, t('docs.UNTITLED'))}
							</Link>
							{page.updatedAt && <span className="shrink-0 text-xs text-muted-foreground">{dateFormat.format(new Date(page.updatedAt))}</span>}
							{canEdit && (
								<button
									type="button"
									onClick={() => void detach(page.linkId)}
									disabled={busyId === page.linkId}
									aria-label={t('docs.DETACH_PAGE')}
									title={t('docs.DETACH_PAGE')}
									className="rounded p-1 text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
								>
									<X className="size-4" />
								</button>
							)}
						</li>
					))}
				</ul>
			)}
			<DocsPickPageDialog
				open={isPicking}
				title={t('docs.ATTACH_PAGE')}
				description={t('docs.ATTACH_PAGE_TEXT')}
				pages={attachable}
				excludeIds={attachedIds}
				onPick={async (page) => {
					try {
						await actions.attachToProject(page.id, project.id);
					} catch (error) {
						toast.error(error instanceof Error && error.message ? error.message : t('docs.UPDATE_ERROR'));
					}
				}}
				onClose={() => setIsPicking(false)}
			/>
		</div>
	);
}
