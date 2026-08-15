import { TeamsProvider } from '@ever-teams/atoms';
import ReactDOM from 'react-dom/client';

import { renderToStaticMarkup } from 'react-dom/server';

export const renderReactComponent = ({ element }: { element: React.ReactNode }) => {
	return renderToStaticMarkup(<TeamsProvider>{element}</TeamsProvider>);
};

export const renderReactComponentHtml = ({ element }: { element: React.ReactNode }): Promise<string> => {
	const container = document.createElement('div');
	return new Promise((resolve) => {
		const root = ReactDOM.createRoot(container);
		root.render(<TeamsProvider>{element}</TeamsProvider>);
		setTimeout(() => {
			resolve(container.outerHTML);
		}, 100);
	});
};

export const renderReactComponentDynamic = (element: React.ReactElement, el: HTMLElement) => {
	if (!el.childNodes.length) {
		const root = ReactDOM.createRoot(el);
		root.render(<TeamsProvider>{element}</TeamsProvider>);
		return root;
	}
	return null;
};
