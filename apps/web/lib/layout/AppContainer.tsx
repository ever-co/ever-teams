import { FC, PropsWithChildren } from 'react';
import { Toaster, ToastMessageManager } from '@components/ui/toaster';
import { Meta } from '../components/meta';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/app/stores/fullWidth';
interface AppContainerProps extends PropsWithChildren {
	title?: string;
}
const AppContainer: FC<AppContainerProps> = ({ children, title = 'Ever Teams' }) => {
	const fullWidth = useAtomValue(fullWidthState);
	return (
		<>
			<style jsx global>
				{`
					:root {
						--tw-color-dark--theme: #191a20;
					}
					.mx-8-container {
						min-width: fit-content;
						${fullWidth
							? `
						margin-left: 2rem;
						margin-right: 2rem;
						`
							: `	--tblr-gutter-x: 1.5rem;
					--tblr-gutter-y: 0;
					padding-right: calc(var(--tblr-gutter-x) * 0.5);
					padding-left: calc(var(--tblr-gutter-x) * 0.5);
					margin-right: auto;
					margin-left: auto;`}
					}
				`}
			</style>
			<Meta title={title} />
			{children}
			<Toaster />
			<ToastMessageManager />
		</>
	);
};

export default AppContainer;
