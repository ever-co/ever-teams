'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import moment from 'moment';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { AlertDialogConfirmation } from '@/core/components/common/alert-dialog-confirmation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/core/components/common/dropdown-menu';
import { Check, Link, MoreHorizontal, RotateLeft, X } from '@/core/components/icons';
import { PersonAvatar } from '@/core/components/teams/people-avatars';
import { CommentComposer } from '@/core/components/tasks/drawer/comment-composer';
import { useFocusOnMount } from '@/core/hooks/common/use-focus-on-mount';
import type { DocsCommentsState } from '@/core/hooks/docs/use-docs-comments';
import { useMentionCandidates } from '@/core/hooks/tasks/use-mention-candidates';
import { cn } from '@/core/lib/helpers';
import { isCommentAuthor, parseBlockAnchor, quoteOf, sortThreadsByDocument, threadsOfTab, type DocsCommentTab, type DocsCommentThread } from '@/core/lib/utils/docs-comments';
import { splitMentions } from '@/core/lib/utils/comment-mentions';
import type { IComment } from '@/core/types/interfaces/common/comment';

const ICON_BUTTON =
	'inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-foreground/[0.06] hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default disabled:opacity-50 [&_svg]:size-4';

const TEXT_ACTION =
	'w-fit cursor-pointer rounded-md text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 disabled:cursor-default disabled:opacity-50';

/** Where the next comment goes: on a block (the text the person selected), or on the page. */
export interface DocsPendingAnchor {
	blockId: string;
	quote: string;
}

interface DocsCommentsPanelProps {
	comments: DocsCommentsState;
	/** The page's blocks in reading order, and the text of each, as the editor holds them now. */
	blockOrder: readonly string[];
	blockText: (blockId: string) => string | null;
	reader: { employeeId: string | null; userId: string | null };
	activeThreadId: string | null;
	onSelectThread: (thread: DocsCommentThread) => void;
	pendingAnchor: DocsPendingAnchor | null;
	onClearPending: () => void;
	/** The page can take comments (not in the trash). */
	canComment: boolean;
	onCopyThreadLink: (thread: DocsCommentThread) => void;
	onClose: () => void;
}

function authorNameOf(comment: IComment): string {
	return comment.employee?.fullName?.trim() || comment.employee?.user?.name?.trim() || comment.createdByUser?.name?.trim() || '';
}

function authorImageOf(comment: IComment): string | null {
	return comment.employee?.user?.imageUrl || comment.createdByUser?.imageUrl || null;
}

/**
 * The page's comments beside it: Open and Resolved threads in reading order, each with the text it is on (or that it
 * is on the page, or that its text is gone), replies, resolve and reopen, edit and delete for their author, and the
 * field for a new comment (on the selected text when the person chose Comment on it).
 */
export function DocsCommentsPanel({
	comments,
	blockOrder,
	blockText,
	reader,
	activeThreadId,
	onSelectThread,
	pendingAnchor,
	onClearPending,
	canComment,
	onCopyThreadLink,
	onClose
}: DocsCommentsPanelProps) {
	const t = useTranslations();
	const candidates = useMentionCandidates();
	const names = useMemo(() => candidates.map((candidate) => candidate.name), [candidates]);
	const [tab, setTab] = useState<DocsCommentTab>('open');
	const sorted = useMemo(() => sortThreadsByDocument(comments.threads, blockOrder), [blockOrder, comments.threads]);
	const shown = useMemo(() => threadsOfTab(sorted, tab), [sorted, tab]);
	const openCount = useMemo(() => threadsOfTab(sorted, 'open').length, [sorted]);
	const resolvedCount = sorted.length - openCount;
	const [deleting, setDeleting] = useState<IComment | null>(null);
	const listRef = useRef<HTMLUListElement>(null);

	// A thread a link or a marked block asked for is in its tab and in sight.
	const activeThread = activeThreadId ? (sorted.find((thread) => thread.id === activeThreadId) ?? null) : null;
	const activeResolved = activeThread?.resolved ?? null;
	useEffect(() => {
		if (activeResolved === null) return;
		setTab(activeResolved ? 'resolved' : 'open');
	}, [activeResolved, activeThreadId]);
	useEffect(() => {
		if (!activeThreadId) return;
		const handle = requestAnimationFrame(() => {
			listRef.current?.querySelector<HTMLElement>(`[data-thread-id="${CSS.escape(activeThreadId)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		});
		return () => cancelAnimationFrame(handle);
	}, [activeThreadId, tab, shown.length]);
	// A comment on the selection is a new open thread.
	useEffect(() => {
		if (pendingAnchor) setTab('open');
	}, [pendingAnchor]);

	const fail = () => toast.error(t('docs.COMMENT_ERROR'));

	const postNew = async (body: string, mentionEmployeeIds: string[]) => {
		try {
			const created = await comments.post({ body, blockId: pendingAnchor?.blockId ?? null, mentionEmployeeIds });
			if (!created) return false;
			onClearPending();
			return true;
		} catch {
			fail();
			return false;
		}
	};

	return (
		<aside className="flex h-full w-full flex-col border-l border-border bg-background lg:w-80" aria-label={t('docs.COMMENTS')}>
			<div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
				<h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{t('docs.COMMENTS')}</h2>
				<button type="button" onClick={onClose} aria-label={t('docs.CLOSE')} className={ICON_BUTTON}>
					<X />
				</button>
			</div>
			<div role="tablist" aria-label={t('docs.COMMENTS')} className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
				{(['open', 'resolved'] as const).map((value) => (
					<button
						key={value}
						type="button"
						role="tab"
						aria-selected={tab === value}
						onClick={() => setTab(value)}
						className={cn(
							'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/25',
							tab === value ? 'bg-foreground/[0.07] text-foreground' : 'text-muted-foreground hover:text-foreground'
						)}
					>
						{value === 'open' ? t('docs.COMMENTS_OPEN') : t('docs.COMMENTS_RESOLVED')}
						<span className="tabular-nums text-muted-foreground">{value === 'open' ? openCount : resolvedCount}</span>
					</button>
				))}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
				{comments.isLoading && <p className="text-sm text-muted-foreground">{t('docs.LOADING')}</p>}
				{comments.isError && (
					<div role="alert" className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
						<p>{t('docs.COMMENTS_LOAD_ERROR')}</p>
						<Button type="button" size="sm" variant="outline" onClick={() => void comments.refresh()}>
							{t('docs.RETRY')}
						</Button>
					</div>
				)}
				{!comments.isLoading && !comments.isError && shown.length === 0 && (
					<p className="text-sm text-muted-foreground text-balance">{tab === 'open' ? t('docs.COMMENTS_EMPTY_OPEN') : t('docs.COMMENTS_EMPTY_RESOLVED')}</p>
				)}
				<ul ref={listRef} className="flex flex-col gap-3">
					{shown.map((thread) => (
						<DocsThreadCard
							key={thread.id}
							thread={thread}
							quote={thread.blockId ? quoteOf(blockText(thread.blockId)) : null}
							isDetached={thread.blockId !== null && !blockOrder.includes(thread.blockId)}
							isActive={thread.id === activeThreadId}
							names={names}
							reader={reader}
							comments={comments}
							canComment={canComment}
							onSelect={() => onSelectThread(thread)}
							onCopyLink={() => onCopyThreadLink(thread)}
							onDelete={setDeleting}
							onFail={fail}
						/>
					))}
				</ul>
			</div>

			{canComment && (
				<div className="shrink-0 border-t border-border px-3 py-3">
					{pendingAnchor && (
						<div className="mb-2 flex items-start gap-2 rounded-lg bg-foreground/[0.04] px-2.5 py-2 text-xs">
							<span className="min-w-0 flex-1">
								<span className="block font-medium text-muted-foreground">{t('docs.COMMENTING_ON')}</span>
								<span className="line-clamp-2 border-l-2 border-amber-500/70 pl-2 text-foreground/80">{pendingAnchor.quote || '…'}</span>
							</span>
							<button type="button" onClick={onClearPending} aria-label={t('docs.CANCEL')} className={cn(ICON_BUTTON, 'size-6')}>
								<X />
							</button>
						</div>
					)}
					<CommentComposer
						key={pendingAnchor?.blockId ?? 'page'}
						autoFocus={pendingAnchor !== null}
						placeholder={pendingAnchor ? t('docs.COMMENT_ON_SELECTION_PLACEHOLDER') : t('docs.COMMENT_PLACEHOLDER')}
						onSubmit={(body, mentionEmployeeIds) => postNew(body, mentionEmployeeIds)}
						isPosting={comments.isPosting}
					/>
				</div>
			)}

			<AlertDialogConfirmation
				isOpen={deleting !== null}
				onOpenChange={(open) => !open && setDeleting(null)}
				title={t('docs.COMMENT_DELETE_TITLE')}
				description={t('docs.COMMENT_DELETE_TEXT')}
				confirmText={t('docs.COMMENT_DELETE')}
				cancelText={t('docs.CANCEL')}
				loading={comments.isUpdating}
				onConfirm={() => {
					const comment = deleting;
					if (!comment) return;
					void comments
						.remove(comment)
						.then(() => setDeleting(null))
						.catch(() => {
							setDeleting(null);
							fail();
						});
				}}
				onCancel={() => setDeleting(null)}
			/>
		</aside>
	);
}

interface DocsThreadCardProps {
	thread: DocsCommentThread;
	quote: string | null;
	isDetached: boolean;
	isActive: boolean;
	names: string[];
	reader: { employeeId: string | null; userId: string | null };
	comments: DocsCommentsState;
	canComment: boolean;
	onSelect: () => void;
	onCopyLink: () => void;
	onDelete: (comment: IComment) => void;
	onFail: () => void;
}

function DocsThreadCard({ thread, quote, isDetached, isActive, names, reader, comments, canComment, onSelect, onCopyLink, onDelete, onFail }: DocsThreadCardProps) {
	const t = useTranslations();
	const [isReplying, setIsReplying] = useState(false);
	const canResolve = isCommentAuthor(thread.root, reader);

	const toggleResolved = () => {
		comments.setResolved(thread.root, !thread.resolved).catch(onFail);
	};

	const postReply = async (body: string, mentionEmployeeIds: string[]) => {
		try {
			// A reply carries its thread's anchor, as the platform's own editor writes it.
			const created = await comments.post({ body, blockId: thread.blockId, parentId: thread.id, mentionEmployeeIds });
			if (!created) return false;
			setIsReplying(false);
			return true;
		} catch {
			onFail();
			return false;
		}
	};

	return (
		<li
			data-thread-id={thread.id}
			className={cn(
				'flex flex-col gap-3 rounded-xl p-3 hairline-ring transition-colors',
				isActive ? 'bg-amber-500/[0.06] ring-amber-500/50' : 'ring-border',
				thread.resolved && 'opacity-80'
			)}
		>
			<button
				type="button"
				onClick={onSelect}
				className="-m-1 flex cursor-pointer flex-col items-start gap-0.5 rounded-md p-1 text-left text-xs outline-none hover:bg-foreground/[0.03] focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				{thread.blockId === null && <span className="text-muted-foreground">{t('docs.COMMENT_ON_PAGE')}</span>}
				{thread.blockId !== null && isDetached && <span className="italic text-muted-foreground">{t('docs.COMMENT_DETACHED')}</span>}
				{thread.blockId !== null && !isDetached && <span className="line-clamp-2 border-l-2 border-amber-500/70 pl-2 text-foreground/80">{quote || '…'}</span>}
			</button>

			<DocsCommentRow comment={thread.root} names={names} reader={reader} comments={comments} onDelete={onDelete} onFail={onFail} />
			{thread.replies.length > 0 && (
				<div className="ml-3 flex flex-col gap-3 hairline-l border-dashed border-border pl-4">
					{thread.replies.map((reply) => (
						<DocsCommentRow key={reply.id} comment={reply} names={names} reader={reader} comments={comments} onDelete={onDelete} onFail={onFail} />
					))}
				</div>
			)}

			{isReplying && (
				<CommentComposer autoFocus placeholder={t('docs.COMMENT_REPLY')} onSubmit={(body, mentionEmployeeIds) => postReply(body, mentionEmployeeIds)} onCancel={() => setIsReplying(false)} isPosting={comments.isPosting} />
			)}

			<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
				{canComment && !thread.resolved && !isReplying && (
					<button type="button" className={TEXT_ACTION} onClick={() => setIsReplying(true)}>
						{t('docs.COMMENT_REPLY')}
					</button>
				)}
				{canResolve && (
					<button type="button" className={cn(TEXT_ACTION, 'inline-flex items-center gap-1')} onClick={toggleResolved} disabled={comments.isUpdating}>
						{thread.resolved ? <RotateLeft className="size-3.5" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
						{thread.resolved ? t('docs.COMMENT_REOPEN') : t('docs.COMMENT_RESOLVE')}
					</button>
				)}
				<button type="button" className={cn(TEXT_ACTION, 'inline-flex items-center gap-1')} onClick={onCopyLink}>
					<Link className="size-3.5" aria-hidden="true" />
					{t('docs.COPY_LINK')}
				</button>
			</div>
		</li>
	);
}

interface DocsCommentRowProps {
	comment: IComment;
	names: string[];
	reader: { employeeId: string | null; userId: string | null };
	comments: DocsCommentsState;
	onDelete: (comment: IComment) => void;
	onFail: () => void;
}

function DocsCommentRow({ comment, names, reader, comments, onDelete, onFail }: DocsCommentRowProps) {
	const t = useTranslations();
	const body = parseBlockAnchor(comment.comment).body;
	const [draft, setDraft] = useState<string | null>(null);
	const isAuthor = isCommentAuthor(comment, reader);
	const authorName = authorNameOf(comment) || t('docs.SOMEONE');
	const segments = useMemo(() => splitMentions(body, names), [body, names]);
	// The field the person asked to edit takes the focus.
	const focusOnMount = useFocusOnMount<HTMLTextAreaElement>();

	const save = () => {
		if (draft === null) return;
		const text = draft.trim();
		if (!text || text === body.trim()) {
			setDraft(null);
			return;
		}
		comments
			.edit(comment, text)
			.then(() => setDraft(null))
			.catch(onFail);
	};

	return (
		<div className="flex gap-2.5">
			<PersonAvatar person={{ id: String(comment.id), name: authorName, imageUrl: authorImageOf(comment) }} className="size-6 text-[10px] ring-0" />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-center gap-2">
					<span className="min-w-0 truncate text-[13px] font-medium text-foreground">{authorName}</span>
					<time dateTime={comment.createdAt} className="shrink-0 text-xs text-muted-foreground">
						{moment(comment.createdAt).fromNow()}
					</time>
					{comment.editedAt && <span className="shrink-0 text-xs text-muted-foreground">· {t('docs.COMMENT_EDITED')}</span>}
					{isAuthor && draft === null && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<button type="button" aria-label={t('docs.COMMENT_MENU')} className={cn(ICON_BUTTON, 'ms-auto size-6')}>
									<MoreHorizontal />
								</button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-40">
								<DropdownMenuItem onClick={() => setDraft(body)}>{t('docs.COMMENT_EDIT')}</DropdownMenuItem>
								<DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(comment)}>
									{t('docs.COMMENT_DELETE')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
				{draft === null ? (
					<p className="text-[13px] leading-5 whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
						{segments.map((segment, index) =>
							segment.isMention ? (
								<span key={`${index}-${segment.text}`} className="rounded-[4px] bg-primary/10 px-0.5 font-medium text-primary-ink dark:bg-primary/20">
									{segment.text}
								</span>
							) : (
								<span key={`${index}-${segment.text}`}>{segment.text}</span>
							)
						)}
					</p>
				) : (
					<div className="flex flex-col gap-2">
						<textarea
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Escape') setDraft(null);
								if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) save();
							}}
							aria-label={t('docs.COMMENT_EDIT')}
							rows={3}
							ref={focusOnMount}
							className="w-full resize-y rounded-md bg-background px-2 py-1.5 text-[13px] leading-5 outline-none hairline-ring ring-border focus-visible:ring-[3px] focus-visible:ring-ring/25"
						/>
						<div className="flex gap-2">
							<Button type="button" size="sm" onClick={save} disabled={comments.isUpdating}>
								{t('docs.SAVE')}
							</Button>
							<Button type="button" size="sm" variant="outline" onClick={() => setDraft(null)}>
								{t('docs.CANCEL')}
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
