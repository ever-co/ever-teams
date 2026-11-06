'use client';

import { ReactNode, useId } from 'react';
import { useTranslations } from 'next-intl';
import { sizeOption } from '@/core/constants/config/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/core/components/common/select';
import { Spinner } from '@/core/components/icons';
import { useOptimisticSetting } from '@/core/hooks/settings/use-optimistic-setting';
import {
	SettingsReadOnlyNote,
	SettingsRow,
	SettingsSection,
	SettingsSurface
} from '@/core/components/settings/kit/settings-page';
import { InlineTextRow } from '@/core/components/settings/kit/inline-text-row';
import type { TOrganizationTeam } from '@/core/types/schemas';
import { TeamAvatarRow } from './team-avatar-row';
import { TeamColorControl, TeamColorValue } from './team-color-control';
import { TeamEmojiControl, TeamEmojiValue } from './team-emoji-control';

const TEAM_NAME_MAX_LENGTH = 80;

/** Gauzy stores the size as the option's text; the one worded option gets a translation. */
const ONLY_ME_SIZE = 'Only me';

type Translate = ReturnType<typeof useTranslations>;

function teamSizeLabelOf(size: string, t: Translate): string {
	if (size === ONLY_ME_SIZE) {
		return t('settings.teamGeneral.SIZE_ONLY_ME');
	}
	return t('settings.teamGeneral.SIZE_PEOPLE', { range: size });
}

function sizeChoicesOf(current: string): string[] {
	const offered = sizeOption.map((option) => option.name);
	const isOffered = !current || offered.includes(current);
	if (isOffered) {
		return offered;
	}
	return [...offered, current];
}

function TeamSizeValue({ size }: Readonly<{ size: string | null | undefined }>) {
	const t = useTranslations();
	if (!size) {
		return <span className="text-[13px] text-muted-foreground">{t('settings.teamGeneral.NOT_SET')}</span>;
	}
	return <span className="text-[13px] text-foreground">{teamSizeLabelOf(size, t)}</span>;
}

function TeamSizeSelect({
	id,
	size,
	onSave
}: Readonly<{ id: string; size: string | null; onSave: (size: string) => Promise<void> }>) {
	const t = useTranslations();
	const { value, isPending, change } = useOptimisticSetting<string>(size ?? '', onSave);
	const choices = sizeChoicesOf(value);

	let valueLabel: ReactNode = undefined;
	if (value) {
		valueLabel = teamSizeLabelOf(value, t);
	}

	return (
		<div className="flex items-center gap-2">
			{isPending && <Spinner aria-hidden="true" className="size-3.5 animate-spin text-muted-foreground" />}
			<Select
				value={value}
				onValueChange={(next) => {
					if (next) {
						void change(next);
					}
				}}
				disabled={isPending}
			>
				<SelectTrigger id={id} className="h-8 w-44 text-[13px]">
					<SelectValue placeholder={t('settings.teamGeneral.SIZE_PLACEHOLDER')}>{valueLabel}</SelectValue>
				</SelectTrigger>
				<SelectContent align="end">
					{choices.map((choice) => (
						<SelectItem key={choice} value={choice} className="text-[13px]">
							{teamSizeLabelOf(choice, t)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

interface TeamIdentitySectionProps {
	team: TOrganizationTeam;
	canEdit: boolean;
	saveName: (name: string) => Promise<void>;
	saveColor: (color: string | null) => Promise<void>;
	saveEmoji: (emoji: string | null) => Promise<void>;
	saveSize: (size: string) => Promise<void>;
	uploadAvatar: (file: File) => Promise<void>;
	removeAvatar: () => Promise<void>;
}

export function TeamIdentitySection({
	team,
	canEdit,
	saveName,
	saveColor,
	saveEmoji,
	saveSize,
	uploadAvatar,
	removeAvatar
}: Readonly<TeamIdentitySectionProps>) {
	const t = useTranslations();
	const sizeId = useId();
	const color = team.color ?? null;
	const emoji = team.emoji ?? null;
	const size = team.teamSize ?? null;

	const validateName = (value: string) => {
		const isEmpty = value.length === 0;
		const isTooLong = value.length > TEAM_NAME_MAX_LENGTH;
		if (isEmpty || isTooLong) {
			return t('toasts.teams.NAME_INVALID');
		}
		return null;
	};

	let colorControl = <TeamColorValue color={color} />;
	let emojiControl = <TeamEmojiValue emoji={emoji} />;
	let sizeControl = <TeamSizeValue size={size} />;
	let sizeLabelTarget: string | undefined = undefined;
	if (canEdit) {
		colorControl = <TeamColorControl color={color} onSave={saveColor} />;
		emojiControl = <TeamEmojiControl emoji={emoji} onSave={saveEmoji} />;
		sizeControl = <TeamSizeSelect id={sizeId} size={size} onSave={saveSize} />;
		sizeLabelTarget = sizeId;
	}

	return (
		<SettingsSection id="team" title={t('settings.teamGeneral.TEAM_SECTION')}>
			<SettingsSurface>
				<TeamAvatarRow team={team} canEdit={canEdit} onUpload={uploadAvatar} onRemove={removeAvatar} />
				<InlineTextRow
					label={t('settings.teamGeneral.NAME_LABEL')}
					value={team.name ?? ''}
					maxLength={TEAM_NAME_MAX_LENGTH}
					validate={validateName}
					onSave={saveName}
					readOnly={!canEdit}
				/>
				<SettingsRow
					label={t('settings.teamGeneral.COLOR_LABEL')}
					description={t('settings.teamGeneral.COLOR_DESCRIPTION')}
				>
					{colorControl}
				</SettingsRow>
				<SettingsRow
					label={t('settings.teamGeneral.EMOJI_LABEL')}
					description={t('settings.teamGeneral.EMOJI_DESCRIPTION')}
				>
					{emojiControl}
				</SettingsRow>
				<SettingsRow
					label={t('settings.teamGeneral.SIZE_LABEL')}
					description={t('settings.teamGeneral.SIZE_DESCRIPTION')}
					htmlFor={sizeLabelTarget}
				>
					{sizeControl}
				</SettingsRow>
			</SettingsSurface>
			{!canEdit && <SettingsReadOnlyNote>{t('settings.teamGeneral.READ_ONLY_NOTE')}</SettingsReadOnlyNote>}
		</SettingsSection>
	);
}
