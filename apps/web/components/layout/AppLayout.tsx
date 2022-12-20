import { AppLayoutProps } from '../../app/interfaces/hooks';
import Footer from './footer/footer';
import Header from './header/header';
import Meta from './Meta';

export const AppLayout = (props: AppLayoutProps) => {
	return (
		<>
			<Meta />
			<div className="flex flex-col h-screen justify-between overflow-x-hidden bg-[#ffffff] dark:bg-[#232C3B]">
				<Header />
				<div className="x-container-fluid">{props.children}</div>
				<Footer />
			</div>
		</>
	);
};
