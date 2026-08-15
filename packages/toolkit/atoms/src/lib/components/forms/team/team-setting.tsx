import { Avatar, cn, ColorPicker, InputField, Label, RadioGroup, RadioGroupItem, Select, ThemedButton } from '@ever-teams/toolkit-ui';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { SpinOverlayLoader } from '@components/loaders/spin-overlay-loader';
import { useTeamSetting } from '@hooks/useTeamSetting';
import { useTeamsContext } from '@lib/context/teams-context';
import { Loader2, Lock, PencilLine } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TeamSettingProps {
	className?: string;
}

const TeamsTeamSetting = ({ className }: TeamSettingProps) => {
	const {
		formValues: { color, name, size, isPublic },
		preview,
		handleInputFileChange,
		handleChange,
		handleSelectChange,
		handleRadioChange,
		error,
		handleSubmit,
		isSubmitting
	} = useTeamSetting();

	const { selectedTeam } = useTeamsContext();

	const { t } = useTranslation(undefined, { keyPrefix: 'TEAM_SETTING' });

	return (
		<form
			onSubmit={handleSubmit}
			className={cn('flex flex-col gap-4 w-full bg-white dark:bg-black rounded-2xl p-6 shadow-xs', className)}
		>
			{isSubmitting && <SpinOverlayLoader className="bg-black/30 text-white dark:text-black rounded-full z-50" />}
			<h2 className="pb-7 border-b border-b-gray-300 dark:border-b-gray-700 text-xl font-semibold text-gray-900 dark:text-white">
				{t('title')}
			</h2>
			<div className={'relative w-20 h-20'}>
				{isSubmitting && (
					<SpinOverlayLoader className="bg-black/30 text-white dark:text-black rounded-full z-50" />
				)}
				<div className="w-7 h-7 absolute border-2 border-white dark:border-black/50 cursor-pointer flex justify-center items-center top-1 right-[-5px] z-20 text-white bg-blue-950 rounded-full">
					<PencilLine className="w-3 h-3 cursor-pointer" />
					<input
						type="file"
						onChange={handleInputFileChange}
						accept="image/*"
						multiple={false}
						className="size-7 top-0 left-0 absolute z-50 opacity-0 cursor-pointer"
						title="Change Team Image"
					/>
				</div>
				<Avatar
					fallback={name ? (name[0] + name[1]).toUpperCase() : 'NA'}
					src={preview}
					title={name ? name : ''}
					className="w-20 h-20"
				/>
			</div>
			<InputField
				name="name"
				value={name}
				onChange={handleChange}
				label={t('form.team_name')}
				placeholder={t('form.enter_team_name')}
			/>

			<ColorPicker
				name="color"
				value={color}
				onChange={handleChange}
				placeholder={t('form.enter_team_color')}
				label={t('form.team_color')}
			/>

			<div className="flex flex-col gap-2">
				<Label className="text-slate-500 dark:text-white text-sm">{t('form.team_size')}</Label>
				<Select
					values={[
						{ label: 'Only me', value: 'Only me' },
						{ label: '1 - 5', value: '1 - 5' },
						{ label: '6 - 20', value: '6 - 20' },
						{ label: '21 - 100', value: '21 - 100' },
						{ label: '100+', value: '100+' }
					]}
					value={size}
					onValueChange={handleSelectChange}
					placeholder={t('form.select_team_size')}
				/>
			</div>
			<RadioGroup
				onValueChange={handleRadioChange}
				defaultValue={isPublic ? 'public' : 'private'}
				name="isPublic"
				value={isPublic ? 'public' : 'private'}
				className="grid grid-row-2  w-full gap-2 items-center"
			>
				<Label className="row-span-1 text-slate-500 dark:text-white text-sm">{t('form.team_type')}</Label>

				<div className="flex gap-4 items-center row-span-1 h-10 p-2 border rounded-lg dark:border-gray-800">
					<div className="flex gap-2">
						<RadioGroupItem value="private" id="team-type-2" />
						<Label htmlFor="team-type-2">{t('form.private')}</Label>
					</div>
					<div className="flex gap-2 ">
						<RadioGroupItem value="public" id="team-type-1" />
						<Label htmlFor="team-type-1">{t('form.public')}</Label>
					</div>
				</div>
			</RadioGroup>

			{/* <div className="grid grid-row-2  w-full gap-2 items-center">
				<Label className="text-slate-500 dark:text-white text-sm row-span-1">Time tracking</Label>
				<div className="flex gap-4 items-center row-span-1 h-10 p-2 border rounded-lg dark:border-gray-800">
					<Switch
						onChange={(e) => {
							console.log(e.target);
						}}
						className="row-span-1"
					/>{' '}
					<Label>Activate time tracking</Label>
				</div>
			</div> */}

			{error && <p className="text-sm text-red-500">{error}</p>}

			<ThemedButton disabled={selectedTeam == 'all' || isSubmitting} className="flex gap-2 mt-2 max-w-fit">
				{isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Lock size={16} />}{' '}
				{t('form.update_team')}
			</ThemedButton>

			<TeamsTimerFooter />
		</form>
	);
};

export { TeamsTeamSetting };
