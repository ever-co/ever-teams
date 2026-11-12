'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/core/components/common/command';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { SelectedMark } from '@/core/components/common/selected-mark';
import { Button } from '@/core/components/duplicated-components/_button';
import { Users, X } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import type { MeetingInvitee } from '@/core/lib/utils/meetings';

/** Keys that turn the address being typed into a participant; Enter on an empty line still sends the form. */
const COMMIT_KEYS = new Set(['Enter', ',', ';']);

interface ParticipantsFieldProps {
	/** The team members one can pick. */
	invitees: MeetingInvitee[];
	/** The addresses of the participants so far. */
	emails: string[];
	/** The address being typed. */
	draft: string;
	onDraftChange: (draft: string) => void;
	/** Adds the address being typed to the participants. */
	onCommitDraft: () => void;
	onToggle: (email: string) => void;
	onRemove: (email: string) => void;
	/** What was typed is no address. */
	isInvalid: boolean;
}

/**
 * The people to invite, as in the inspiration's "Add participants": team members picked from a searchable list, and
 * any address typed or pasted, each shown as a chip that removes it.
 */
export function ParticipantsField({
	invitees,
	emails,
	draft,
	onDraftChange,
	onCommitDraft,
	onToggle,
	onRemove,
	isInvalid
}: Readonly<ParticipantsFieldProps>) {
	const t = useTranslations();
	const inputId = useId();
	const errorId = useId();
	const [isPickerOpen, setIsPickerOpen] = useState(false);
	const nameOf = (email: string) => invitees.find((invitee) => invitee.email === email)?.name ?? email;

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		const hasDraft = draft.trim().length > 0;
		const lastEmail = emails.at(-1);
		if (!hasDraft && event.key === 'Backspace' && lastEmail) {
			onRemove(lastEmail);
			return;
		}
		if (hasDraft && COMMIT_KEYS.has(event.key)) {
			event.preventDefault();
			onCommitDraft();
		}
	};

	return (
		<div className="flex flex-col gap-1.5 sm:col-span-2">
			<label htmlFor={inputId} className="text-sm font-medium text-foreground">
				{t('meetings.FIELD_PARTICIPANTS')}
			</label>
			<div className="flex items-start gap-2">
				<div className={cn(controlGroupRecipe, 'min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1 p-1')}>
					{emails.length > 0 && (
						<ul aria-label={t('meetings.FIELD_PARTICIPANTS')} className="contents">
							{emails.map((email) => (
								<li
									key={email}
									title={email}
									className="inline-flex h-6 max-w-full items-center gap-1 rounded-md bg-foreground/5 pl-2 pr-0.5 text-xs font-medium text-foreground"
								>
									<span className="truncate">{nameOf(email)}</span>
									<button
										type="button"
										onClick={() => onRemove(email)}
										aria-label={t('meetings.REMOVE_PARTICIPANT', { name: nameOf(email) })}
										className="inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-[5px] opacity-60 outline-none transition-[opacity,background-color] hover:bg-foreground/10 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3"
									>
										<X aria-hidden="true" />
									</button>
								</li>
							))}
						</ul>
					)}
					<input
						id={inputId}
						type="text"
						inputMode="email"
						autoComplete="off"
						spellCheck={false}
						value={draft}
						onChange={(event) => onDraftChange(event.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={() => {
							if (draft.trim()) onCommitDraft();
						}}
						aria-invalid={isInvalid || undefined}
						aria-describedby={isInvalid ? errorId : undefined}
						placeholder={t('meetings.PARTICIPANTS_PLACEHOLDER')}
						className="h-7 min-w-36 flex-1 bg-transparent px-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/75"
					/>
				</div>
				{invitees.length > 0 && (
					<Popover open={isPickerOpen} onOpenChange={setIsPickerOpen}>
						<PopoverTrigger asChild>
							<Button type="button" variant="outline" size="lg" data-testid="meeting-team-members">
								<Users className="size-4" aria-hidden="true" />
								<span className="max-sm:sr-only">{t('meetings.TEAM_MEMBERS')}</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] p-0">
							<Command>
								<CommandInput placeholder={t('meetings.SEARCH_TEAM_MEMBERS')} />
								<CommandList className="max-h-64">
									<CommandEmpty>{t('meetings.NO_TEAM_MEMBERS')}</CommandEmpty>
									<CommandGroup>
										{invitees.map((invitee) => (
											<CommandItem
												key={invitee.email}
												value={invitee.email}
												keywords={[invitee.name]}
												onSelect={() => onToggle(invitee.email)}
											>
												<span className="flex min-w-0 flex-1 flex-col">
													<span className="truncate">{invitee.name}</span>
													<span className="truncate text-xs text-muted-foreground">
														{invitee.email}
													</span>
												</span>
												{emails.includes(invitee.email) && <SelectedMark />}
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)}
			</div>
			{isInvalid && (
				<p id={errorId} role="alert" className="text-xs text-destructive-ink">
					{t('meetings.PARTICIPANTS_INVALID')}
				</p>
			)}
		</div>
	);
}
