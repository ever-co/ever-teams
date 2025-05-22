import { AppLayoutProps } from '@/core/types/interfaces';
import Footer from './footer/footer';
import Header from './header/header';
import Meta from './meta';

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
