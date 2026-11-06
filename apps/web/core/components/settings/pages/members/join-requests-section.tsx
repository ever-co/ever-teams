'use client';

import { ReactNode, useState } from 'react';
import { useFormatter, useTranslations, type DottedLanguageObjectStringPaths } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import type { GlyphHue } from '@/core/components/common/value-glyphs';
import { ChevronDown, Spinner, UserCheck } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	useJoinRequestsSettings,
	type JoinRequestModel,
	type JoinRequestState
} from '@/core/hooks/settings/use-team-invitations-settings';
import { SETTINGS_SURFACE, SettingsSection } from '@/core/components/settings/kit/settings-page';
import { PeopleRowsSkeleton } from './members-settings-skeleton';
import { MemberAvatar, PERSON_ROW, PersonChip, PersonLines, SectionCount } from './people-parts';

const SHOWN_REQUESTS = 8;

type AnsweredState = Exclude<JoinRequestState, 'requested'>;

const STATE_LOOK: Record<AnsweredState, { labelKey: DottedLanguageObjectStringPaths; hue: GlyphHue }> = {
	accepted: { labelKey: 'settings.members.REQUEST_ACCEPTED', hue: 'success' },
	rejected: { labelKey: 'settings.members.REQUEST_REJECTED', hue: 'neutral' },
	unconfirmed: { labelKey: 'settings.members.REQUEST_UNCONFIRMED', hue: 'neutral' }
};

function RequestAnswer({
	request,
	isBusy,
	onAccept,
	onReject
}: Readonly<{
	request: JoinRequestModel;
	isBusy: boolean;
	onAccept: (requestId: string) => void;
	onReject: (requestId: string) => void;
}>) {
	const t = useTranslations();
	if (request.state !== 'requested') {
		const look = STATE_LOOK[request.state];
		return <PersonChip hue={look.hue}>{t(look.labelKey)}</PersonChip>;
	}

	let acceptIcon = <UserCheck />;
	if (isBusy) {
		acceptIcon = <Spinner className="animate-spin" />;
	}

	return (
		<span className="flex shrink-0 items-center gap-1.5">
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() => onAccept(request.id)}
				disabled={isBusy}
				aria-label={t('settings.members.ACCEPT_REQUEST', { name: request.name })}
			>
				{acceptIcon}
				{t('settings.members.ACCEPT')}
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => onReject(request.id)}
				disabled={isBusy}
				aria-label={t('settings.members.REJECT_REQUEST', { name: request.name })}
			>
				{t('settings.members.REJECT')}
			</Button>
		</span>
	);
}

function RequestRow({
	request,
	isBusy,
	onAccept,
	onReject
}: Readonly<{
	request: JoinRequestModel;
	isBusy: boolean;
	onAccept: (requestId: string) => void;
	onReject: (requestId: string) => void;
}>) {
	const t = useTranslations();
	const format = useFormatter();
	const parts: string[] = [];
	if (request.email !== request.name) {
		parts.push(request.email);
	}
	if (request.teamName) {
		parts.push(t('settings.members.REQUEST_FOR_TEAM', { team: request.teamName }));
	}
	if (request.requestedAt) {
		parts.push(format.dateTime(request.requestedAt, { dateStyle: 'medium' }));
	}

	return (
		<li className={cn(PERSON_ROW, 'flex-wrap gap-y-2')}>
			<MemberAvatar name={request.name} imageUrl={null} />
			<PersonLines name={request.name} detail={parts.join(' · ')} className="basis-40" />
			<RequestAnswer request={request} isBusy={isBusy} onAccept={onAccept} onReject={onReject} />
		</li>
	);
}

function expandLabelOf(isExpanded: boolean, hiddenCount: number, t: ReturnType<typeof useTranslations>): string {
	if (isExpanded) {
		return t('modals.invite.SHOW_LESS');
	}
	return t('modals.invite.SHOW_MORE', { count: hiddenCount });
}

export function JoinRequestsSection() {
	const t = useTranslations();
	const { requests, isLoading, isError, retry, busyIds, accept, reject } = useJoinRequestsSettings();
	const [isExpanded, setIsExpanded] = useState(false);

	const hiddenCount = requests.length - SHOWN_REQUESTS;
	const canExpand = hiddenCount > 0;
	let shownRequests = requests.slice(0, SHOWN_REQUESTS);
	if (isExpanded) {
		shownRequests = requests;
	}
	const hasRequests = requests.length > 0;
	const openCount = requests.filter((request) => request.state === 'requested').length;
	const isSettled = !isLoading && !isError;
	let countBadge: ReactNode = null;
	if (isSettled) {
		countBadge = (
			<SectionCount count={openCount} label={t('settings.members.REQUESTS_COUNT', { count: openCount })} />
		);
	}
	const onAccept = (requestId: string) => {
		void accept(requestId);
	};
	const onReject = (requestId: string) => {
		void reject(requestId);
	};

	let body = (
		<div className={SETTINGS_SURFACE}>
			<p className="px-4 py-4 text-[13px] text-muted-foreground">{t('settings.members.REQUESTS_EMPTY')}</p>
		</div>
	);
	if (hasRequests) {
		body = (
			<div className={SETTINGS_SURFACE}>
				<ul
					className="flex flex-col hairline-divide-y divide-border"
					aria-label={t('settings.members.REQUESTS_SECTION')}
				>
					{shownRequests.map((request) => (
						<RequestRow
							key={request.id}
							request={request}
							isBusy={busyIds.has(request.id)}
							onAccept={onAccept}
							onReject={onReject}
						/>
					))}
				</ul>
				{canExpand && (
					<button
						type="button"
						onClick={() => setIsExpanded((expanded) => !expanded)}
						aria-expanded={isExpanded}
						className="flex h-9 items-center gap-2 px-4 text-left text-xs font-medium text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:bg-foreground/5"
					>
						<ChevronDown
							aria-hidden="true"
							className={cn('size-3.5 transition-transform duration-200', isExpanded && 'rotate-180')}
						/>
						{expandLabelOf(isExpanded, hiddenCount, t)}
					</button>
				)}
			</div>
		);
	}
	if (isError) {
		body = (
			<Notice
				tone="error"
				title={t('settings.members.REQUESTS_ERROR')}
				actions={
					<Button type="button" variant="outline" onClick={() => void retry()}>
						{t('notifications.RETRY')}
					</Button>
				}
			/>
		);
	}
	if (isLoading) {
		body = <PeopleRowsSkeleton rows={2} trailingWidth="w-24" />;
	}

	return (
		<SettingsSection
			id="requests"
			title={t('settings.members.REQUESTS_SECTION')}
			description={t('settings.members.REQUESTS_DESCRIPTION')}
			actions={countBadge}
		>
			{body}
		</SettingsSection>
	);
}
