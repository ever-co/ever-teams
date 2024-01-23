import SadCry from '@components/ui/svgs/sad-cry';
import { Text } from 'lib/components';
import { useTranslations } from 'next-intl';
import React from 'react';

function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	const t = useTranslations();

	React.useEffect(() => {
		// Log the error to an error reporting service
		console.error(error);
	}, [error]);

	return (
		<div className="mt-28 flex flex-col gap-7 items-center">
			<div className="m-auto relative flex justify-center items-center gap-4 text-center ">
				<SadCry width={97} height={97} />
				<Text className="text-[78px] font-semibold text-chetwodeBlue">Error!</Text>
			</div>

			<Text className="text-[40px] font-bold text-center text-[#282048] dark:text-light--theme">
				{t('pages.offline.HEADING_TITLE')}
				{/* Something went wrong! */}
			</Text>
			<div className="flex flex-col gap-4">
				<Text className="text-[20px] font-normal text-center text-gray-400">
					{t('pages.offline.HEADING_DESCRIPTION')}
				</Text>
				<button onClick={() => reset()}>Try again</button>
			</div>
		</div>
	);
}

export default ErrorPage;
