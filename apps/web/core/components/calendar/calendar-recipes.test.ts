import { memberToneOf } from '@/core/components/dashboards/team/team-series-tone';
import { dataColorHue } from '@/core/components/tasks/task-data-color';
import { entryToneStyle } from './calendar-recipes';

const NEUTRAL_STYLE = { '--entry': expect.stringContaining('var(--foreground)') };

function derivedToneTextOf(projectKey: string) {
	const style = entryToneStyle(null, projectKey);
	return JSON.stringify(style);
}

describe('entryToneStyle', () => {
	it('draws a project in its own colour when it has one, whatever its id', () => {
		const ownTone = { '--entry': dataColorHue('#123456') };

		expect(entryToneStyle('#123456', 'project-web')).toEqual(ownTone);
		expect(entryToneStyle('#123456')).toEqual(ownTone);
		expect(entryToneStyle('#123456', 'project-web')).not.toEqual(entryToneStyle(null, 'project-web'));
	});

	it('derives the hue of a project without a colour from its id, the same on every call', () => {
		const first = entryToneStyle(null, 'project-web');
		const second = entryToneStyle(null, 'project-web');

		expect(first).toEqual(second);
		expect(first).toEqual({ '--entry': memberToneOf('project-web') });
		expect(first).not.toEqual(entryToneStyle(null));
		expect(first).not.toEqual(NEUTRAL_STYLE);
	});

	it('does not give every project without a colour the same hue', () => {
		const keys = ['project-1', 'project-2', 'project-3', 'project-4', 'project-5', 'project-6'];
		const tones = keys.map(derivedToneTextOf);
		const distinctTones = new Set(tones);

		expect(distinctTones.size).toBeGreaterThan(1);
	});

	it('draws the time without a colour and without a project in the neutral tone', () => {
		expect(entryToneStyle(null)).toEqual(NEUTRAL_STYLE);
		expect(entryToneStyle(null, null)).toEqual(entryToneStyle(null));
		expect(entryToneStyle(null, undefined)).toEqual(entryToneStyle(null));
	});

	it("reads 'transparent' as no colour", () => {
		expect(entryToneStyle('transparent', 'project-web')).toEqual(entryToneStyle(null, 'project-web'));
		expect(entryToneStyle('transparent')).toEqual(entryToneStyle(null));
	});
});
