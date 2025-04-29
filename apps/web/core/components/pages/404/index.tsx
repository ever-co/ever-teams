'use client';
import { Button, Text } from 'lib/components';
import Link from 'next/link';
// import { useTranslations } from 'next-intl';

function NotFound() {
	// const t = useTranslations();
	return (
		<div className="flex flex-col items-center justify-center w-screen h-screen  dark:bg-black">
			<div className="flex flex-col items-center justify-center gap-6">
				<div className="flex items-center justify-center gap-4 text-center rounded-full  w-52 h-52 bg-black/10">
					{/* <SadCry width={97} height={97} /> */}
					<Text className="text-6xl font-semibold text-primary">404</Text>
				</div>

				<div className="flex flex-col items-center justify-center gap-5">
					<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
						Page Not found !{/* {t('pages.notFound.TITLE')} */}
					</Text>

					<Text className="font-light text-center text-gray-400 ">
						Resource you are looking for is not found !
					</Text>

					<Button className="m-auto font-normal rounded-lg ">
						<Link href="/">Go back to home</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}

export default NotFound;
