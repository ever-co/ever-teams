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
						--tw-color-dark--theme: #0a0a0a;
					}
					/* No min-width: fit-content any more — it pinned the page to its widest row, so the
					   content panel overflowed instead of reflowing when the chat panel took space. */
					.mx-8-container {
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
