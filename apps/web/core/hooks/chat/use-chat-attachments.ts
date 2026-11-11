'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { useDocsAvailability } from '@/core/hooks/docs/use-docs-availability';
import { chatService } from '@/core/services/client/api/chat';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import { formatFileSize } from '@/core/lib/utils/entity-files';
import {
	isShrinkableImage,
	isUploadingAny,
	readyAttachmentIds,
	withinAttachmentLimit,
	type ChatAttachmentDraft
} from '@/core/lib/utils/chat-attachments';
import { shrinkImage } from '@/core/lib/utils/chat-image-shrink';
import { newNonce } from '@/core/lib/utils/chat-format';
import { CHAT_MESSAGE_MAX_ATTACHMENTS } from '@/core/types/interfaces/common/chat';
import { ENTITY_FILE_MAX_BYTES } from '@/core/types/schemas/documents/entity-file.schema';
import { useChatScope } from './use-chat-scope';

/**
 * How large a photo may be when picked: it is shrunk in the browser before the platform's size cap applies, so a
 * photo over the cap can still go up once smaller; past this, the browser is not asked to decode it at all.
 */
const CHAT_IMAGE_PICK_MAX_BYTES = 2 * ENTITY_FILE_MAX_BYTES;

/** What the composer shows of a file it holds, and what a message just sent shows of its files until the list has them. */
export interface ChatUploadedFile {
	documentId: string;
	name: string;
	mimeType: string;
	size: number;
}

/**
 * The files this tab uploaded, by document id: a message just sent names its files before the conversation's file
 * list has them, and shows their names meanwhile. Kept for the page's life only.
 */
const uploadedFiles = new Map<string, ChatUploadedFile>();

/** The file this tab uploaded under a document id, if any (its name and kind, before the files list has it). */
export function uploadedFileOf(documentId: string): ChatUploadedFile | undefined {
	return uploadedFiles.get(documentId);
}

/**
 * The accounts and organizations whose role the platform refused an upload (`tenant:organization:user`): the
 * composer stops offering to attach there, and only there; another organization of the same person still offers it.
 */
const forbiddenScopes = new Set<string>();

/** For the specs. */
export function resetChatUploads(): void {
	uploadedFiles.clear();
	forbiddenScopes.clear();
}

function canPreview(file: File): boolean {
	return (
		file.type.startsWith('image/') &&
		!file.type.includes('svg') &&
		typeof URL !== 'undefined' &&
		typeof URL.createObjectURL === 'function'
	);
}

function revoke(item: ChatAttachmentDraft): void {
	if (item.previewUrl && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(item.previewUrl);
}

/** Whether a picked file is too large to go up: over the platform's cap, or, for a photo shrunk first, over its own. */
function isTooLarge(file: File): boolean {
	if (isShrinkableImage(file.type)) return file.size > CHAT_IMAGE_PICK_MAX_BYTES;
	return file.size > ENTITY_FILE_MAX_BYTES;
}

export interface ChatAttachments {
	items: ChatAttachmentDraft[];
	/** Picked, pasted or dropped files: each one uploads at once. */
	add: (files: File[]) => void;
	remove: (key: string) => void;
	retry: (key: string) => void;
	/** After the send: the composer lets go of the files that went with it; one that failed stays, with its retry. */
	releaseSent: () => void;
	readyIds: string[];
	isUploading: boolean;
	/** Whether files can be attached here: the platform serves documents and the person may create them. */
	canAttach: boolean;
}

/**
 * The files of the message being written: added from the picker, a paste or a drop, shrunk when they are large photos,
 * and uploaded to the person's own documents as soon as they are added, so the send only names them. A file that fails
 * stays with a retry; a file that is too large, or one more than the message takes, is refused with a word why.
 */
export function useChatAttachments(): ChatAttachments {
	const t = useTranslations();
	const locale = useLocale();
	const availability = useDocsAvailability(true);
	const scope = useChatScope();
	const scopeKey = scope ? `${scope.tenantId}:${scope.organizationId}:${scope.userId}` : '';
	const [items, setItems] = useState<ChatAttachmentDraft[]>([]);
	// The scope a refusal of this hook was for: it re-renders the composer at once, and only for that scope.
	const [refusedIn, setRefusedIn] = useState<string | null>(null);
	const files = useRef(new Map<string, File>());
	// What add / remove count against: set as they run (two pastes within one render), and with every render.
	const itemsRef = useRef(items);
	useIsomorphicLayoutEffect(() => {
		itemsRef.current = items;
	});
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
			for (const item of itemsRef.current) revoke(item);
		};
	}, []);

	const update = useCallback((key: string, change: Partial<ChatAttachmentDraft>) => {
		if (!mounted.current) return;
		setItems((current) => current.map((item) => (item.key === key ? { ...item, ...change } : item)));
	}, []);

	const drop = useCallback((key: string) => {
		const item = itemsRef.current.find((entry) => entry.key === key);
		if (item) revoke(item);
		files.current.delete(key);
		itemsRef.current = itemsRef.current.filter((entry) => entry.key !== key);
		if (mounted.current) setItems((current) => current.filter((entry) => entry.key !== key));
	}, []);

	const warnTooLarge = useCallback(
		(names: string[]) => {
			toast.warning(t('entityFiles.TOO_LARGE', { count: names.length, names: names.join(', ') }), {
				description: t('entityFiles.TOO_LARGE_HINT', { size: formatFileSize(ENTITY_FILE_MAX_BYTES, locale) })
			});
		},
		[locale, t]
	);

	const upload = useCallback(
		async (key: string, picked: File) => {
			try {
				const file = await shrinkImage(picked);
				// A photo is measured once shrunk: what goes up is what the platform's cap applies to.
				if (file.size > ENTITY_FILE_MAX_BYTES) {
					drop(key);
					warnTooLarge([picked.name]);
					return;
				}
				const answer = await chatService.uploadAttachments([file]);
				const document = answer.results[0]?.document;
				if (!document) {
					const rejection = answer.rejected[0];
					update(key, { status: 'failed' });
					toast.warning(t('entityFiles.REJECTED', { count: 1, names: picked.name }), {
						description: rejection?.message
					});
					return;
				}
				uploadedFiles.set(document.id, {
					documentId: document.id,
					name: picked.name,
					mimeType: document.mimeType ?? file.type,
					size: Number(document.fileSize ?? file.size)
				});
				update(key, {
					status: 'ready',
					documentId: document.id,
					size: Number(document.fileSize ?? file.size),
					mimeType: document.mimeType ?? file.type
				});
			} catch (error) {
				update(key, { status: 'failed' });
				if (errorStatusOf(error) === 403) {
					if (scopeKey) forbiddenScopes.add(scopeKey);
					if (mounted.current) setRefusedIn(scopeKey);
					toast.error(t('teamChat.ATTACH_FORBIDDEN'));
					return;
				}
				toast.error(t('entityFiles.UPLOAD_FAILED'), {
					description: t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)
				});
			}
		},
		[drop, scopeKey, t, update, warnTooLarge]
	);

	const add = useCallback(
		(picked: File[]) => {
			if (!picked.length) return;
			const tooLarge = picked.filter(isTooLarge);
			if (tooLarge.length) warnTooLarge(tooLarge.map((file) => file.name));
			const fitting = picked.filter((file) => !isTooLarge(file));
			const { accepted, refused } = withinAttachmentLimit(fitting, itemsRef.current.length);
			if (refused.length) toast.warning(t('teamChat.ATTACH_TOO_MANY', { max: CHAT_MESSAGE_MAX_ATTACHMENTS }));
			if (!accepted.length) return;
			const entries = accepted.map<ChatAttachmentDraft>((file) => ({
				key: newNonce(),
				name: file.name,
				size: file.size,
				mimeType: file.type,
				status: 'uploading',
				previewUrl: canPreview(file) ? URL.createObjectURL(file) : undefined
			}));
			entries.forEach((entry, index) => files.current.set(entry.key, accepted[index]));
			// Counted at once, so a second paste before this render still sees the room these take.
			itemsRef.current = [...itemsRef.current, ...entries];
			setItems((current) => [...current, ...entries]);
			entries.forEach((entry, index) => void upload(entry.key, accepted[index]));
		},
		[t, upload, warnTooLarge]
	);

	const retry = useCallback(
		(key: string) => {
			const file = files.current.get(key);
			if (!file) return;
			update(key, { status: 'uploading' });
			void upload(key, file);
		},
		[update, upload]
	);

	const releaseSent = useCallback(() => {
		const sent = itemsRef.current.filter((item) => item.status === 'ready');
		if (!sent.length) return;
		const keys = new Set(sent.map((item) => item.key));
		for (const item of sent) {
			revoke(item);
			files.current.delete(item.key);
		}
		itemsRef.current = itemsRef.current.filter((item) => !keys.has(item.key));
		setItems((current) => current.filter((item) => !keys.has(item.key)));
	}, []);

	const readyIds = useMemo(() => readyAttachmentIds(items), [items]);
	const isUploading = useMemo(() => isUploadingAny(items), [items]);
	const refused = forbiddenScopes.has(scopeKey) || (refusedIn !== null && refusedIn === scopeKey);
	const canAttach = availability !== 'unavailable' && !refused;

	return { items, add, remove: drop, retry, releaseSent, readyIds, isUploading, canAttach };
}
