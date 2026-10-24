import { appVersionService } from './app-version.service';

describe('AppVersionService', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it('reads the existing public Gauzy API version endpoint', async () => {
		const version = {
			name: 'api',
			version: '0.1.0',
			commit: '63cb7a951107b2ab44d98617358c682bf9560eb8'
		};
		const get = jest.spyOn(appVersionService, 'get').mockResolvedValue({ data: version } as never);

		await expect(appVersionService.getVersion()).resolves.toEqual(version);
		expect(get).toHaveBeenCalledWith('/version');
		expect(appVersionService.getConfig().timeout).toBe(5_000);
	});
});
