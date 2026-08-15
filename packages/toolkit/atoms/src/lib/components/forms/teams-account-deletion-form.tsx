import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
	Button,
	cn,
	InputField
} from '@ever-teams/toolkit-ui';
import { useAccountDeletionForm } from '@hooks/useAccountDeletionForm';
import { useTeamsContext } from '@lib/context/teams-context';
import { LoaderCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const TeamsAccountDeletionForm = ({ className }: { className?: string }) => {
	const { authenticatedUser: user } = useTeamsContext();
	const { error, password, loading, handleChange, handleSubmit, confirm, setConfirm } = useAccountDeletionForm();
	const { t } = useTranslation(undefined, { keyPrefix: 'ACCOUNT_DELETION_FORM' });

	if (!user) return null;

	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				'w-full rounded-xl border border-gray-200 dark:border-gray-700 p-6 bg-white dark:bg-black shadow-xs',
				className
			)}
		>
			<h2 className="text-xl font-semibold text-red-600 dark:text-red-500 mb-2">{t('title')}</h2>
			<p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('description')}</p>
			<div className="space-y-4">
				<InputField
					label={t('confirm_password')}
					placeholder={t('enter_current_password')}
					name="deleteConfirm"
					type="password"
					value={password}
					required
					onChange={handleChange}
				/>
				{error && <span className="text-red-500 text-xs">{error}</span>}

				<AlertDialog open={confirm}>
					<AlertDialogTrigger asChild>
						<Button
							disabled={loading}
							type="submit"
							className="mt-2 flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 text-sm transition"
						>
							{loading ? (
								<span className=" animate-spin ">
									<LoaderCircle />
								</span>
							) : (
								<Trash2 size={16} />
							)}{' '}
							{t('delete_account')}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle className="text-black dark:text-white">
								{t('dialog.title')}
							</AlertDialogTitle>
							<AlertDialogDescription>{t('dialog.description')}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel
								onClick={() => {
									setConfirm(false);
								}}
							>
								{' '}
								{t('cancel')}
							</AlertDialogCancel>
							<AlertDialogAction
								disabled={loading}
								className=" flex items-center justify-center gap-2 rounded-md bg-red-600 hover:bg-red-700 text-white  text-sm transition"
							>
								{loading ? (
									<span className=" animate-spin ">
										<LoaderCircle />
									</span>
								) : (
									<Trash2 size={16} />
								)}{' '}
								{t('delete_account')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</form>
	);
};
