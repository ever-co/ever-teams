import { CHANGELOG_MAX_ENTRIES, changelogService, toChangelogEntries } from './changelog.service';

const entry = (overrides: Record<string, unknown> = {}) => ({
	id: 'e1',
	icon: 'gift-outline',
	title: "What's new and About",
	date: '2026-11-08T00:00:00.000Z',
	content: 'Open the gift icon in the header.',
	isFeature: false,
	learnMoreUrl: 'https://example.com/whats-new',
	platform: 'ever-teams',
	...overrides
});

describe('toChangelogEntries', () => {
	it("keeps Ever Teams' entries, newest first, in the panel's shape", () => {
		const entries = toChangelogEntries([
			entry({ id: 'old', date: '2026-10-02T00:00:00.000Z', title: 'Sign in with Ever ID' }),
			entry({ id: 'new' })
		]);

		expect(entries).toEqual([
			{
				id: 'new',
				icon: 'gift-outline',
				title: "What's new and About",
				date: '2026-11-08T00:00:00.000Z',
				content: 'Open the gift icon in the header.',
				learnMoreUrl: 'https://example.com/whats-new'
			},
			expect.objectContaining({ id: 'old', title: 'Sign in with Ever ID' })
		]);
	});

	it("never shows another product's entries, nor those of an API that ignores the product (no platform)", () => {
		const entries = toChangelogEntries([
			entry({ id: 'gauzy', platform: 'gauzy' }),
			entry({ id: 'works', platform: 'ever-works' }),
			entry({ id: 'old-api', platform: undefined }),
			entry({ id: 'teams' })
		]);

		expect(entries.map(({ id }) => id)).toEqual(['teams']);
	});

	it('drops sign-up feature cards and entries without a title, text or valid date', () => {
		const entries = toChangelogEntries([
			entry({ id: 'feature', isFeature: true }),
			entry({ id: 'no-title', title: '  ' }),
			entry({ id: 'no-content', content: undefined }),
			entry({ id: 'bad-date', date: 'not a date' }),
			null,
			'junk',
			entry({ id: 'kept' })
		]);

		expect(entries.map(({ id }) => id)).toEqual(['kept']);
	});

	it('keeps a learn-more link only when it is a full http(s) address', () => {
		const [js, relative, empty, ok] = toChangelogEntries([
			entry({ id: 'a', date: '2026-11-04T00:00:00.000Z', learnMoreUrl: 'javascript:alert(1)' }),
			entry({ id: 'b', date: '2026-11-03T00:00:00.000Z', learnMoreUrl: '/settings' }),
			entry({ id: 'c', date: '2026-11-02T00:00:00.000Z', learnMoreUrl: '' }),
			entry({ id: 'd', date: '2026-11-01T00:00:00.000Z', learnMoreUrl: 'https://docs.example.com/x' })
		]);

		expect([js.learnMoreUrl, relative.learnMoreUrl, empty.learnMoreUrl]).toEqual([null, null, null]);
		expect(ok.learnMoreUrl).toBe('https://docs.example.com/x');
	});

	it('reads anything but a list as no entries, and caps the list', () => {
		expect(toChangelogEntries(undefined)).toEqual([]);
		expect(toChangelogEntries({ items: [] })).toEqual([]);
		const many = Array.from({ length: CHANGELOG_MAX_ENTRIES + 5 }, (_, index) =>
			entry({ id: `e${index}`, date: new Date(Date.UTC(2026, 0, index + 1)).toISOString() })
		);
		expect(toChangelogEntries(many)).toHaveLength(CHANGELOG_MAX_ENTRIES);
	});
});

describe('ChangelogService', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("asks the public changelog listing for Ever Teams' What's New entries", async () => {
		const get = jest
			.spyOn(changelogService, 'get')
			.mockResolvedValue({
				data: { items: [entry(), entry({ id: 'gauzy', platform: 'gauzy' })], total: 2 }
			} as never);

		await expect(changelogService.getEntries()).resolves.toEqual([expect.objectContaining({ id: 'e1' })]);
		expect(get).toHaveBeenCalledWith('/changelog', { params: { platform: 'ever-teams', isFeature: false } });
		expect(changelogService.getConfig().timeout).toBe(8_000);
	});
});
