import Head from 'next/head';
import { MetaProps } from '../../app/interfaces/hooks';

const Meta = ({ title, keywords, description }: MetaProps) => {
	return (
		<Head>
			<meta name="keywords" content={keywords} />
			<meta name="description" content={description} />
			<title>{title}</title>
		</Head>
	);
};

Meta.defaultProps = {
	title: 'Gauzy Teams',
	keywords: '',
	description: ''
};

export default Meta;
