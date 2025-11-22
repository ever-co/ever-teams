import SadCry from '@/core/components/svgs/sad-cry';
import { Text } from '@/core/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { DEFAULT_APP_PATH } from '@/core/constants/config/constants';

export default function ErrorPageComponent() {
	const t = useTranslations();
	return (
		<div className="flex flex-col gap-7 items-center mt-28">
			<div className="flex relative gap-4 justify-center items-center m-auto text-center">
				<SadCry width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">{t('pages.error.TITLE')}</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('pages.error.HEADING_TITLE')}
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.error.HEADING_DESCRIPTION')}
				</Text>
				<Link href={DEFAULT_APP_PATH} className="text-2xl text-center">
					{t('pages.authLogin.ERROR_SIGNIN')}
				</Link>
			</div>

			<div className="container flex flex-col gap-y-3 p-2 mt-5 max-w-5xl text-center rounded">
				<Link href={DEFAULT_APP_PATH} className="text-2xl font-medium text-center text-red-400">
					{t('pages.unauthorized.TRY_AGAIN')}
				</Link>
			</div>
		</div>
	);
}
