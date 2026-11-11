'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { toast } from 'sonner';
import { useIsomorphicLayoutEffect } from '@/core/hooks/common/use-isomorphic-layout-effect';
import { useDocsAvailability } from '@/core/hooks/docs/use-docs-availability';
import { chatService } from '@/core/services/client/api/chat';
import { errorReasonKeyOf, errorStatusOf } from '@/core/lib/utils/error-feedback';
import { formatFileSize, splitBySize } from '@/core/lib/utils/entity-files';
import {
	isUploadingAny,
	readyAttachmentIds,
	withinAttachmentLimit,
	type ChatAttachmentDraft
} from '@/core/lib/utils/chat-attachments';
import { shrinkImage } from '@/core/lib/utils/chat-image-shrink';
import { newNonce } from '@/core/lib/utils/chat-format';
import { CHAT_MESSAGE_MAX_ATTACHMENTS } from '@/core/types/interfaces/common/chat';
import { ENTITY_FILE_MAX_BYTES } from '@/core/types/schemas/documents/entity-file.schema';

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

export function uploadedFileOf(documentId: string): ChatUploadedFile | undefined {
	return uploadedFiles.get(documentId);
}

/** Once the platform refused this person an upload (their role may not create documents), the composer stops offering it. */
let uploadsForbidden = false;

/** For the specs. */
export function resetChatUploads(): void {
	uploadedFiles.clear();
	uploadsForbidden = false;
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

export interface ChatAttachments {
	items: ChatAttachmentDraft[];
	/** Picked, pasted or dropped files: each one uploads at once. */
	add: (files: File[]) => void;
	remove: (key: string) => void;
	retry: (key: string) => void;
	/** After the send: the composer lets go of its files (the documents stay with the message). */
	clear: () => void;
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
	const [items, setItems] = useState<ChatAttachmentDraft[]>([]);
	const [forbidden, setForbidden] = useState(uploadsForbidden);
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

	const upload = useCallback(
		async (key: string, picked: File) => {
			try {
				const file = await shrinkImage(picked);
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
					uploadsForbidden = true;
					if (mounted.current) setForbidden(true);
					toast.error(t('teamChat.ATTACH_FORBIDDEN'));
					return;
				}
				toast.error(t('entityFiles.UPLOAD_FAILED'), {
					description: t(errorReasonKeyOf(error) as DottedLanguageObjectStringPaths)
				});
			}
		},
		[t, update]
	);

	const add = useCallback(
		(picked: File[]) => {
			if (!picked.length) return;
			const { accepted: fitting, tooLarge } = splitBySize(picked, ENTITY_FILE_MAX_BYTES);
			if (tooLarge.length) {
				toast.warning(
					t('entityFiles.TOO_LARGE', {
						count: tooLarge.length,
						names: tooLarge.map((file) => file.name).join(', ')
					}),
					{
						description: t('entityFiles.TOO_LARGE_HINT', {
							size: formatFileSize(ENTITY_FILE_MAX_BYTES, locale)
						})
					}
				);
			}
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
		[locale, t, upload]
	);

	const remove = useCallback((key: string) => {
		const item = itemsRef.current.find((entry) => entry.key === key);
		if (item) revoke(item);
		files.current.delete(key);
		itemsRef.current = itemsRef.current.filter((entry) => entry.key !== key);
		setItems((current) => current.filter((entry) => entry.key !== key));
	}, []);

	const retry = useCallback(
		(key: string) => {
			const file = files.current.get(key);
			if (!file) return;
			update(key, { status: 'uploading' });
			void upload(key, file);
		},
		[update, upload]
	);

	const clear = useCallback(() => {
		for (const item of itemsRef.current) revoke(item);
		files.current.clear();
		itemsRef.current = [];
		setItems([]);
	}, []);

	const readyIds = useMemo(() => readyAttachmentIds(items), [items]);
	const isUploading = useMemo(() => isUploadingAny(items), [items]);
	const canAttach = availability !== 'unavailable' && !forbidden;

	return { items, add, remove, retry, clear, readyIds, isUploading, canAttach };
}
