'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { InlineTextRow } from '@/core/components/settings/kit/inline-text-row';
import { SettingsPage, SettingsSection, SettingsSurface } from '@/core/components/settings/kit/settings-page';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useSettings } from '@/core/hooks/users/use-settings';
import { useFillMissingTimeZone } from '@/core/hooks/settings/use-time-zone-setting';
import { nameProblemOf, NameProblem, PROFILE_NAME_MAX_LENGTH } from '@/core/lib/utils/settings-profile';
import type { TUser } from '@/core/types/schemas';
import { AccountDangerSection } from './account-danger-section';
import { EmailRow } from './email-row';
import { PhoneRow } from './phone-row';
import { PhotoRow } from './photo-row';
import { ProfileSectionsSkeleton } from './profile-settings-skeleton';
import { ProfileRatesSection } from './rates-section';

type ProfileField = 'firstName' | 'lastName' | 'phoneNumber';

export function ProfileSettingsPage() {
	const t = useTranslations();
	const { data: user } = useUserQuery();
	const { updateAvatar } = useSettings();
	const userId = user?.id;
	useFillMissingTimeZone();

	const saveField = useCallback(
		async (field: ProfileField, value: string) => {
			if (!userId) {
				return;
			}
			const body: Partial<TUser> & { id: string } = { id: userId };
			body[field] = value;
			await updateAvatar(body);
		},
		[updateAvatar, userId]
	);

	const nameMessageOf = (problem: NameProblem | null) => {
		if (problem === 'required') {
			return t('settings.profile.NAME_REQUIRED');
		}
		if (problem === 'tooLong') {
			return t('settings.profile.NAME_TOO_LONG', { max: PROFILE_NAME_MAX_LENGTH });
		}
		return null;
	};

	const validateFirstName = (value: string) => {
		const problem = nameProblemOf(value, true);
		return nameMessageOf(problem);
	};

	const validateLastName = (value: string) => {
		const problem = nameProblemOf(value, false);
		return nameMessageOf(problem);
	};

	return (
		<SettingsPage
			title={t('settings.entries.profile.TITLE')}
			description={t('settings.entries.profile.DESCRIPTION')}
		>
			{!user && <ProfileSectionsSkeleton />}
			{user && (
				<>
					<SettingsSection id="general" title={t('settings.profile.SECTION_PROFILE')}>
						<SettingsSurface>
							<PhotoRow />
							<InlineTextRow
								label={t('settings.profile.FIRST_NAME')}
								value={user.firstName ?? ''}
								emptyLabel={t('settings.profile.NOT_SET')}
								autoComplete="given-name"
								maxLength={PROFILE_NAME_MAX_LENGTH}
								validate={validateFirstName}
								onSave={(value) => saveField('firstName', value)}
							/>
							<InlineTextRow
								label={t('settings.profile.LAST_NAME')}
								value={user.lastName ?? ''}
								emptyLabel={t('settings.profile.NOT_SET')}
								autoComplete="family-name"
								maxLength={PROFILE_NAME_MAX_LENGTH}
								validate={validateLastName}
								onSave={(value) => saveField('lastName', value)}
							/>
							<EmailRow />
							<PhoneRow
								value={user.phoneNumber ?? ''}
								onSave={(value) => saveField('phoneNumber', value)}
							/>
						</SettingsSurface>
					</SettingsSection>
					{user.employee && <ProfileRatesSection employee={user.employee} />}
					<AccountDangerSection />
				</>
			)}
		</SettingsPage>
	);
}
