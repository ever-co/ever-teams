/** @jsxImportSource theme-ui */
import { useTokenSubmission } from '@hooks/useTokenSubmission';
import { Button, cn, Input } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TeamsTokenLoginForm = ({ className, redirectHandler }: { className?: string; redirectHandler?: () => void }) => {
	const form = useTokenSubmission(redirectHandler);
	const { t } = useTranslation();

	return (
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-2 min-w-[20rem] ', className)}>
			<label htmlFor="token" className="text-slate-500 dark:text-white">
				{t('AUTH.token_prompt')} :
			</label>

			<Input
				required
				onChange={form.handleInputChange}
				className="border"
				placeholder={t('AUTH.token_prompt')}
				value={form.tokenInput}
				size={30}
				name="token"
			/>

			{form.error && <span className="text-red-500 text-xs">{form.error}</span>}

			<Button sx={{ background: 'mainColor' }} disabled={form.error ? true : false} className="flex gap-2">
				{form.isLoading && (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				)}
				{t('AUTH.sign_in_title').toUpperCase()}
			</Button>
		</form>
	);
};

export { TeamsTokenLoginForm };
