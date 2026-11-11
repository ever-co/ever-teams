import { buildEmojiIndex, emojiQueryAt, isInsideCode, suggestEmojis, type ChatEmojiDataset } from './chat-emoji';

const DATA: ChatEmojiDataset = {
	categories: [
		{ id: 'people', emojis: ['grinning', 'upside_down_face', '+1', 'thinking_face'] },
		{ id: 'nature', emojis: ['dog', 'hot_dog'] },
		{ id: 'symbols', emojis: ['tada'] }
	],
	emojis: {
		tada: { id: 'tada', name: 'Party Popper', keywords: ['celebration', 'party'], skins: [{ native: '🎉' }] },
		grinning: { id: 'grinning', name: 'Grinning Face', keywords: ['smile', 'happy'], skins: [{ native: '😀' }] },
		upside_down_face: {
			id: 'upside_down_face',
			name: 'Upside-Down Face',
			keywords: ['silly'],
			skins: [{ native: '🙃' }]
		},
		'+1': { id: '+1', name: 'Thumbs Up', keywords: ['thumbsup', 'yes', 'agree'], skins: [{ native: '👍' }] },
		thinking_face: { id: 'thinking_face', name: 'Thinking Face', keywords: ['hmm'], skins: [{ native: '🤔' }] },
		dog: { id: 'dog', name: 'Dog Face', keywords: ['pet'], skins: [{ native: '🐶' }] },
		hot_dog: { id: 'hot_dog', name: 'Hot Dog', keywords: ['food'], skins: [{ native: '🌭' }] },
		blank: { id: 'blank', name: 'Nothing' }
	},
	aliases: { thumbsup: '+1', satisfied: 'laughing' }
};

describe('emojiQueryAt', () => {
	it('reads the short name after a colon at the start or after a space', () => {
		expect(emojiQueryAt(':tad', 4)).toEqual({ query: 'tad', start: 0 });
		expect(emojiQueryAt('well done :Tad', 14)).toEqual({ query: 'tad', start: 10 });
		expect(emojiQueryAt('(:+1', 4)).toEqual({ query: '+1', start: 1 });
	});

	it('waits for two letters and stops at a space or a closed name', () => {
		expect(emojiQueryAt(':t', 2)).toBeNull();
		expect(emojiQueryAt(':tada: ', 7)).toBeNull();
		expect(emojiQueryAt(':tada:', 6)).toBeNull();
		expect(emojiQueryAt(':ta da', 6)).toBeNull();
	});

	it('leaves times, links and words with a colon alone', () => {
		expect(emojiQueryAt('at 10:30', 8)).toBeNull();
		expect(emojiQueryAt('see https://x.io', 16)).toBeNull();
		expect(emojiQueryAt('note:ab', 7)).toBeNull();
	});

	it('reads only up to the caret', () => {
		expect(emojiQueryAt(':thinking and more', 4)).toEqual({ query: 'thi', start: 0 });
	});

	it('offers nothing inside code', () => {
		expect(emojiQueryAt('`a :tad', 7)).toBeNull();
		expect(emojiQueryAt('```\n:tad', 8)).toBeNull();
		expect(emojiQueryAt('`a` :tad', 8)).toEqual({ query: 'tad', start: 4 });
		expect(emojiQueryAt('``a :tad', 8)).toBeNull();
		expect(emojiQueryAt('~~~\n:tad', 8)).toBeNull();
	});
});

describe('isInsideCode', () => {
	it('tells a code span and an open fence', () => {
		expect(isInsideCode('plain')).toBe(false);
		expect(isInsideCode('`open')).toBe(true);
		expect(isInsideCode('`closed` after')).toBe(false);
		expect(isInsideCode('```\nblock')).toBe(true);
		expect(isInsideCode('```\nblock\n```\nafter')).toBe(false);
		// A span left open on an earlier line does not reach the next one.
		expect(isInsideCode('`open\nnext')).toBe(false);
	});

	it('matches a code span by the length of its backtick run', () => {
		expect(isInsideCode('``code')).toBe(true);
		expect(isInsideCode('``code`` after')).toBe(false);
		// A single backtick inside a double-backtick span is part of the code.
		expect(isInsideCode('``a ` b')).toBe(true);
		expect(isInsideCode('``a ` b`` c')).toBe(false);
	});

	it('knows tilde fences, longer fences and a fence being typed', () => {
		expect(isInsideCode('~~~\nblock')).toBe(true);
		expect(isInsideCode('~~~\nblock\n~~~\nafter')).toBe(false);
		// A fence closes only with its own character, at least as long, and nothing after it.
		expect(isInsideCode('````\na\n```\nstill')).toBe(true);
		expect(isInsideCode('```\na\n~~~\nstill')).toBe(true);
		expect(isInsideCode('```\na\n``` js\nstill')).toBe(true);
		expect(isInsideCode('```js')).toBe(true);
	});
});

describe('buildEmojiIndex', () => {
	it('keeps the picker order, the aliases, and leaves out an emoji without a character', () => {
		const index = buildEmojiIndex(DATA);
		expect(index.map((entry) => entry.id)).toEqual([
			'grinning',
			'upside_down_face',
			'+1',
			'thinking_face',
			'dog',
			'hot_dog',
			'tada'
		]);
		expect(index.find((entry) => entry.id === '+1')?.names).toEqual(['+1', 'thumbsup']);
		expect(index.find((entry) => entry.id === 'tada')?.keywords).toEqual(
			expect.arrayContaining(['celebration', 'party', 'popper'])
		);
	});

	it('takes emoji the categories do not list, after them', () => {
		const index = buildEmojiIndex({ emojis: { zap: { id: 'zap', skins: [{ native: '⚡' }] } }, categories: [] });
		expect(index.map((entry) => entry.native)).toEqual(['⚡']);
	});
});

describe('suggestEmojis', () => {
	const index = buildEmojiIndex(DATA);
	const ids = (query: string, limit?: number) => suggestEmojis(index, query, limit).map((entry) => entry.id);

	it('ranks the exact name, then a name that starts with it, then a part of a name, then a keyword', () => {
		expect(ids('dog')).toEqual(['dog', 'hot_dog']);
		expect(ids('thu')).toEqual(['+1']);
		expect(ids('down')).toEqual(['upside_down_face']);
		expect(ids('cel')).toEqual(['tada']);
	});

	it('finds by alias and by a word of the name', () => {
		expect(ids('thumbsup')).toEqual(['+1']);
		expect(ids('popper')).toEqual(['tada']);
	});

	it('keeps the picker order inside a rank and cuts the list', () => {
		// A part of the short name (`…_face`) ranks above a word of the name (Grinning Face, Dog Face).
		expect(ids('fa')).toEqual(['upside_down_face', 'thinking_face', 'grinning', 'dog']);
		expect(ids('fa', 2)).toEqual(['upside_down_face', 'thinking_face']);
	});

	it('needs two letters and matches any case', () => {
		expect(ids('t')).toEqual([]);
		expect(ids('TADA')).toEqual(['tada']);
		expect(ids('zzz')).toEqual([]);
	});
});
