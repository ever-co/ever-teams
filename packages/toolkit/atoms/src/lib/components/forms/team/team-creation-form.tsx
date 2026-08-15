import React from 'react';
import { cn, Dialog, InputField, Label, Textarea, ThemedButton, Tooltip } from '@ever-teams/toolkit-ui';
import { useTeamCreationForm } from '@hooks/useTeamCreationForm';
import { LoaderCircle, Plus } from 'lucide-react';
import { useTeamsContext } from '@lib/context/teams-context';
import { useTranslation } from 'react-i18next';

interface TeamCreationFormProps {
	className?: string;
}

/**
 * `TeamsTeamCreationForm` is a React component that renders a form for creating a new team.
 * It integrates with the `useTeamsContext` and `useTeamCreationForm` hooks to manage user data and form state.
 *
 * @component
 * @param {TeamCreationFormProps} props - The props for the component.
 * @param {string} props.className - Optional additional class names for styling the component.
 *
 * @returns {JSX.Element} A styled form for creating a team, including fields for team name and description.
 *
 * @remarks
 * - The form includes validation for required fields and displays error messages if submission fails.
 *
 * @example
 * ```tsx
 * <TeamsTeamCreationForm className="custom-class" />
 * ```
 */
const TeamsTeamCreationForm: React.FC<TeamCreationFormProps> = ({ className }) => {
	const { authenticatedUser: user } = useTeamsContext();

	const {
		formValues: { teamName, description },
		handleChange,
		handleSubmit,
		isSubmitting,
		error
	} = useTeamCreationForm();

	const { t } = useTranslation(undefined, { keyPrefix: 'TEAM_CREATION_FORM' });

	return (
		<div
			className={cn(
				'flex  bg-white dark:bg-gray-950 rounded-xl shadow-md p-6 flex-col justify-center items-start w-full',
				className
			)}
		>
			<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">{t('title')}</h2>
			<form className="w-full" onSubmit={handleSubmit}>
				<div className="space-y-4 w-full">
					<InputField
						id="teamName"
						name="teamName"
						label={t('name')}
						required
						value={teamName}
						onChange={handleChange}
						placeholder={t('enter_team_name')}
					/>
					<div>
						<Label
							htmlFor="description"
							className="block text-sm font-medium text-gray-700 dark:text-gray-300"
						>
							{t('description')}
						</Label>
						<Textarea
							id="description"
							name="description"
							rows={4}
							value={description}
							onChange={handleChange}
							className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500  sm:text-sm"
							placeholder={t('enter_team_description')}
						></Textarea>
					</div>
					{/* <InputField
							id="members"
							label="Add Members (Emails)"
							value={members}
							onChange={handleMembersChange}
							placeholder="Enter emails separated by commas"
							className="dark:bg-gray-700 dark:text-gray-100"
						/> */}
				</div>
				{error && <span className="text-red-500 text-xs">{error}</span>}

				<div className="mt-4">
					<Tooltip placement="auto" enabled={!user} message={!user ? 'Please login to create team' : ''}>
						<ThemedButton type="submit" className="min-w-52 py-2" disabled={isSubmitting || !user}>
							{isSubmitting && (
								<span className=" animate-spin mr-2 ">
									<LoaderCircle />
								</span>
							)}
							{t('create_team')}
						</ThemedButton>
					</Tooltip>
				</div>
			</form>
		</div>
	);
};

const TeamsTeamCreationFormDialog = ({ className, trigger }: { className?: string; trigger?: React.ReactNode }) => {
	const { t } = useTranslation(undefined, { keyPrefix: 'TEAM_CREATION_FORM.dialog' });
	return (
		<Dialog
			trigger={
				trigger ? (
					trigger
				) : (
					<ThemedButton>
						<Plus size={18} /> {t('create_new_team')}
					</ThemedButton>
				)
			}
		>
			<TeamsTeamCreationForm className={cn('p-0 shadow-none bg-inherit', className)} />
		</Dialog>
	);
};

export { TeamsTeamCreationForm, TeamsTeamCreationFormDialog };
