import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
	return (
		<Html lang="en">
			<Head />
			<body className="bg-light--theme dark:bg-dark--theme">
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
