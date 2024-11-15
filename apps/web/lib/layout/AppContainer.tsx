import { FC, PropsWithChildren } from 'react';
import { Meta } from '../components/meta';
import { useAtomValue } from 'jotai';
import { fullWidthState } from '@/app/stores/fullWidth';
interface AppContainerProps extends PropsWithChildren {
	title?: string;
	appContainerClassName?: string;
}
const AppContainer: FC<AppContainerProps> = ({ children, appContainerClassName, title = 'Ever Teams' }) => {
	const fullWidth = useAtomValue(fullWidthState);
	return (
		<>
			<style jsx global>
				{`
					:root {
						--tw-color-dark--theme: #191a20;
					}
					.mx-8-container {
						${fullWidth
							? `
						margin-left: 2rem;
						margin-right: 2rem;
						`
							: `	--tblr-gutter-x: 1.5rem;
					--tblr-gutter-y: 0;
					width: 100%;
					padding-right: calc(var(--tblr-gutter-x) * 0.5);
					padding-left: calc(var(--tblr-gutter-x) * 0.5);
					margin-right: auto;
					margin-left: auto;`}
					}
				`}
			</style>
			<Meta title={title} />
			{children}
		</>
	);
};

export default AppContainer;
