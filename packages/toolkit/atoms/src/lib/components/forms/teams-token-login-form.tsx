/** @jsxImportSource theme-ui */
import { useTokenSubmission } from '@hooks/useTokenSubmission';
import { Button, cn, useThemeColor } from '@ever-teams/toolkit-ui';
import { LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KitFormError, KitFormField } from './kit-form-field';

const TeamsTokenLoginForm = ({ className, redirectHandler }: { className?: string; redirectHandler?: () => void }) => {
	const mainColor = useThemeColor('mainColor');
	const form = useTokenSubmission(redirectHandler);
	const { t } = useTranslation();

	return (
		<form onSubmit={form.handleSubmit} className={cn('flex flex-col gap-4 min-w-[20rem] ', className)}>
			<KitFormField
				label={t('COMMON.token')}
				required
				onChange={form.handleInputChange}
				placeholder={t('AUTH.token_prompt')}
				value={form.tokenInput}
				size={30}
				name="token"
			/>

			<KitFormError message={form.error} />

			<Button style={{ background: mainColor }} disabled={form.error ? true : false} className="flex h-9 gap-2">
				{form.isLoading && (
					<span className=" animate-spin ">
						<LoaderCircle />
					</span>
				)}
				{t('AUTH.sign_in_title')}
			</Button>
		</form>
	);
};

export { TeamsTokenLoginForm };
