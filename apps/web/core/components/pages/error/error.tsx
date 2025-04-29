import SadCry from '@/core/components/ui/svgs/sad-cry';
import { Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function ErrorPageComponent() {
	const t = useTranslations();
	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
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
				<Link href="/auth/passcode" className="text-2xl text-center">
					{t('pages.authLogin.ERROR_SIGNIN')}
				</Link>
			</div>

			<div className="p-2 flex flex-col gap-y-3 container max-w-5xl rounded mt-5 text-center">
				<Link href="/auth/passcode" className="text-2xl text-red-400 font-medium text-center">
					{t('pages.unauthorized.TRY_AGAIN')}
				</Link>
			</div>
		</div>
	);
}
