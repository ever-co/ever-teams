import { Button, Text } from 'lib/components';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
function NotFound() {
	const { t } = useTranslation();
	return (
		<div className="mt-28">
			<div className="m-auto w-[218px] h-[218px] rounded-full relative flex justify-center items-center text-center p-5 bg-[#6755c933] dark:bg-light--theme-light">
				<Text className="text-6xl font-semibold text-primary">404</Text>
			</div>

			<Text className="text-2xl font-normal text-center mt-10 text-[#282048] dark:text-light--theme">
				{t('pages.page404.HEADING_TITLE')}
			</Text>
			<Text className="mt-5 text-base font-normal text-center text-gray-400">
				{t('pages.page404.HEADING_DESCRIPTION')}
			</Text>
			<Link href="/">
				<Button className="m-auto mt-10 font-normal rounded-lg pl-7 pr-7">
					{t('pages.page404.LINK_LABEL')}
				</Button>
			</Link>
		</div>
	);
}

export default NotFound;
