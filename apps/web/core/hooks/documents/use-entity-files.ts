'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { getOrganizationIdCookie } from '@/core/lib/helpers/cookies';
import { entityFilesService, type IEntityFileTarget } from '@/core/services/client/api/documents/entity-files.service';
import { queryKeys } from '@/core/query/keys';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import {
	commentIdOf,
	fileNameOf,
	filesByComment,
	filesOf,
	formatFileSize,
	inBatches,
	splitBySize
} from '@/core/lib/utils/entity-files';
import {
	ENTITY_FILE_MAX_BYTES,
	ENTITY_FILES_PER_UPLOAD,
	type TEntityFileLink
} from '@/core/types/schemas/documents/entity-file.schema';

/**
 * `unavailable`: the server runs without Gauzy's Documents plugin, so the section stays out of the way.
 * `forbidden`: the plugin is there, but the person's role may not read documents.
 */
type EntityFilesState = 'loading' | 'ready' | 'unavailable' | 'forbidden' | 'error';

export interface PendingUpload {
	key: string;
	name: string;
	size: number;
}

const FILES_STALE_MS = 30_000;
const MAX_RETRIES = 2;
const MAX_LISTED_NAMES = 3;

function isRefusal(error: unknown) {
	const status = errorStatusOf(error);
	const isMissing = status === 404;
	const isForbidden = status === 403;
	return isMissing || isForbidden;
}

function retriesUnlessRefused(failureCount: number, error: unknown) {
	if (isRefusal(error)) {
		return false;
	}
	return failureCount < MAX_RETRIES;
}

function failureStateOf(error: unknown): EntityFilesState {
	const status = errorStatusOf(error);
	if (status === 404) {
		return 'unavailable';
	}
	if (status === 403) {
		return 'forbidden';
	}
	return 'error';
}

function namesOf(names: string[]) {
	const shown = names.slice(0, MAX_LISTED_NAMES);
	return shown.join(', ');
}

/** Only a web address is opened; anything else from the server is refused. */
function isWebAddress(url: string) {
	try {
		const { protocol } = new URL(url);
		const isHttps = protocol === 'https:';
		const isHttp = protocol === 'http:';
		return isHttps || isHttp;
	} catch {
		return false;
	}
}

function reasonKeyOf(error: unknown) {
	return errorReasonKeyOf(error) as DottedLanguageObjectStringPaths;
}

/** The files linked to one record. Every reader of the same record shares one request. */
function useEntityFileLinks(target: IEntityFileTarget) {
	const organizationId = getOrganizationIdCookie() ?? '';
	const { entity, entityId } = target;
	const stableTarget = useMemo<IEntityFileTarget>(() => ({ entity, entityId }), [entity, entityId]);
	const queryKey = useMemo(
		() => queryKeys.entityFiles.byEntity(organizationId, entity, entityId),
		[entity, entityId, organizationId]
	);
	const query = useQuery({
		queryKey,
		queryFn: ({ signal }) => entityFilesService.listFiles(stableTarget, signal),
		retry: retriesUnlessRefused,
		staleTime: FILES_STALE_MS
	});
	return { query, queryKey, target: stableTarget };
}

function useTooLargeWarning() {
	const t = useTranslations();
	const locale = useLocale();
	return useCallback(
		(tooLarge: File[]) => {
			const names = tooLarge.map((file) => file.name);
			const maxSize = formatFileSize(ENTITY_FILE_MAX_BYTES, locale);
			toast.warning(t('entityFiles.TOO_LARGE', { count: tooLarge.length, names: namesOf(names) }), {
				description: t('entityFiles.TOO_LARGE_HINT', { size: maxSize })
			});
		},
		[locale, t]
	);
}

function useRejectionWarning() {
	const t = useTranslations();
	return useCallback(
		(rejectedNames: string[]) => {
			if (rejectedNames.length === 0) {
				return;
			}
			toast.warning(t('entityFiles.REJECTED', { count: rejectedNames.length, names: namesOf(rejectedNames) }));
		},
		[t]
	);
}

/** Opens a linked file in a new tab, opened inside the click so no popup blocker stops it; the address follows. */
export function useOpenEntityFile() {
	const t = useTranslations();
	return useCallback(
		async (link: TEntityFileLink) => {
			const opened = window.open('about:blank', '_blank');
			if (!opened) {
				toast.error(t('entityFiles.OPEN_BLOCKED'));
				return;
			}
			opened.opener = null;
			try {
				const url = await entityFilesService.downloadUrl(link.documentId);
				if (!isWebAddress(url)) {
					throw new Error('The download address is not a web address');
				}
				opened.location.href = url;
			} catch (error) {
				opened.close();
				toast.error(t('entityFiles.OPEN_FAILED'), { description: t(reasonKeyOf(error)) });
			}
		},
		[t]
	);
}

/**
 * The files of one task, project or comment: the list, the uploads in flight, removing a file (with Undo) and
 * opening one. A file is uploaded to the organization's documents, then linked to the record.
 */
export function useEntityFiles(target: IEntityFileTarget) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const { query, queryKey, target: stableTarget } = useEntityFileLinks(target);
	const warnTooLarge = useTooLargeWarning();
	const warnRejected = useRejectionWarning();
	const open = useOpenEntityFile();
	const [pending, setPending] = useState<PendingUpload[]>([]);
	const [removingIds, setRemovingIds] = useState<string[]>([]);

	const links = query.data?.items;
	const files = useMemo(() => filesOf(links ?? []), [links]);

	let state: EntityFilesState = 'ready';
	if (query.isPending) {
		state = 'loading';
	}
	if (query.isError) {
		state = failureStateOf(query.error);
	}

	const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey }), [queryClient, queryKey]);

	const uploadBatch = useCallback(
		async (batch: File[]) => {
			const uploaded = await entityFilesService.uploadFiles(batch);
			const linking = uploaded.results.map((result) =>
				entityFilesService.linkFile(result.document.id, stableTarget)
			);
			await Promise.all(linking);
			return uploaded.rejected.map((rejection) => rejection.fileName);
		},
		[stableTarget]
	);

	const upload = useCallback(
		async (picked: File[]) => {
			const { accepted, tooLarge } = splitBySize(picked, ENTITY_FILE_MAX_BYTES);
			if (tooLarge.length > 0) {
				warnTooLarge(tooLarge);
			}
			if (accepted.length === 0) {
				return;
			}
			const entries = accepted.map((file) => ({ key: crypto.randomUUID(), name: file.name, size: file.size }));
			const entryKeys = new Set(entries.map((entry) => entry.key));
			setPending((current) => [...current, ...entries]);
			const rejectedNames: string[] = [];
			try {
				for (const batch of inBatches(accepted, ENTITY_FILES_PER_UPLOAD)) {
					const refused = await uploadBatch(batch);
					rejectedNames.push(...refused);
				}
			} catch (error) {
				toast.error(t('entityFiles.UPLOAD_FAILED'), { description: t(reasonKeyOf(error)) });
			} finally {
				await refresh();
				setPending((current) => current.filter((entry) => !entryKeys.has(entry.key)));
			}
			warnRejected(rejectedNames);
		},
		[refresh, t, uploadBatch, warnRejected, warnTooLarge]
	);

	const relink = useCallback(
		async (link: TEntityFileLink) => {
			try {
				await entityFilesService.linkFile(link.documentId, stableTarget, metadataOf(link));
				await refresh();
			} catch (error) {
				toast.error(t('entityFiles.UNDO_FAILED'), { description: t(reasonKeyOf(error)) });
			}
		},
		[refresh, stableTarget, t]
	);

	const remove = useCallback(
		async (link: TEntityFileLink) => {
			setRemovingIds((current) => [...current, link.id]);
			try {
				await entityFilesService.unlinkFile(link.id);
				await refresh();
				toast.success(t('entityFiles.REMOVED', { name: fileNameOf(link) }), {
					action: { label: t('entityFiles.UNDO'), onClick: () => void relink(link) }
				});
			} catch (error) {
				toast.error(t('entityFiles.REMOVE_FAILED'), { description: t(reasonKeyOf(error)) });
			} finally {
				setRemovingIds((current) => current.filter((id) => id !== link.id));
			}
		},
		[refresh, relink, t]
	);

	return {
		state,
		files,
		pending,
		removingIds,
		upload,
		remove,
		open,
		retry: query.refetch
	};
}

export type EntityFiles = ReturnType<typeof useEntityFiles>;

/** Undo puts a comment's file back on the task with its comment, so the comment shows it again. */
function metadataOf(link: TEntityFileLink) {
	const commentId = commentIdOf(link);
	if (!commentId) {
		return undefined;
	}
	return { commentId };
}

/**
 * Attaches the files of a comment just posted. Each file is linked to the comment, and to the task with the
 * comment's id, so one request on the task gives the files of all its comments.
 */
export function useCommentFileAttacher() {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const warnTooLarge = useTooLargeWarning();
	const warnRejected = useRejectionWarning();
	return useCallback(
		async (commentId: string, taskId: string, files: File[]) => {
			const { accepted, tooLarge } = splitBySize(files, ENTITY_FILE_MAX_BYTES);
			if (tooLarge.length > 0) {
				warnTooLarge(tooLarge);
			}
			if (accepted.length === 0) {
				return;
			}
			const commentTarget: IEntityFileTarget = { entity: 'Comment', entityId: commentId };
			const taskTarget: IEntityFileTarget = { entity: 'Task', entityId: taskId };
			const rejectedNames: string[] = [];
			try {
				for (const batch of inBatches(accepted, ENTITY_FILES_PER_UPLOAD)) {
					const uploaded = await entityFilesService.uploadFiles(batch);
					const linking: Promise<TEntityFileLink>[] = [];
					for (const result of uploaded.results) {
						const documentId = result.document.id;
						linking.push(
							entityFilesService.linkFile(documentId, commentTarget),
							entityFilesService.linkFile(documentId, taskTarget, { commentId })
						);
					}
					await Promise.all(linking);
					const refused = uploaded.rejected.map((rejection) => rejection.fileName);
					rejectedNames.push(...refused);
				}
			} catch (error) {
				toast.error(t('entityFiles.COMMENT_FILES_FAILED'), { description: t(reasonKeyOf(error)) });
			} finally {
				await queryClient.invalidateQueries({ queryKey: queryKeys.entityFiles.all });
			}
			warnRejected(rejectedNames);
		},
		[queryClient, t, warnRejected, warnTooLarge]
	);
}

/** The files of each comment of a task, read from the task's own file list. */
export function useTaskCommentFiles(taskId: string) {
	const { query } = useEntityFileLinks({ entity: 'Task', entityId: taskId });
	const links = query.data?.items;
	return useMemo(() => filesByComment(links ?? []), [links]);
}

/** Files can be attached once the record's file list answered: a server without the Documents plugin never does. */
export function useCanAttachFiles(target: IEntityFileTarget) {
	const { query } = useEntityFileLinks(target);
	return query.isSuccess;
}
