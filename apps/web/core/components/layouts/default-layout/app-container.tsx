import { FC, PropsWithChildren } from 'react';
import { ToastMessageManager } from '@/core/components/common/toaster';
import { Meta } from '@/core/components/common/meta';
import { APP_NAME } from '@/core/constants/config/constants';
interface AppContainerProps extends PropsWithChildren {
	title?: string;
}
const AppContainer: FC<AppContainerProps> = ({ children, title = APP_NAME }) => {
	return (
		<>
			<style jsx global>
				{`
					:root {
						--tw-color-dark--theme: #191a20;
					}
					.mx-8-container {
						min-width: fit-content;
						margin-left: 2rem;
						margin-right: 2rem;
					}
				`}
			</style>
			<Meta title={title} />
			{children}
			<ToastMessageManager />
		</>
	);
};

export default AppContainer;
