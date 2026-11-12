'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { CommandGroup, CommandItem } from '@/core/components/common/command';
import { DocsPageGlyph } from '@/core/components/pages/docs/docs-page-glyph';
import { useDocsSearch } from '@/core/hooks/docs/use-docs-search';
import { isDocsEnabled } from '@/core/lib/utils/docs-enabled';
import { pageTitle } from '@/core/lib/utils/docs-tree';
import { organizationTeamsState } from '@/core/stores/teams/organization-team';
import { EDocumentVisibility, type IDocumentPage } from '@/core/types/interfaces/common/docs';

/** At most this many pages under the tasks: the Docs search has the rest. */
const PALETTE_PAGES_LIMIT = 6;

interface PaletteDocsResultsProps {
	search: string;
	onOpenPage: (pageId: string) => void;
	className?: string;
}

/**
 * The Docs pages whose title or text matches what is typed in the command palette (the platform's search, which
 * covers the text), each with its space and its description. Nothing while the field holds less than two characters,
 * and nothing where the deployment has no Docs.
 */
export function PaletteDocsResults({ search, onOpenPage, className }: Readonly<PaletteDocsResultsProps>) {
	const t = useTranslations();
	const enabled = isDocsEnabled();
	const { results, query } = useDocsSearch(search, enabled);
	const teams = useAtomValue(organizationTeamsState);
	const teamNames = useMemo(() => new Map(teams.map((team) => [String(team.id), team.name ?? ''])), [teams]);
	const shown = results.slice(0, PALETTE_PAGES_LIMIT);

	if (!enabled || shown.length === 0) return null;

	const spaceOf = (page: IDocumentPage) => {
		if (page.visibility === EDocumentVisibility.PRIVATE) return t('docs.PRIVATE');
		if (page.visibility === EDocumentVisibility.TEAM) return (page.organizationTeamId && teamNames.get(page.organizationTeamId)) || t('docs.TEAM_SPACE');
		return t('docs.WORKSPACE');
	};

	return (
		<CommandGroup heading={t('docs.PALETTE_HEADING')} className={className}>
			{shown.map((page) => {
				const title = pageTitle(page, t('docs.UNTITLED'));
				const snippet = page.description?.trim() || null;
				const subtitle = [spaceOf(page), snippet].filter(Boolean).join(' · ');
				return (
					<CommandItem
						key={page.id}
						value={`docs-page ${page.id} ${title}`}
						// The platform matched the text too: what was typed keeps the row in the palette's own filter.
						keywords={[query]}
						onSelect={() => onOpenPage(page.id)}
						className="min-h-14 gap-3 rounded-lg px-2"
					>
						<span className="flex size-8 shrink-0 items-center justify-center text-base">
							<DocsPageGlyph page={page} />
						</span>
						<span className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="truncate text-sm text-foreground">{title}</span>
							<span className="truncate text-xs text-muted-foreground">{subtitle}</span>
						</span>
					</CommandItem>
				);
			})}
		</CommandGroup>
	);
}
