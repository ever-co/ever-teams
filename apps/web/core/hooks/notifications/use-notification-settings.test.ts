import { withSave, withSaveReverted } from './use-notification-settings';

describe('notification setting saves', () => {
	it('applies a save to the row, or to a provisional row with an empty id when there is none yet', () => {
		expect(withSave({ id: 's1', mention: true }, { kind: 'switch', key: 'mention', isOn: false })).toEqual({ id: 's1', mention: false });
		expect(withSave(null, { kind: 'preferences', patch: { digestHour: 9 } })).toEqual({ id: '', preferences: { digestHour: 9 } });
		expect(withSave(null, { kind: 'switch', key: 'comment', isOn: false }).id).toBe('');
	});

	it('puts back only the fields of a refused save, and drops a provisional row that carries nothing any more', () => {
		const current = { id: 's1', mention: false, comment: false, preferences: { email: 'off' as const } };
		const previous = { id: 's1', mention: true, comment: false, preferences: { email: 'digest' as const } };
		expect(withSaveReverted(current, { kind: 'switch', key: 'mention', isOn: false }, previous)).toEqual({ ...current, mention: true });
		expect(withSaveReverted(current, { kind: 'preferences', patch: { email: 'off' } }, previous)).toEqual({ ...current, preferences: { email: 'digest' } });
		expect(withSaveReverted({ id: '', comment: false }, { kind: 'switch', key: 'comment', isOn: false }, null)).toBeNull();
		expect(withSaveReverted({ id: '', comment: false, mention: false }, { kind: 'switch', key: 'comment', isOn: false }, null)).toEqual({ id: '', comment: undefined, mention: false });
	});
});
