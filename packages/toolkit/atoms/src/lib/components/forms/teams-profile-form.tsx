import { cn, Input, Select, ThemedButton } from '@ever-teams/toolkit-ui';
import { languagesAndFlags } from '@components/i18n/language-switch';
import { useProfileForm } from '@hooks/useProfileForm';
import { useTeamsContext } from '@lib/context/teams-context';
import i18n from '@lib/i18n/init';
import { timeZones } from '@lib/utils/time-zone';
import { LoaderCircle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TeamsProfilePhotoForm } from './teams-profile-photo-form';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';

const TeamsProfileForm = ({ className }: { className?: string }) => {
	const { t } = useTranslation();
	const { authenticatedUser: user } = useTeamsContext();
	const form = useProfileForm();

	if (!user) return null;

	return (
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-2 w-full ', className)}>
			<h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('PROFILE.title')}</h2>
			<TeamsProfilePhotoForm />

			<div className="flex gap-3 w-full">
				<div className="flex flex-col gap-2 w-full">
					<label htmlFor="first-name" className="text-slate-500 dark:text-white text-sm">
						{t('COMMON.first_name')} :
					</label>
					<Input
						onChange={form.handleInputChange}
						className="border"
						placeholder={t('AUTH.first_name_prompt')}
						value={form.formData.firstName}
						size={30}
						type="text"
						name="firstName"
					/>
				</div>

				<div className="flex flex-col gap-2 w-full">
					<label htmlFor="last-name" className="text-slate-500 dark:text-white text-sm">
						{t('COMMON.last_name')} :
					</label>
					<Input
						onChange={form.handleInputChange}
						className="border"
						placeholder={t('AUTH.last_name_prompt')}
						value={form.formData.lastName}
						size={30}
						type="text"
						name="lastName"
					/>
				</div>
			</div>

			<label htmlFor="email" className="text-slate-500 dark:text-white text-sm">
				{t('COMMON.email')} :
			</label>
			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.email_prompt')}
				value={form.formData.email}
				size={30}
				type="email"
				name="email"
			/>

			<label htmlFor="phone-number" className="text-slate-500 dark:text-white text-sm">
				{t('COMMON.phone_number')} :
			</label>
			<Input
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.phone_number_prompt')}
				value={form.formData.phoneNumber}
				size={30}
				type="tel"
				name="phoneNumber"
			/>

			<div className="flex gap-3 w-full">
				<div className="flex flex-col gap-2 w-full">
					<label htmlFor="preferredLanguage" className="text-slate-500 dark:text-white text-sm">
						{t('COMMON.preferred_language')} :
					</label>
					<Select
						search
						placeholder={t('COMMON.preferred_language')}
						value={form.formData.preferredLanguage}
						onValueChange={form.handleSelectChange.changeLanguage}
						name="preferredLanguage"
						values={Object.keys(i18n.services.resourceStore.data).map((lng) => {
							const eltLabel = languagesAndFlags.find((f) => f.code === lng)?.language;
							const icon = languagesAndFlags.find((f) => f.code === lng)?.flag;
							return {
								label: eltLabel ? eltLabel : lng,
								value: lng,
								icon
							};
						})}
					/>
				</div>

				<div className="flex flex-col gap-2 w-full">
					<label htmlFor="time-format" className="text-slate-500 dark:text-white text-sm">
						{t('COMMON.time_format')} :
					</label>
					<Select
						placeholder={t('COMMON.time_zone')}
						value={form.formData.timeFormat.toLocaleString()}
						name="time-format"
						values={[
							{ label: '24h', value: '24' },
							{ label: '12h', value: '12' }
						]}
						onValueChange={form.handleSelectChange.changeTimeFormat}
					/>
				</div>
			</div>

			<div className="flex flex-col gap-2 w-full">
				<label htmlFor="time-zone" className="text-slate-500 dark:text-white text-sm">
					{t('COMMON.time_zone')} :
				</label>
				<Select
					search
					placeholder={t('COMMON.time_zone')}
					value={form.formData.timeZone}
					name="time-zone"
					values={timeZones.map((tz) => ({ label: tz, value: tz }))}
					onValueChange={form.handleSelectChange.changeTimeZone}
				/>
			</div>

			{form.errors && form.errors[0] ? <span className="text-red-500 text-xs">{form.errors[0]}</span> : null}

			<ThemedButton
				disabled={form.loading || form.errors[0] ? true : false}
				className="flex gap-2 mt-5 max-w-fit"
			>
				{form.loading ? (
					<span className="animate-spin ">
						<LoaderCircle />
					</span>
				) : (
					<Lock size={16} />
				)}{' '}
				{t('PROFILE.update_profil')}
			</ThemedButton>

			<TeamsTimerFooter />
		</form>
	);
};

export { TeamsProfileForm };
