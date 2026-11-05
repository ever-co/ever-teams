/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { AuthLayout } from './auth-layout';

const mockPictures = { lightByOperator: false, darkByOperator: false };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/image', () => ({
	__esModule: true,
	default: ({ src, className }: { src: string; className?: string }) => <img src={src} alt="" className={className} />
}));
jest.mock('@/core/components/layouts/outside/outside-header', () => ({
	OutsideHeader: () => <header />
}));
jest.mock('@/core/constants/config/constants', () => ({
	APP_NAME: 'Ever Teams',
	APP_LINK: '',
	APP_SLOGAN_TEXT: '',
	COMPANY_NAME: 'Ever',
	COMPANY_LINK: '',
	TERMS_LINK: '',
	PRIVACY_POLICY_LINK: '',
	BRANDING_LINKS_SET_BY_OPERATOR: { app: false, company: false, terms: false, privacy: false },
	IS_DEMO_MODE: false,
	get MAIN_PICTURE() {
		if (mockPictures.lightByOperator) {
			return '/operator-light.png';
		}
		return '/built-in-light.png';
	},
	get MAIN_PICTURE_DARK() {
		if (mockPictures.darkByOperator) {
			return '/operator-dark.png';
		}
		return '/built-in-dark.png';
	},
	get MAIN_PICTURE_SET_BY_OPERATOR() {
		return mockPictures.lightByOperator;
	},
	get MAIN_PICTURE_DARK_SET_BY_OPERATOR() {
		return mockPictures.darkByOperator;
	}
}));

function pictureSources() {
	const images = Array.from(document.querySelectorAll('img'));
	return images.map((image) => image.getAttribute('src'));
}

describe('AuthLayout cover', () => {
	it('shows a dark-only operator cover in dark mode and keeps the scene in light mode', () => {
		mockPictures.lightByOperator = false;
		mockPictures.darkByOperator = true;

		render(<AuthLayout aside={<p>scene</p>}>form</AuthLayout>);

		expect(pictureSources()).toEqual(['/operator-dark.png']);
		expect(screen.getByText('scene')).toBeTruthy();
	});

	it('falls back to the built-in light cover on a page without a scene', () => {
		mockPictures.lightByOperator = false;
		mockPictures.darkByOperator = true;

		render(<AuthLayout>form</AuthLayout>);

		expect(pictureSources()).toEqual(['/built-in-light.png', '/operator-dark.png']);
	});

	it('shows the scene alone when the operator set no cover', () => {
		mockPictures.lightByOperator = false;
		mockPictures.darkByOperator = false;

		render(<AuthLayout aside={<p>scene</p>}>form</AuthLayout>);

		expect(pictureSources()).toEqual([]);
		expect(screen.getByText('scene')).toBeTruthy();
	});

	it('uses the operator light cover in both themes when it is the only one', () => {
		mockPictures.lightByOperator = true;
		mockPictures.darkByOperator = false;

		render(<AuthLayout aside={<p>scene</p>}>form</AuthLayout>);

		expect(pictureSources()).toEqual(['/operator-light.png', '/operator-light.png']);
		expect(screen.queryByText('scene')).toBeNull();
	});
});
