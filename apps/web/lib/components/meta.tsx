import Head from 'next/head';

type Props = {
	title?: string;
	keywords?: string;
	description?: string;
	siteName?: string;
};

export const Meta = ({ title, keywords, description, siteName }: Props) => {
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

const defaultProps: Props = {
	siteName: 'Gauzy Teams',
	title: '',
	keywords: '',
	description: '',
};

Meta.defaultProps = defaultProps;
