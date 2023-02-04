import { en } from 'lib/i18n';
import Head from 'next/head';

type Props = {
	title?: string;
	keywords?: string;
	description?: string;
	siteName?: string;
};

export const Meta = ({
	title = '',
	keywords = '',
	description = '',
	siteName = en.TITLE,
}: Props) => {
	return (
		<Head>
			<meta name="keywords" content={keywords} />
			<meta name="description" content={description} />
			<title>
				{`${title}${siteName && title ? ' | ' + siteName : siteName}`}
			</title>
		</Head>
	);
};
