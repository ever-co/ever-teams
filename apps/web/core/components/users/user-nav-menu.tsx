import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useAuthenticateUser } from '@/core/hooks';
import { activeTeamState, isTeamManagerState, isTeamMemberState, publicState, timerStatusState } from '@/core/stores';
import {
	Briefcase,
	ChevronRight,
	ChevronsUpDown,
	Globe,
	InformationCircle,
	LogOut,
	Moon,
	Settings,
	Users
} from '@/core/components/icons';
import { TimerStatus, getTimerStatusValue } from '../timer/timer-status';
import Collaborate from '@/core/components/collaborate';
import { TeamsDropDown } from '../teams/teams-dropdown';
import { KeyboardShortcuts } from '@/core/components/common/keyboard-shortcuts';
import { useSidebar } from '@/core/components/common/sidebar';
import { LanguageDropDownWithFlags } from '@/core/components/common/language-dropdown-flags';
import { signOutFunction } from '@/core/lib/helpers/social-logins';
import { Avatar, AvatarFallback, AvatarImage } from '@/core/components/common/avatar';
import { EntityTile } from '@/core/components/common/entity-tile';
import { ETimerStatus } from '@/core/types/generics/enums/timer';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { cn } from '@/core/lib/helpers';
import { ThemeSwitch } from '@/core/components/common/theme-switch';
import { MENU_ROW, MENU_ROW_DESTRUCTIVE, MENU_SEPARATOR, MENU_SURFACE } from '@/core/components/common/menu-recipes';
import type { TOrganizationTeam } from '@/core/types/schemas/team/organization-team.schema';

const MENU_SETTING_ROW =
	"flex h-9 w-full items-center justify-between gap-3 rounded-md px-2 text-[13px] text-foreground [&>span>svg]:size-4 [&>span>svg]:shrink-0 [&>span>svg:not([class*='text-'])]:text-muted-foreground";

const LANGUAGE_TRIGGER_CLASS_NAME =
	'h-7 w-auto gap-1 border-none bg-transparent px-1.5 text-[13px] text-muted-foreground shadow-none ring-transparent hover:bg-foreground/5 hover:text-foreground';

/** At rest a quiet row; open, the outlined raised look of the app's "..." buttons, so it reads as the menu's anchor. */
const SIDEBAR_TRIGGER =
	'group/account flex w-full items-center gap-2.5 rounded-lg hairline-border border-transparent p-1.5 text-left outline-none transition-[background-color,box-shadow] hover:bg-foreground/[0.045] focus-visible:ring-[3px] focus-visible:ring-ring/25 data-open:bg-card data-open:shadow-sm data-open:shadow-black/10 data-open:hairline-ring data-open:ring-foreground/10 dark:data-open:ring-foreground/15';

const AVATAR_SIZE = {
	sm: 'size-8 text-xs',
	md: 'size-9 text-[13px]'
} as const;

type AccountUser = ReturnType<typeof useUserQuery>['data'];

interface AccountIdentity {
	fullName: string;
	email: string;
	imageUrl: string | null | undefined;
	status: ETimerStatus;
	isManager: boolean;
	team: TOrganizationTeam | null;
}

function initialsOf(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const letters = words.slice(0, 2).map((word) => word[0]);
	return letters.join('').toUpperCase();
}

function fullNameOf(user: AccountUser) {
	const joinedName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
	if (joinedName) {
		return joinedName;
	}
	return user?.name || user?.username || '';
}

function imageUrlOf(user: AccountUser) {
	return user?.image?.thumbUrl || user?.image?.fullUrl || user?.imageUrl;
}

/** Who is signed in, their role in the active team and their presence, read once for the trigger and the menu. */
function useAccountIdentity(): AccountIdentity {
	const { data: user } = useUserQuery();
	const timerStatus = useAtomValue(timerStatusState);
	const activeTeam = useAtomValue(activeTeamState);
	const publicTeam = useAtomValue(publicState);
	const isManager = useAtomValue(isTeamManagerState);
	const currentMember = activeTeam?.members?.find((member) => member.employee?.userId === user?.id);
	const status = useMemo(
		() => getTimerStatusValue(timerStatus, currentMember, publicTeam),
		[timerStatus, currentMember, publicTeam]
	);
	return {
		fullName: fullNameOf(user),
		email: user?.email ?? '',
		imageUrl: imageUrlOf(user),
		status,
		isManager,
		team: activeTeam ?? null
	};
}

/** The person's own photo or Gauzy's placeholder on the opaque avatar, with the presence icon used across the app. */
function AccountAvatar({
	identity,
	size,
	ringClassName
}: Readonly<{ identity: AccountIdentity; size: keyof typeof AVATAR_SIZE; ringClassName: string }>) {
	return (
		<span className="relative shrink-0">
			<Avatar className={AVATAR_SIZE[size]}>
				<AvatarImage src={identity.imageUrl ?? undefined} alt={identity.fullName} />
				<AvatarFallback className="text-[inherit]">{initialsOf(identity.fullName)}</AvatarFallback>
			</Avatar>
			<TimerStatus
				status={identity.status}
				size="sm"
				className={cn('ring-2', ringClassName)}
				tooltipClassName="absolute -right-1 -bottom-1"
			/>
		</span>
	);
}

function RolePill({ isManager }: Readonly<{ isManager: boolean }>) {
	const t = useTranslations();
	if (isManager) {
		return (
			<span className="inline-flex h-4.5 shrink-0 items-center rounded-[5px] bg-primary/10 px-1.5 text-[10px] font-medium text-primary-ink">
				{t('common.MANAGER')}
			</span>
		);
	}
	return (
		<span className="inline-flex h-4.5 shrink-0 items-center rounded-[5px] bg-foreground/[0.06] px-1.5 text-[10px] font-medium text-muted-foreground">
			{t('common.MEMBER')}
		</span>
	);
}

function IdentityLines({ identity, showsRole }: Readonly<{ identity: AccountIdentity; showsRole: boolean }>) {
	const hasEmail = identity.email.length > 0;
	return (
		<span className="flex min-w-0 flex-1 flex-col gap-0.5">
			<span className="flex min-w-0 items-center gap-1.5">
				<span className="truncate text-[13px] font-medium leading-tight text-foreground">
					{identity.fullName}
				</span>
				{showsRole && <RolePill isManager={identity.isManager} />}
			</span>
			{hasEmail && <span className="truncate text-xs leading-tight text-muted-foreground">{identity.email}</span>}
		</span>
	);
}

function MenuSeparator() {
	return <div className={MENU_SEPARATOR} aria-hidden="true" />;
}

type UserNavAvatarProps = {
	/**
	 * `header`: the round avatar of the top bar (phones).
	 * `sidebar`: the avatar, name and e-mail row at the foot of the sidebar, menu opening upwards.
	 */
	variant?: 'header' | 'sidebar';
};

export function UserNavAvatar({ variant = 'header' }: Readonly<UserNavAvatarProps>) {
	const t = useTranslations();
	const identity = useAccountIdentity();

	if (variant === 'sidebar') {
		return <SidebarUserNav identity={identity} />;
	}

	return (
		<Popover className="relative flex items-center">
			<PopoverButton
				aria-label={t('accountMenu.OPEN')}
				className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25"
			>
				<AccountAvatar identity={identity} size="md" ringClassName="ring-card" />
			</PopoverButton>
			<PopoverPanel
				anchor={{ to: 'bottom end', gap: 8 }}
				transition
				className="z-[1060] w-[18rem] transition duration-100 ease-out focus:outline-none data-closed:scale-95 data-closed:opacity-0"
			>
				<UserNavMenu identity={identity} showsIdentity />
			</PopoverPanel>
		</Popover>
	);
}

/**
 * The sidebar-foot account row: avatar with the presence icon, the name, the e-mail, and the menu opening above it. Collapsed to the icon rail only the avatar shows and the menu opens to its
 * right. On phones the sidebar is a modal sheet that blocks pointer events outside itself, so the panel stays in it.
 */
function SidebarUserNav({ identity }: Readonly<{ identity: AccountIdentity }>) {
	const t = useTranslations();
	const { state, isMobile } = useSidebar();
	const isCollapsed = state === 'collapsed' && !isMobile;
	let anchor: { to: 'right end' | 'top start'; gap: number } | undefined = { to: 'top start', gap: 8 };
	if (isCollapsed) {
		anchor = { to: 'right end', gap: 8 };
	}
	if (isMobile) {
		anchor = undefined;
	}
	let triggerTitle: string | undefined;
	if (isCollapsed) {
		triggerTitle = identity.fullName;
	}

	return (
		<Popover className="relative flex w-full items-center">
			<PopoverButton
				aria-label={t('accountMenu.OPEN')}
				title={triggerTitle}
				className={cn(SIDEBAR_TRIGGER, isCollapsed && 'justify-center p-1')}
			>
				<AccountAvatar
					identity={identity}
					size="sm"
					ringClassName="ring-sidebar group-data-open/account:ring-card"
				/>
				{!isCollapsed && (
					<>
						<IdentityLines identity={identity} showsRole={false} />
						<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					</>
				)}
			</PopoverButton>

			<PopoverPanel
				anchor={anchor}
				transition
				className={cn(
					'z-[1060] focus:outline-none',
					'transition duration-100 ease-out data-closed:scale-95 data-closed:opacity-0',
					isMobile && 'absolute bottom-full left-0 mb-2 w-full',
					!isMobile && 'w-[18rem]'
				)}
			>
				<UserNavMenu identity={identity} showsIdentity={false} />
			</PopoverPanel>
		</Popover>
	);
}

function TeamMark({ team }: Readonly<{ team: TOrganizationTeam | null }>) {
	if (!team) {
		return null;
	}
	return (
		<span className="ml-auto flex min-w-0 max-w-28 items-center gap-1.5 text-xs text-muted-foreground">
			<EntityTile
				name={team.name}
				color={team.color}
				imageUrl={team.image?.thumbUrl ?? team.image?.fullUrl}
				className="size-4 text-[7px]"
			/>
			<span className="truncate">{team.name}</span>
		</span>
	);
}

/**
 * The account menu: where to go, the preferences, then Log out alone and last in destructive ink. Opened from the
 * sidebar's foot it starts with the links, since the name and e-mail sit right under it; opened from the top bar's
 * avatar it starts with who is signed in.
 */
function UserNavMenu({ identity, showsIdentity }: Readonly<{ identity: AccountIdentity; showsIdentity: boolean }>) {
	const { user, logOut } = useAuthenticateUser();
	const t = useTranslations();
	const isTeamMember = useAtomValue(isTeamMemberState);
	const publicTeam = useAtomValue(publicState);
	const pathname = usePathname();
	const name = user?.name || user?.firstName || user?.lastName || user?.username || '';
	const isTeamDropdownAllowed = isTeamDropdownAllowedOn(pathname);
	const showsTeamsDropdown = isTeamMember && isTeamDropdownAllowed;

	return (
		<div className={cn(MENU_SURFACE, 'flex w-full flex-col')}>
			{showsIdentity && (
				<>
					<Link
						href="/settings/personal"
						className="group/identity flex items-center gap-3 rounded-lg px-2 py-2 outline-none transition-colors hover:bg-foreground/5 focus-visible:bg-foreground/5"
					>
						<AccountAvatar identity={identity} size="md" ringClassName="ring-popover" />
						<IdentityLines identity={identity} showsRole />
						<ChevronRight
							aria-hidden="true"
							className="size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover/identity:text-muted-foreground"
						/>
					</Link>
					<MenuSeparator />
				</>
			)}

			<ul className="flex w-full flex-col">
				<li>
					<Link href={`/profile/${user?.id}?name=${name}`} className={MENU_ROW}>
						<Briefcase />
						<span>{t('common.MY_TASKS')}</span>
					</Link>
				</li>
				<li>
					<Link href="/" className={MENU_ROW}>
						<Users />
						<span className="shrink-0">{t('common.MY_TEAM')}</span>
						<TeamMark team={identity.team} />
					</Link>
				</li>
				<li>
					<Link href="/settings/personal" className={MENU_ROW}>
						<Settings />
						<span>{t('common.SETTINGS')}</span>
					</Link>
				</li>
				<li>
					<Link href="/about" className={MENU_ROW}>
						<InformationCircle />
						<span>{t('pages.about.TITLE')}</span>
					</Link>
				</li>
			</ul>

			<MenuSeparator />

			<ul className="flex w-full flex-col">
				<li className={MENU_SETTING_ROW}>
					<span className="flex flex-1 items-center gap-2.5">
						<Moon />
						<span>{t('common.THEME')}</span>
					</span>
					<ThemeSwitch />
				</li>
				<li className={MENU_SETTING_ROW}>
					<span className="flex flex-1 items-center gap-2.5">
						<Globe />
						<span>{t('common.LANGUAGE')}</span>
					</span>
					<LanguageDropDownWithFlags
						deferLoading
						showFlag={false}
						btnClassName={LANGUAGE_TRIGGER_CLASS_NAME}
					/>
				</li>
			</ul>

			<ul className="flex flex-col items-center justify-start gap-2 md:hidden">
				<MenuSeparator />
				{!publicTeam && <Collaborate />}
				{showsTeamsDropdown && <TeamsDropDown publicTeam={publicTeam || false} />}
				<KeyboardShortcuts />
			</ul>

			<MenuSeparator />

			<ul className="w-full">
				<li>
					<button
						type="button"
						className={cn(MENU_ROW, MENU_ROW_DESTRUCTIVE)}
						onClick={() => {
							// signOut navigates away: let logOut stop the timer and clear the session first
							void logOut().then(signOutFunction);
						}}
					>
						<LogOut />
						<span>{t('common.LOGOUT')}</span>
					</button>
				</li>
			</ul>
		</div>
	);
}

const TEAM_DROPDOWN_HIDDEN_PATHS: ReadonlySet<string> = new Set(['/task/[id]', '/profile/[memberId]']);

function isTeamDropdownAllowedOn(pathname: string | null) {
	if (!pathname) {
		return false;
	}
	return !TEAM_DROPDOWN_HIDDEN_PATHS.has(pathname);
}
