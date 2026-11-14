import logoImg from 'data-base64:~assets/logo/ever-teams-dark.png';
import React, { useRef, useState, type FC } from 'react';

import AppDropdown from '~components/shared/AppDropdown';
import useOnClickOutside from '~hooks/useOnClickOutside';
import { t } from '~lib/i18n';
import type { Session } from '~lib/workspaces';
import { ghostButton, textEllipsis } from '~misc/tailwindClasses';

interface HeaderProps {
	session: Session;
	/** A team cannot change while a run goes on: the run belongs to the team it started in. */
	teamLocked: boolean;
	onTeamSelect: (teamId: string) => void;
	onOpenSettings: () => void;
	onSignOut: () => void;
}

function initialsOf(name: string): string {
	const letters = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '');
	return letters.join('') || '?';
}

const Header: FC<HeaderProps> = ({ session, teamLocked, onTeamSelect, onOpenSettings, onSignOut }) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	useOnClickOutside(menuRef, () => setMenuOpen(false));

	const team = session.teams.find((candidate) => candidate.id === session.teamId);
	const teamOptions = session.teams.map((candidate) => ({ id: candidate.id, title: candidate.name }));
	const hasTeams = teamOptions.length > 0;

	return (
		<header className="flex items-center justify-between gap-2">
			<img className="h-5 w-auto dark:invert" src={logoImg} alt="Ever Teams" />
			<div className="flex min-w-0 items-center gap-1.5">
				{hasTeams && (
					<AppDropdown
						buttonLabel={t('headerTeam')}
						buttonTitle={team?.name ?? t('headerTeam')}
						buttonClassNames={`${ghostButton} ${textEllipsis} max-w-[150px] ring-1 ring-zinc-900/10 dark:ring-white/15 disabled:opacity-60`}
						options={teamOptions}
						selectedId={session.teamId}
						onOptionSelect={(option) => onTeamSelect(option.id)}
						disabled={teamLocked}
					/>
				)}
				<div ref={menuRef} className="relative">
					<button
						type="button"
						aria-haspopup="menu"
						aria-expanded={menuOpen}
						aria-label={t('headerAccount')}
						title={session.email}
						onClick={() => setMenuOpen((open) => !open)}
						className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-500/20 hover:bg-indigo-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:text-indigo-200"
					>
						{initialsOf(session.name)}
					</button>
					{menuOpen && (
						<div
							role="menu"
							className="absolute right-0 z-20 mt-1.5 w-52 rounded-xl bg-white p-1 shadow-md shadow-black/10 ring-1 ring-zinc-900/10 dark:bg-zinc-800 dark:ring-white/10"
						>
							<div className="px-2 py-1.5">
								<p className={`text-sm font-medium ${textEllipsis}`}>{session.name}</p>
								<p className={`text-xs text-zinc-500 dark:text-zinc-400 ${textEllipsis}`}>
									{session.email}
								</p>
							</div>
							<button
								type="button"
								role="menuitem"
								onClick={onOpenSettings}
								className="block w-full rounded-md px-2 py-1.5 text-start text-sm hover:bg-zinc-900/5 dark:hover:bg-white/10"
							>
								{t('headerSettings')}
							</button>
							<button
								type="button"
								role="menuitem"
								onClick={onSignOut}
								className="block w-full rounded-md px-2 py-1.5 text-start text-sm text-red-600 hover:bg-red-500/10 dark:text-red-300"
							>
								{t('headerSignOut')}
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default Header;
