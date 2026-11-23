const mockApiUrl = { value: '' };

jest.mock('@/core/constants/config/constants', () => ({
	get GAUZY_API_BASE_SERVER_URL() {
		return mockApiUrl;
	}
}));

import { API_URL_PLACEHOLDER, publicApiOriginOrPlaceholder, withoutTrailingSlashes } from './public-api-origin';

describe('publicApiOriginOrPlaceholder', () => {
	it("gives the API's public address the browser was given, else the placeholder", () => {
		mockApiUrl.value = 'https://api.example.com';
		expect(publicApiOriginOrPlaceholder()).toBe('https://api.example.com');

		mockApiUrl.value = '';
		expect(publicApiOriginOrPlaceholder()).toBe(API_URL_PLACEHOLDER);
	});
});

describe('withoutTrailingSlashes', () => {
	it('drops every slash the address ends with, and nothing else', () => {
		expect(withoutTrailingSlashes('https://api.example.com')).toBe('https://api.example.com');
		expect(withoutTrailingSlashes('https://api.example.com///')).toBe('https://api.example.com');
		expect(withoutTrailingSlashes('')).toBe('');
	});
});
