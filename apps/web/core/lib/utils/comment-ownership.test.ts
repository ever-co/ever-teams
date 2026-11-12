import { isOwnComment, isTextChanged, mentionedIn, mentionsToSend } from './comment-ownership';

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

	it('names only the longest full name a mention spells, as the comment draws its chips', () => {
		const annShort = { employeeId: 'ann-short', name: 'Ann' };

		expect(mentionedIn('Ping @Ann Lee about it', [annShort, ann])).toEqual([ann]);
		expect(mentionedIn('@Ann and @Ann Lee', [annShort, ann])).toEqual([annShort, ann]);
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
