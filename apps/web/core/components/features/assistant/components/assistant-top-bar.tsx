'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/core/components/duplicated-components/_button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/core/components/common/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/core/components/common/tooltip';
import { Check, ChevronDown, Compose, Settings, Trash } from '@/core/components/icons';
import type { ChatSession } from '@/core/components/features/chat-panel/chat-history';
import { cn } from '@/core/lib/helpers';
import { formatSessionTime } from '../assistant-helpers';

type AssistantTopBarProps = {
	title: string | null;
	sessions: ChatSession[];
	currentSessionId: string;
	hasMessages: boolean;
	isConfigured: boolean;
	onNewChat: () => void;
	onClearConversation: () => void;
	onSelectSession: (session: ChatSession) => void;
	onOpenConfig: () => void;
};

const menuRowRecipe = 'h-8 text-[13px]';

function TopBarAction({
	label,
	onClick,
	children,
	className
}: {
	label: string;
	onClick: () => void;
	children: ReactNode;
	className?: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className={cn('text-muted-foreground', className)}
					onClick={onClick}
					aria-label={label}
				>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}

function ariaCurrentFor(isCurrent: boolean) {
	if (isCurrent) {
		return true;
	}
	return undefined;
}

function SessionRow({
	session,
	isCurrent,
	locale,
	onSelect
}: {
	session: ChatSession;
	isCurrent: boolean;
	locale: string;
	onSelect: (session: ChatSession) => void;
}) {
	const time = formatSessionTime(session.updatedAt, locale);
	const ariaCurrent = ariaCurrentFor(isCurrent);
	const handleSelect = () => onSelect(session);
	return (
		<DropdownMenuItem className={menuRowRecipe} onClick={handleSelect} aria-current={ariaCurrent}>
			<span className="min-w-0 flex-1 truncate">{session.title}</span>
			<span className="shrink-0 text-xs text-muted-foreground tabular-nums">{time}</span>
			{isCurrent && <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" />}
		</DropdownMenuItem>
	);
}

function HistoryMenu({
	title,
	sessions,
	currentSessionId,
	hasMessages,
	onNewChat,
	onClearConversation,
	onSelectSession
}: Omit<AssistantTopBarProps, 'isConfigured' | 'onOpenConfig' | 'title'> & { title: string }) {
	const t = useTranslations();
	const locale = useLocale();
	const hasSessions = sessions.length > 0;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="max-w-full min-w-0 shrink gap-1 px-2 text-[13px] font-medium"
				>
					<span className="truncate">{title}</span>
					<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-[min(20rem,calc(100vw-2rem))] max-h-[min(26rem,var(--available-height))]"
			>
				<DropdownMenuItem className={menuRowRecipe} onClick={onNewChat}>
					<Compose aria-hidden="true" />
					{t('chatView.NEW_CHAT')}
				</DropdownMenuItem>
				{hasMessages && (
					<DropdownMenuItem className={menuRowRecipe} onClick={onClearConversation}>
						<Trash aria-hidden="true" />
						{t('chatView.CLEAR_CONVERSATION')}
					</DropdownMenuItem>
				)}
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuLabel>{t('chatView.RECENT_CHATS')}</DropdownMenuLabel>
					{!hasSessions && (
						<p className="px-2 pt-1 pb-2 text-[13px] text-muted-foreground">
							{t('chatView.NO_CONVERSATIONS')}
						</p>
					)}
					{sessions.map((session) => (
						<SessionRow
							key={session.id}
							session={session}
							isCurrent={session.id === currentSessionId}
							locale={locale}
							onSelect={onSelectSession}
						/>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function titleOrDefault(title: string | null, fallback: string) {
	if (title) {
		return title;
	}
	return fallback;
}

export function AssistantTopBar({
	title,
	sessions,
	currentSessionId,
	hasMessages,
	isConfigured,
	onNewChat,
	onClearConversation,
	onSelectSession,
	onOpenConfig
}: AssistantTopBarProps) {
	const t = useTranslations();
	const newChatLabel = t('chatView.NEW_CHAT');
	const shownTitle = titleOrDefault(title, newChatLabel);

	return (
		<div className="flex min-w-0 items-center gap-1">
			<HistoryMenu
				title={shownTitle}
				sessions={sessions}
				currentSessionId={currentSessionId}
				hasMessages={hasMessages}
				onNewChat={onNewChat}
				onClearConversation={onClearConversation}
				onSelectSession={onSelectSession}
			/>
			<div className="ml-auto flex shrink-0 items-center gap-0.5">
				<TopBarAction label={newChatLabel} onClick={onNewChat}>
					<Compose />
				</TopBarAction>
				<TopBarAction
					label={t('chatView.CONFIGURATION')}
					onClick={onOpenConfig}
					className={cn(!isConfigured && 'text-destructive-ink')}
				>
					<Settings />
				</TopBarAction>
			</div>
		</div>
	);
}
