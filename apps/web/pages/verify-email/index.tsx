import { useEmailVerifyToken } from '@app/hooks';
import { BackdropLoader } from 'lib/components';
import { useTranslation } from 'lib/i18n';
import { MainLayout } from 'lib/layout';

export default function VerifyEmail() {
	const { loading } = useEmailVerifyToken();
	const { trans } = useTranslation('authTeam');

	return (
		<MainLayout>
			<BackdropLoader show={loading} title={trans.VERIFY_EMAIL_LOADING_TEXT} />
		</MainLayout>
	);
}
