import { ReactNode } from 'react';
import Footer from './footer/footer';
import Header from './header/header';
import Meta from './meta';

interface AppLayoutProps {
	children: ReactNode;
	additionalClass?: string;
}

export const AppLayout = (props: AppLayoutProps) => {
	return (
		<>
			<Meta />
			<div className="flex flex-col justify-between h-screen">
				<Header />
				<div className="x-container-fluid">{props.children}</div>
				<Footer />
			</div>
		</>
	);
};
