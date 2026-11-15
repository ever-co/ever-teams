'use client';

import { useMemo, useState } from 'react';
import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { Notice } from '@/core/components/common/notice';
import { Button } from '@/core/components/duplicated-components/_button';
import { Spinner, User } from '@/core/components/icons';
import {
	importMembersAddedOf,
	importPlaceholderCandidatesOf,
	placeholderFailureOf,
	type ImportMemberAdded,
	type PlaceholderFailure
} from '@/core/lib/utils/member-placeholder';
import type { TimeImportRow } from '@/core/lib/utils/time-import-rows';
import type { MemberPlaceholders } from '@/core/hooks/settings/use-member-placeholders';

/** The names a notice lists before it says how many more there are. */
const NAMES_SHOWN = 3;

function nameOf(member: { firstName: string; lastName?: string; email?: string }): string {
	if (member.email) {
		return member.email;
	}
	return [member.firstName, member.lastName].filter(Boolean).join(' ');
}

/**
 * Offers to add the people a file names that nobody in the team is, as members without an account, then checks the
 * file again with them: their rows become ready like any member's. Nobody is emailed. A person who already belongs
 * to the organization, but not to this team, is not created again: the notice says to add them to the team first.
 */
export function TimeImportPlaceholderOffer({
	rows,
	onAdd,
	onAdded
}: Readonly<{
	rows: ReadonlyArray<TimeImportRow>;
	onAdd: MemberPlaceholders['addPlaceholders'];
	onAdded: (members: ImportMemberAdded[]) => Promise<void> | void;
}>) {
	const t = useTranslations();
	const [isAdding, setIsAdding] = useState(false);
	const [failure, setFailure] = useState<PlaceholderFailure | null>(null);
	// Emails Gauzy answered with a member of the organization outside this team: never offered again
	const [notInTeamKeys, setNotInTeamKeys] = useState<ReadonlyArray<string>>([]);

	const allCandidates = useMemo(() => importPlaceholderCandidatesOf(rows), [rows]);
	const candidates = useMemo(
		() => allCandidates.filter((candidate) => !notInTeamKeys.includes(candidate.key)),
		[allCandidates, notInTeamKeys]
	);
	const outsideTeam = allCandidates.filter((candidate) => notInTeamKeys.includes(candidate.key));
	const hasCandidates = candidates.length > 0;
	const hasOutsideTeam = outsideTeam.length > 0;

	if (!hasCandidates && !hasOutsideTeam) {
		return null;
	}

	const add = async () => {
		setIsAdding(true);
		setFailure(null);
		try {
			const items = await onAdd(candidates.map((candidate) => candidate.member));
			const outcome = importMembersAddedOf(candidates, items);
			setNotInTeamKeys((current) => [...current, ...outcome.notInTeamKeys]);
			await onAdded(outcome.added);
		} catch (error) {
			setFailure(placeholderFailureOf(error, 'create'));
		} finally {
			setIsAdding(false);
		}
	};

	const rowCount = candidates.reduce((total, candidate) => total + candidate.rowCount, 0);
	const names = candidates.slice(0, NAMES_SHOWN).map((candidate) => nameOf(candidate.member));
	const moreCount = candidates.length - names.length;
	const failureText = failure && t(failure.key as DottedLanguageObjectStringPaths, failure.values);

	return (
		<>
			{hasCandidates && (
				<Notice
					tone="info"
					glyph={<User />}
					title={t('timeImport.placeholders.TITLE', { count: candidates.length, rows: rowCount })}
					description={
						<span className="flex flex-col gap-1">
							<span>{t('timeImport.placeholders.DESCRIPTION')}</span>
							<span className="break-words text-foreground">
								{t('timeImport.placeholders.NAMES', {
									names: names.join(', '),
									more: moreCount
								})}
							</span>
							{failureText && (
								<span role="alert" className="text-destructive-ink">
									{t('timeImport.placeholders.FAILED')} {failureText}
								</span>
							)}
						</span>
					}
					actions={
						<Button type="button" onClick={() => void add()} disabled={isAdding}>
							{isAdding && <Spinner aria-hidden="true" className="animate-spin" />}
							{t('timeImport.placeholders.ADD', { count: candidates.length })}
						</Button>
					}
				/>
			)}
			{hasOutsideTeam && (
				<Notice
					tone="neutral"
					glyph={<User />}
					title={t('timeImport.placeholders.OUTSIDE_TEAM_TITLE', { count: outsideTeam.length })}
					description={t('timeImport.placeholders.OUTSIDE_TEAM_DESCRIPTION', {
						names: outsideTeam.map((candidate) => nameOf(candidate.member)).join(', ')
					})}
				/>
			)}
		</>
	);
}
