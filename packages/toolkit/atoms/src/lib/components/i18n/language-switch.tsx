import { useTranslation } from 'react-i18next';
import { Select } from '@ever-teams/toolkit-ui';
import { useTeamsContext } from '../../context/teams-context';
import i18n from '@lib/i18n/init';

export const languagesAndFlags = [
	{
		flag: 'us',
		country: 'United States',
		code: 'en',
		language: 'English'
	},

	{
		flag: 'fr',
		country: 'France',
		code: 'fr',
		language: 'French'
	}
];

/**
 * Changes the current language of Teams components in the same Teams provider.
 * @param {string} language The language to switch to.
 * @returns {void}
 */
const changeTeamsLanguage = (language: string) => {
	i18n.changeLanguage(language);
	localStorage.setItem('preferred-language', language);
};

/**
 * A select component that allows users to switch the language of Teams components.
 *
 * Will automatically set the language to the user's preferred language if available.
 *
 * @param {{ size?: 'default' | 'sm' | 'lg' | null; label?: boolean }} props
 * @param {string} [props.size] The size of the select component.
 * @param {boolean} [props.label] Whether to show the label "Language Switch :"
 * @returns {JSX.Element}
 */
const TeamsLanguageSwitch = ({ size, label = false }: { size?: 'default' | 'sm' | 'lg' | null; label?: boolean }) => {
	const { t } = useTranslation();

	const {} = useTeamsContext();

	return (
		<div className=" flex flex-col gap-2 max-w-48">
			{label && (
				<label htmlFor="switch" className="text-sm ">
					{t('INPUT.language_switcher.select_language')}
				</label>
			)}
			<Select
				loading={false}
				name="switch"
				size={size}
				placeholder={t('INPUT.language_switcher.select_language')}
				disabled={false}
				value={i18n.language || undefined}
				defaultValue={i18n.language || undefined}
				onValueChange={(e) => {
					changeTeamsLanguage(e);
				}}
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
	);
};

export { TeamsLanguageSwitch, changeTeamsLanguage };
