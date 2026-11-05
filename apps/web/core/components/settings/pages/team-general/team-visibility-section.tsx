'use client';

import { useEffect, useId, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/core/components/duplicated-components/_button';
import { controlGroupRecipe } from '@/core/components/common/input';
import { Check, Copy, Globe, Link, Lock } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { teamShareLinkOf } from '@/core/lib/utils/settings-team';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import { SettingsRow, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { ChoiceCards, type ChoiceCardOption } from '@/core/components/settings/kit/choice-cards';
import type { TOrganizationTeam } from '@/core/types/schemas';

type Visibility = 'private' | 'public';

const COPIED_MS = 10_000;

function visibilityOf(isPublic: boolean): Visibility {
	if (isPublic) {
		return 'public';
	}
	return 'private';
}

function localeOf(param: string | string[] | undefined): string | null {
	if (typeof param === 'string') {
		return param;
	}
	return null;
}

function publicLinkOf(isPublic: boolean, link: string | null): string | null {
	if (!isPublic) {
		return null;
	}
	return link;
}

function useTeamShareLink(team: TOrganizationTeam): string | null {
	const params = useParams();
	const locale = localeOf(params?.locale);
	if (typeof window === 'undefined') {
		return null;
	}
	return teamShareLinkOf(window.location.origin, locale, team);
}

function TeamShareLinkField({ link }: Readonly<{ link: string }>) {
	const t = useTranslations();
	const fieldId = useId();
	const [isCopied, setIsCopied] = useState(false);

	useEffect(() => {
		if (!isCopied) {
			return;
		}
		const timer = window.setTimeout(() => setIsCopied(false), COPIED_MS);
		return () => window.clearTimeout(timer);
	}, [isCopied]);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(link);
			setIsCopied(true);
		} catch {
			toast.error(t('settings.teamGeneral.SHARE_LINK_NOT_COPIED'));
		}
	};

	let copyLabel: string = t('settings.teamGeneral.SHARE_LINK_COPY');
	let copyIcon = <Copy aria-hidden="true" />;
	if (isCopied) {
		copyLabel = t('settings.teamGeneral.SHARE_LINK_COPIED');
		copyIcon = <Check aria-hidden="true" />;
	}

	return (
		<div className="flex flex-col gap-1.5">
			<label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
				{t('settings.teamGeneral.SHARE_LINK_LABEL')}
			</label>
			<div className={cn(controlGroupRecipe, 'h-9 gap-2 pr-1 pl-2.5')}>
				<Link aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
				<input
					id={fieldId}
					readOnly
					value={link}
					onFocus={(event) => event.target.select()}
					className="min-w-0 flex-1 truncate bg-transparent text-[13px] text-foreground outline-none"
				/>
				<Button type="button" variant="ghost" size="sm" onClick={copy} aria-live="polite">
					{copyIcon}
					{copyLabel}
				</Button>
			</div>
		</div>
	);
}

interface TeamVisibilitySectionProps {
	team: TOrganizationTeam;
	canEdit: boolean;
	saveVisibility: (isPublic: boolean) => Promise<void>;
}

export function TeamVisibilitySection({ team, canEdit, saveVisibility }: Readonly<TeamVisibilitySectionProps>) {
	const t = useTranslations();
	const { value: isPublic, isPending, change } = useOptimisticSetting<boolean>(Boolean(team.public), saveVisibility);
	const shareLink = useTeamShareLink(team);
	const memberCount = team.members?.length ?? 0;

	const options: ChoiceCardOption<Visibility>[] = [
		{
			value: 'private',
			title: t('settings.teamGeneral.PRIVATE_TITLE'),
			detail: t('settings.teamGeneral.PRIVATE_DETAIL', { count: memberCount }),
			glyph: <Lock className="size-4" />
		},
		{
			value: 'public',
			title: t('settings.teamGeneral.PUBLIC_TITLE'),
			detail: t('settings.teamGeneral.PUBLIC_DETAIL'),
			glyph: <Globe className="size-4" />
		}
	];
	const picked = visibilityOf(isPublic);
	const pickedOption = options.find((option) => option.value === picked);
	const publicLink = publicLinkOf(isPublic, shareLink);

	const renderBelow = (option: Visibility) => {
		const isPublicOption = option === 'public';
		if (!isPublicOption || !shareLink) {
			return null;
		}
		return <TeamShareLinkField link={shareLink} />;
	};

	if (!canEdit) {
		return (
			<SettingsSection id="visibility" title={t('settings.teamGeneral.VISIBILITY_SECTION')}>
				<SettingsSurface>
					<div>
						<SettingsRow
							label={pickedOption?.title}
							description={pickedOption?.detail}
							leading={pickedOption?.glyph}
						/>
						{publicLink && (
							<div className="px-4 pb-4">
								<TeamShareLinkField link={publicLink} />
							</div>
						)}
					</div>
				</SettingsSurface>
			</SettingsSection>
		);
	}

	return (
		<SettingsSection id="visibility" title={t('settings.teamGeneral.VISIBILITY_SECTION')}>
			<ChoiceCards
				legend={t('settings.teamGeneral.VISIBILITY_LEGEND')}
				options={options}
				value={picked}
				onChange={(next) => {
					void change(next === 'public');
				}}
				disabled={isPending}
				renderBelow={renderBelow}
			/>
		</SettingsSection>
	);
}
