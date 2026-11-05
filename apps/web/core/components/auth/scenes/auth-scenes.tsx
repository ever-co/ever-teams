'use client';

import { useTranslations } from 'next-intl';
import { Play } from '@/core/components/icons';
import { EntityTile } from '@/core/components/common/entity-tile';
import { APP_NAME, AUTH_CODE_LENGTH } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { workspaceNameOf } from '@/core/components/auth/workspace-picker';
import { AppSheet, AuthScene, MailSheet, SceneBar, SceneDot, SceneNavRows } from './scene-frame';

function initialsOfName(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const firstLetters = words.slice(0, 2).map((word) => word.charAt(0));
	return firstLetters.join('').toUpperCase();
}

function initialsOf(name: string, email: string) {
	const fromName = initialsOfName(name);
	if (fromName) {
		return fromName;
	}
	const firstLetter = email.trim().charAt(0);
	return firstLetter.toUpperCase();
}

function localPartOf(email: string) {
	const [localPart] = email.trim().split('@');
	return localPart ?? '';
}

function ScenePerson({ initials, className }: Readonly<{ initials: string; className?: string }>) {
	if (!initials) {
		return <SceneDot className={cn('size-8', className)} />;
	}
	return (
		<span
			className={cn(
				'flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary-ink hairline-ring ring-primary/25',
				className
			)}
		>
			{initials}
		</span>
	);
}

function SceneText({
	text,
	className,
	barClassName
}: Readonly<{ text: string; className?: string; barClassName?: string }>) {
	if (!text) {
		return <SceneBar className={barClassName} />;
	}
	return <span className={cn('block truncate', className)}>{text}</span>;
}

function SceneWorkspace({ name, imageUrl }: Readonly<{ name: string; imageUrl?: string | null }>) {
	if (!name) {
		return (
			<div className="flex items-center gap-2 px-1">
				<span className="size-5 shrink-0 rounded-[28%] bg-foreground/[0.08]" />
				<SceneBar className="w-16" />
			</div>
		);
	}
	return (
		<div className="flex min-w-0 items-center gap-2 px-1">
			<EntityTile name={name} imageUrl={imageUrl} className="size-5" />
			<span className="min-w-0 truncate text-xs font-medium text-foreground">{name}</span>
		</div>
	);
}

function SceneMemberCard({ name, email, badge }: Readonly<{ name: string; email: string; badge?: string }>) {
	const initials = initialsOf(name, email);
	const shownName = name.trim() || localPartOf(email);

	return (
		<div className="flex items-center gap-3 rounded-xl bg-card p-3 hairline-ring ring-primary/40 shadow-[0_4px_12px_-6px_hsl(var(--primary)/0.35)]">
			<ScenePerson initials={initials} />
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex min-w-0 items-center gap-1.5">
					<SceneText text={shownName} className="text-xs font-medium text-foreground" barClassName="w-20" />
					{badge && (
						<span className="chip-3d shrink-0 rounded-md px-1.5 py-px text-[10px] font-medium [--chip:hsl(var(--primary))]">
							{badge}
						</span>
					)}
				</div>
				<SceneText
					text={email.trim()}
					className="text-[11px] text-muted-foreground"
					barClassName="h-1.5 w-28"
				/>
			</div>
			<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_2px_6px_-2px_hsl(var(--primary)/0.6)] [&_svg]:size-3">
				<Play aria-hidden="true" />
			</span>
		</div>
	);
}

function SceneMemberPlaceholder() {
	return (
		<div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
			<SceneDot className="size-7" />
			<div className="flex flex-1 flex-col gap-1.5">
				<SceneBar className="w-24" />
				<SceneBar className="h-1.5 w-32" />
			</div>
			<span className="size-6 shrink-0 rounded-full bg-foreground/[0.05]" />
		</div>
	);
}

/** A seat to fill later: dashed, the system's mark for "not there yet". */
function SceneEmptySeat({ label }: Readonly<{ label: string }>) {
	return (
		<div className="flex items-center gap-3 rounded-xl px-3 py-2.5 hairline-border border-dashed border-foreground/20">
			<span className="size-7 shrink-0 rounded-full hairline-border border-dashed border-foreground/25" />
			<span className="text-[11px] text-muted-foreground">{label}</span>
		</div>
	);
}

export function AccountScene({
	title,
	description,
	name = '',
	email
}: Readonly<{ title: string; description: string; name?: string; email: string }>) {
	return (
		<AuthScene title={title} description={description}>
			<AppSheet
				sidebar={
					<>
						<SceneWorkspace name="" />
						<SceneNavRows />
					</>
				}
			>
				<SceneBar className="h-2.5 w-24" />
				<div className="flex flex-col gap-2">
					<SceneMemberCard name={name} email={email} />
					<SceneMemberPlaceholder />
					<SceneMemberPlaceholder />
				</div>
			</AppSheet>
		</AuthScene>
	);
}

const MASKED_GROUP = Array.from({ length: AUTH_CODE_LENGTH / 2 }, (_, index) => index);

function MaskedCode() {
	return (
		<div className="flex items-center gap-2">
			<div className="flex gap-1">
				{MASKED_GROUP.map((slot) => (
					<span
						key={slot}
						className="flex h-6 w-5 items-center justify-center rounded-md bg-foreground/[0.05] text-xs text-muted-foreground"
					>
						•
					</span>
				))}
			</div>
			<span className="h-0.5 w-1.5 rounded-full bg-foreground/25" />
			<div className="flex gap-1">
				{MASKED_GROUP.map((slot) => (
					<span
						key={slot}
						className="flex h-6 w-5 items-center justify-center rounded-md bg-foreground/[0.05] text-xs text-muted-foreground"
					>
						•
					</span>
				))}
			</div>
		</div>
	);
}

export type InboxMessage = 'code' | 'reset' | 'activate';

const SUBJECT_KEY = {
	code: 'auth.scene.SUBJECT_CODE',
	reset: 'auth.scene.SUBJECT_RESET',
	activate: 'auth.scene.SUBJECT_ACTIVATE'
} as const;

const ACTION_KEY = {
	code: 'auth.scene.MAIL_ACTION_CODE',
	reset: 'auth.scene.MAIL_ACTION_RESET',
	activate: 'auth.scene.MAIL_ACTION_ACTIVATE'
} as const;

export function InboxScene({
	title,
	description,
	email,
	message
}: Readonly<{ title: string; description: string; email: string; message: InboxMessage }>) {
	const t = useTranslations();
	const showsCode = message === 'code';
	const recipient = email.trim();
	const subject = t(SUBJECT_KEY[message]);
	const action = t(ACTION_KEY[message]);

	return (
		<AuthScene title={title} description={description}>
			<MailSheet>
				<div className="flex items-start gap-3">
					<EntityTile name={APP_NAME} className="size-8 text-[11px]" />
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<div className="flex items-center justify-between gap-2">
							<span className="truncate text-xs font-medium text-foreground">{APP_NAME}</span>
							<span className="shrink-0 text-[11px] text-muted-foreground">{t('auth.scene.NOW')}</span>
						</div>
						{recipient && (
							<span className="truncate text-[11px] text-muted-foreground">
								{t('auth.scene.TO', { email: recipient })}
							</span>
						)}
						{!recipient && <SceneBar className="mt-1 h-1.5 w-28" />}
					</div>
				</div>
				<p className="text-[13px] font-semibold text-foreground">{subject}</p>
				<div className="flex flex-col gap-3 rounded-xl bg-foreground/[0.025] p-4">
					<SceneBar className="w-40" />
					<SceneBar className="w-28" />
					{showsCode && <MaskedCode />}
					<span className="self-start rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground">
						{action}
					</span>
				</div>
				<SceneBar className="h-1.5 w-32" />
			</MailSheet>
		</AuthScene>
	);
}

export function WorkspaceScene({
	title,
	description,
	workspaceName,
	workspaceLogo,
	teamName,
	teamLogo,
	memberCount
}: Readonly<{
	title: string;
	description: string;
	workspaceName: string;
	workspaceLogo?: string | null;
	teamName: string;
	teamLogo?: string | null;
	memberCount?: number;
}>) {
	const t = useTranslations();
	const hasTeam = Boolean(teamName);
	const hasMemberCount = typeof memberCount === 'number' && memberCount > 0;
	const placeholderRows = [0, 1, 2];

	return (
		<AuthScene title={title} description={description}>
			<AppSheet
				sidebar={
					<>
						<SceneWorkspace name={workspaceName} imageUrl={workspaceLogo} />
						{hasTeam && (
							<div className="flex min-w-0 items-center gap-2 rounded-md bg-foreground/[0.05] px-1.5 py-1">
								<EntityTile name={teamName} imageUrl={teamLogo} className="size-4 text-[8px]" />
								<span className="min-w-0 truncate text-[11px] font-medium text-foreground">
									{teamName}
								</span>
							</div>
						)}
						<SceneNavRows count={4} />
					</>
				}
			>
				<div className="flex items-center gap-2.5">
					{hasTeam && <EntityTile name={teamName} imageUrl={teamLogo} className="size-7 text-[10px]" />}
					<div className="flex min-w-0 flex-col gap-0.5">
						<SceneText
							text={teamName}
							className="text-[13px] font-semibold text-foreground"
							barClassName="w-24"
						/>
						{hasMemberCount && (
							<span className="text-[11px] text-muted-foreground tabular-nums">
								{t('auth.scene.MEMBER_COUNT', { count: memberCount })}
							</span>
						)}
					</div>
				</div>
				<div className="flex flex-col gap-2">
					{placeholderRows.map((row) => (
						<SceneMemberPlaceholder key={row} />
					))}
				</div>
			</AppSheet>
		</AuthScene>
	);
}

export function TeamScene({
	title,
	description,
	teamName,
	name,
	email
}: Readonly<{ title: string; description: string; teamName: string; name: string; email: string }>) {
	const t = useTranslations();
	const hasTeamName = Boolean(teamName.trim());

	return (
		<AuthScene title={title} description={description}>
			<AppSheet
				sidebar={
					<>
						<SceneWorkspace name={teamName.trim()} />
						<SceneNavRows count={4} />
					</>
				}
			>
				<div className="flex items-center gap-2.5">
					{hasTeamName && <EntityTile name={teamName} className="size-7 text-[10px]" />}
					<div className="flex min-w-0 flex-col gap-0.5">
						<SceneText
							text={teamName.trim()}
							className="text-[13px] font-semibold text-foreground"
							barClassName="w-24"
						/>
						<span className="text-[11px] text-muted-foreground tabular-nums">
							{t('auth.scene.MEMBER_COUNT', { count: 1 })}
						</span>
					</div>
				</div>
				<div className="flex flex-col gap-2">
					<SceneMemberCard name={name} email={email} badge={t('auth.scene.MANAGER')} />
					<SceneEmptySeat label={t('auth.scene.INVITE_LATER')} />
					<SceneEmptySeat label={t('auth.scene.INVITE_LATER')} />
				</div>
			</AppSheet>
		</AuthScene>
	);
}

export function InviteScene({
	title,
	description,
	organizationName,
	organizationImage,
	name,
	email
}: Readonly<{
	title: string;
	description: string;
	organizationName: string;
	organizationImage?: string | null;
	name: string;
	email: string;
}>) {
	return (
		<AuthScene title={title} description={description}>
			<AppSheet
				sidebar={
					<>
						<SceneWorkspace name={organizationName} imageUrl={organizationImage} />
						<SceneNavRows count={4} />
					</>
				}
			>
				<div className="flex items-center gap-2.5">
					<EntityTile name={organizationName} imageUrl={organizationImage} className="size-7 text-[10px]" />
					<span className="min-w-0 truncate text-[13px] font-semibold text-foreground">
						{organizationName}
					</span>
				</div>
				<div className="flex flex-col gap-2">
					<SceneMemberPlaceholder />
					<SceneMemberCard name={name} email={email} />
					<SceneMemberPlaceholder />
				</div>
			</AppSheet>
		</AuthScene>
	);
}

function memberCountOf(count: string | number | undefined) {
	const parsed = Number(count);
	if (Number.isNaN(parsed)) {
		return undefined;
	}
	return parsed;
}

export function PickedWorkspaceScene({
	title,
	description,
	workspaces,
	selectedWorkspace,
	selectedTeam
}: Readonly<{
	title: string;
	description: string;
	workspaces: ISigninEmailConfirmWorkspaces[];
	selectedWorkspace: number;
	selectedTeam: string;
}>) {
	const workspace = workspaces[selectedWorkspace];
	const teams = workspace?.current_teams ?? [];
	const team = teams.find((item) => item?.team_id === selectedTeam);

	return (
		<WorkspaceScene
			title={title}
			description={description}
			workspaceName={workspaceNameOf(workspace)}
			workspaceLogo={workspace?.user?.tenant?.logo}
			teamName={team?.team_name ?? ''}
			teamLogo={team?.team_logo}
			memberCount={memberCountOf(team?.team_member_count)}
		/>
	);
}
