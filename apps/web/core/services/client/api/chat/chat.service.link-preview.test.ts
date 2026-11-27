/**
 * `chatService`'s link preview reads as they leave the client: a platform without the preview route, or with the
 * pictures off, answers 404, which the page reads as "ask no more" (`chat-link-preview.ts`,
 * `use-chat-link-preview-picture.ts`) and the client keeps out of its error log; any other failure still fails the
 * read and is logged.
 */
import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { expectOnly404Quiet } from '@/test/api/refusing-client';
import { chatService } from './chat.service';

const LINK = 'https://example.test/article';

describe('chatService link previews', () => {
	afterEach(() => jest.restoreAllMocks());

	it.each([
		['preview', () => chatService.linkPreview(LINK)],
		['picture', () => chatService.linkPreviewImage(LINK)]
	])('keeps the 404 of the %s out of the error log, and still logs a 500', async (_name, read) => {
		const notFound = await expectOnly404Quiet(chatService, read);

		// The status both callers read as the route missing or the pictures off
		expect(errorStatusOf(notFound)).toBe(404);
	});
});
