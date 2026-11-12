import { isOwnComment, isTextChanged, mentionedIn, mentionsToSend, uniquelyNamed } from './comment-ownership';

describe('isOwnComment — the platform’s rule for who may edit, resolve or delete a comment', () => {
	const reader = { employeeId: 'employee-me', userId: 'user-me' };

	it('is the author employee’s comment', () => {
		expect(isOwnComment({ authorEmployeeId: 'employee-me', authorUserId: 'user-other' }, reader)).toBe(true);
		expect(isOwnComment({ authorEmployeeId: 'employee-other', authorUserId: 'user-me' }, reader)).toBe(false);
	});

	it('is the posting user’s comment when it has no author employee', () => {
		expect(isOwnComment({ authorEmployeeId: null, authorUserId: 'user-me' }, reader)).toBe(true);
		expect(isOwnComment({ authorEmployeeId: null, authorUserId: 'user-other' }, reader)).toBe(false);
	});

	it('is nobody’s when neither side is known', () => {
		expect(isOwnComment({ authorEmployeeId: null, authorUserId: null }, { employeeId: null, userId: null })).toBe(
			false
		);
		expect(
			isOwnComment(
				{ authorEmployeeId: 'employee-me', authorUserId: null },
				{ employeeId: null, userId: 'user-me' }
			)
		).toBe(false);
	});
});

describe('mentionedIn — the mentions an edit keeps', () => {
	const ann = { employeeId: 'ann', name: 'Ann Lee' };
	const bo = { employeeId: 'bo', name: 'Bo Ray' };

	it('finds the people whose “@Full Name” the text holds', () => {
		expect(mentionedIn('Ping @Ann Lee about it', [ann, bo])).toEqual([ann]);
		expect(mentionedIn('No one here', [ann, bo])).toEqual([]);
		expect(mentionedIn('', [ann])).toEqual([]);
	});

	it('counts a complete mention only, the longest name first', () => {
		const annAlone = { employeeId: 'ann-alone', name: 'Ann' };

		expect(mentionedIn('Ping @Ann Lee about it', [annAlone, ann])).toEqual([ann]);
		expect(mentionedIn('@Ann, and @Ann Lee.', [annAlone, ann])).toEqual([annAlone, ann]);
		expect(mentionedIn('Ask @Annabel', [annAlone])).toEqual([]);
		expect(mentionedIn('mail@Ann Lee', [ann])).toEqual([]);
		expect(mentionedIn('@Ann Lee\nthanks', [ann])).toEqual([ann]);
	});

	it('names every namesake the text mentions, as the text cannot tell them apart', () => {
		const otherAnn = { employeeId: 'ann-2', name: 'Ann Lee' };

		expect(mentionedIn('@Ann Lee', [ann, otherAnn, bo])).toEqual([ann, otherAnn]);
	});
});

describe('uniquelyNamed — a typed mention names one person only when nobody shares the name', () => {
	it('keeps the people whose name is theirs alone', () => {
		const ann = { employeeId: 'ann', name: 'Ann Lee' };
		const otherAnn = { employeeId: 'ann-2', name: 'Ann Lee' };
		const bo = { employeeId: 'bo', name: 'Bo Ray' };

		expect(uniquelyNamed([ann, bo, otherAnn])).toEqual([bo]);
		expect(mentionedIn('Pasted @Bo Ray and @Ann Lee', uniquelyNamed([ann, bo, otherAnn]))).toEqual([bo]);
		expect(uniquelyNamed([])).toEqual([]);
	});
});

describe('mentionsToSend — an edit touches the mentions only when it changes them', () => {
	it('sends nothing when the text names the same people, whatever their order', () => {
		expect(mentionsToSend(['ann', 'bo'], ['bo', 'ann'])).toBeUndefined();
		expect(mentionsToSend([], [])).toBeUndefined();
	});

	it('sends the new list when a mention is added or removed', () => {
		expect(mentionsToSend(['ann'], ['ann', 'bo'])).toEqual(['ann', 'bo']);
		expect(mentionsToSend(['ann', 'bo'], ['bo'])).toEqual(['bo']);
		expect(mentionsToSend(['ann'], [])).toEqual([]);
	});
});

describe('isTextChanged', () => {
	it('ignores surrounding blanks, so the same text is not sent again', () => {
		expect(isTextChanged('Hello', ' Hello \n')).toBe(false);
		expect(isTextChanged('Hello', 'Hello!')).toBe(true);
	});
});
