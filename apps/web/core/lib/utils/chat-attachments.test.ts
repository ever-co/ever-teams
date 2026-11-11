import { CHAT_MESSAGE_MAX_ATTACHMENTS, type IChatFile, type IChatMessage } from '@/core/types/interfaces/common/chat';
import {
	pictureUrlOf,
	attachmentFallbackBody,
	attachmentIdsOf,
	filesById,
	filesOfTransfer,
	isFallbackBody,
	isFileDrag,
	isPictureFile,
	isShrinkableImage,
	isUploadingAny,
	isWebUrl,
	readyAttachmentIds,
	shrunkSize,
	unknownAttachmentIds,
	withinAttachmentLimit,
	type ChatAttachmentDraft
} from './chat-attachments';

function draft(key: string, status: ChatAttachmentDraft['status'], documentId?: string): ChatAttachmentDraft {
	return { key, name: `${key}.pdf`, size: 10, mimeType: 'application/pdf', status, documentId };
}

function message(id: string, extra: Partial<IChatMessage> = {}): IChatMessage {
	return {
		id,
		conversationId: 'c1',
		kind: 'message',
		body: 'hi',
		mentionsChannel: false,
		mentionsHere: false,
		alsoInConversation: false,
		replyCount: 0,
		createdAt: '2026-11-11T10:00:00.000Z',
		...extra
	};
}

function file(documentId: string, extra: Partial<IChatFile> = {}): IChatFile {
	return {
		documentId,
		messageId: 'm1',
		conversationId: 'c1',
		name: `${documentId}.png`,
		attachedAt: '2026-11-11T10:00:00.000Z',
		...extra
	};
}

describe('shrunkSize', () => {
	it('fits the longer edge and keeps the proportions', () => {
		expect(shrunkSize(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
		expect(shrunkSize(1000, 5000, 2000)).toEqual({ width: 400, height: 2000 });
	});

	it('leaves an image that already fits, or has no size', () => {
		expect(shrunkSize(2048, 1000, 2048)).toBeNull();
		expect(shrunkSize(0, 100)).toBeNull();
		expect(shrunkSize(Number.NaN, 100)).toBeNull();
	});

	it('never draws a side of zero pixels', () => {
		expect(shrunkSize(10000, 1, 100)).toEqual({ width: 100, height: 1 });
	});
});

describe('isShrinkableImage', () => {
	it('takes photos and screenshots, not animations or vectors', () => {
		expect(isShrinkableImage('image/jpeg')).toBe(true);
		expect(isShrinkableImage('IMAGE/PNG')).toBe(true);
		expect(isShrinkableImage('image/webp')).toBe(true);
		expect(isShrinkableImage('image/gif')).toBe(false);
		expect(isShrinkableImage('image/svg+xml')).toBe(false);
		expect(isShrinkableImage('application/pdf')).toBe(false);
	});
});

describe('the composer files', () => {
	const items = [
		draft('a', 'ready', 'doc-a'),
		draft('b', 'uploading'),
		draft('c', 'failed'),
		draft('d', 'ready', 'doc-d')
	];

	it('sends only the uploaded ones, in order', () => {
		expect(readyAttachmentIds(items)).toEqual(['doc-a', 'doc-d']);
		expect(readyAttachmentIds([draft('x', 'ready')])).toEqual([]);
	});

	it('tells when one is still uploading', () => {
		expect(isUploadingAny(items)).toBe(true);
		expect(isUploadingAny([items[0], items[2]])).toBe(false);
	});

	it('keeps what fits the message, counting what it already holds', () => {
		const picked = ['1', '2', '3'];
		expect(withinAttachmentLimit(picked, CHAT_MESSAGE_MAX_ATTACHMENTS - 2)).toEqual({
			accepted: ['1', '2'],
			refused: ['3']
		});
		expect(withinAttachmentLimit(picked, 0)).toEqual({ accepted: picked, refused: [] });
		expect(withinAttachmentLimit(picked, 12)).toEqual({ accepted: [], refused: picked });
	});
});

describe('attachmentFallbackBody', () => {
	it('names the files of a message sent with no words', () => {
		expect(attachmentFallbackBody([' report.pdf ', '', 'photo.jpg'])).toBe('report.pdf, photo.jpg');
	});

	it('cuts to the longest body the platform takes', () => {
		const body = attachmentFallbackBody(['a'.repeat(30), 'b'.repeat(30)], 20);
		expect(body).toHaveLength(20);
		expect(body.endsWith('…')).toBe(true);
	});
});

describe('isFallbackBody', () => {
	it('recognises a body that only names the files', () => {
		const files = [file('a', { name: 'Report', originalFilename: 'report.pdf' }), file('b', { name: 'photo.jpg' })];
		expect(isFallbackBody('report.pdf, photo.jpg', files)).toBe(true);
		expect(isFallbackBody('Report, photo.jpg', files)).toBe(true);
		expect(isFallbackBody('Here is the report', files)).toBe(false);
		expect(isFallbackBody('report.pdf', [])).toBe(false);
	});
});

describe('transfers', () => {
	it('takes the files of a drop or a paste', () => {
		const real = new File(['x'], 'a.txt', { type: 'text/plain' });
		const empty = new File([], 'ghost');
		expect(filesOfTransfer({ files: [real, empty] as unknown as FileList })).toEqual([real]);
		expect(filesOfTransfer(null)).toEqual([]);
	});

	it('tells a drag of files from a drag of text', () => {
		expect(isFileDrag({ types: ['Files'] })).toBe(true);
		expect(isFileDrag({ types: ['text/plain'] })).toBe(false);
		expect(isFileDrag(undefined)).toBe(false);
	});
});

describe('isWebUrl', () => {
	it('opens web addresses and local previews only', () => {
		expect(isWebUrl('https://cdn.example.com/a.png')).toBe(true);
		expect(isWebUrl('http://localhost:3000/a.png')).toBe(true);
		// The platform's addresses are web ones: a local object URL is never taken from it.
		expect(isWebUrl('blob:https://app.example.com/1')).toBe(false);
		expect(isWebUrl('javascript:alert(1)')).toBe(false);
		expect(isWebUrl('data:text/html,hi')).toBe(false);
		expect(isWebUrl('not a url')).toBe(false);
		expect(isWebUrl(null)).toBe(false);
	});
});

describe('isPictureFile', () => {
	it('shows bitmaps as pictures, never an SVG', () => {
		expect(isPictureFile({ name: 'a', mimeType: 'image/png' })).toBe(true);
		expect(isPictureFile({ name: 'a.svg', mimeType: 'image/svg+xml' })).toBe(false);
		expect(isPictureFile({ name: 'a.pdf', mimeType: 'application/pdf' })).toBe(false);
		expect(isPictureFile({ name: 'shot.JPG', mimeType: null })).toBe(true);
		expect(isPictureFile({ name: 'logo.svg', mimeType: null })).toBe(false);
	});
});

describe('the files of messages', () => {
	it('reads the ids a message names, without repeats, none for a deleted one', () => {
		expect(attachmentIdsOf(message('m', { attachmentIds: ['a', 'a', 'b'] }))).toEqual(['a', 'b']);
		expect(attachmentIdsOf(message('m', { attachmentIds: ['a'], deletedAt: '2026-11-11T11:00:00.000Z' }))).toEqual(
			[]
		);
		expect(attachmentIdsOf(message('m'))).toEqual([]);
	});

	it('names the files the list does not know, leaving out a message still being sent', () => {
		const known = new Map([['a', file('a')]]);
		const messages = [
			message('m1', { attachmentIds: ['a', 'b'] }),
			message('m2', { attachmentIds: ['c'] }),
			{ ...message('m3', { attachmentIds: ['d'] }), outbox: 'pending' } as IChatMessage
		];
		expect(unknownAttachmentIds(messages, known)).toEqual(['b', 'c']);
	});

	it('indexes the files by document, the newest copy first', () => {
		const byId = filesById([file('a', { name: 'new.png' }), file('a', { name: 'old.png' }), file('b')]);
		expect(byId.get('a')?.name).toBe('new.png');
		expect([...byId.keys()]).toEqual(['a', 'b']);
	});
});

describe('pictureUrlOf', () => {
	const both = { fileUrl: 'https://cdn.example.com/a.png', thumbUrl: 'https://cdn.example.com/a-small.png' };

	it('shows the thumbnail small and the original large', () => {
		expect(pictureUrlOf(both, 'thumb')).toBe(both.thumbUrl);
		expect(pictureUrlOf(both, 'full')).toBe(both.fileUrl);
	});

	it('lets either stand in for the other, and never an unsafe address', () => {
		expect(pictureUrlOf({ fileUrl: null, thumbUrl: both.thumbUrl }, 'full')).toBe(both.thumbUrl);
		expect(pictureUrlOf({ fileUrl: both.fileUrl, thumbUrl: 'javascript:alert(1)' }, 'thumb')).toBe(both.fileUrl);
		expect(pictureUrlOf({ fileUrl: 'data:image/png;base64,x', thumbUrl: null }, 'full')).toBeNull();
	});
});
