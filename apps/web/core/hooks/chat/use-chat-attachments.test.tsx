/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

const mockUpload = jest.fn();
const mockDiscard = jest.fn<Promise<{ discarded: boolean }>, [string]>(async () => ({ discarded: true }));
const mockShrink = jest.fn(async (file: File) => file);
let mockAvailability = 'available';
let mockScope = { tenantId: 't1', organizationId: 'org-a', userId: 'u1', employeeId: 'e1' };

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => (key: string) => key
}));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), warning: jest.fn() }) }));
jest.mock('@/core/hooks/docs/use-docs-availability', () => ({ useDocsAvailability: () => mockAvailability }));
jest.mock('@/core/services/client/api/chat', () => ({
	chatService: { uploadAttachments: (files: File[]) => mockUpload(files), discardAttachment: (documentId: string) => mockDiscard(documentId) }
}));
jest.mock('@/core/lib/utils/chat-image-shrink', () => ({ shrinkImage: (file: File) => mockShrink(file) }));
jest.mock('./use-chat-scope', () => ({ useChatScope: () => mockScope }));

import { toast } from 'sonner';
import { CHAT_MESSAGE_MAX_ATTACHMENTS } from '@/core/types/interfaces/common/chat';
import { resetChatUploads, uploadedFileOf, useChatAttachments } from './use-chat-attachments';

const mockToast = toast as unknown as { error: jest.Mock; warning: jest.Mock };
const pdf = (name = 'plan.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });
const accepted = (id: string) => ({
	results: [{ document: { id, mimeType: 'application/pdf', fileSize: 4 } }],
	rejected: []
});

const sized = (file: File, bytes: number) => {
	Object.defineProperty(file, 'size', { value: bytes });
	return file;
};
const MB = 1024 * 1024;

beforeEach(() => {
	mockUpload.mockReset();
	mockDiscard.mockReset();
	mockDiscard.mockResolvedValue({ discarded: true });
	mockShrink.mockReset();
	mockShrink.mockImplementation(async (file: File) => file);
	mockAvailability = 'available';
	mockScope = { tenantId: 't1', organizationId: 'org-a', userId: 'u1', employeeId: 'e1' };
	resetChatUploads();
});

describe('useChatAttachments', () => {
	it('uploads a file as soon as it is added, then holds its document for the send', async () => {
		mockUpload.mockResolvedValue(accepted('doc-1'));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf()]));
		expect(result.current.items[0]).toEqual(expect.objectContaining({ name: 'plan.pdf', status: 'uploading' }));
		expect(result.current.isUploading).toBe(true);
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-1']));
		expect(result.current.isUploading).toBe(false);
		expect(uploadedFileOf('doc-1')).toEqual(expect.objectContaining({ name: 'plan.pdf' }));
		act(() => result.current.releaseSent());
		expect(result.current.items).toEqual([]);
	});

	it('marks a refused file failed, and uploads it again on retry', async () => {
		mockUpload
			.mockResolvedValueOnce({
				results: [],
				rejected: [{ fileName: 'plan.pdf', code: 'DOCS_TYPE', message: 'Not allowed' }]
			})
			.mockResolvedValueOnce(accepted('doc-2'));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf()]));
		await waitFor(() => expect(result.current.items[0]?.status).toBe('failed'));
		expect(mockToast.warning).toHaveBeenCalledWith('entityFiles.REJECTED', { description: 'Not allowed' });
		act(() => result.current.retry(result.current.items[0].key));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-2']));
	});

	it('takes no more files than a message carries', async () => {
		mockUpload.mockImplementation(async () => accepted(`doc-${Math.random()}`));
		const { result } = renderHook(() => useChatAttachments());
		const many = Array.from({ length: CHAT_MESSAGE_MAX_ATTACHMENTS + 2 }, (_, index) => pdf(`f${index}.pdf`));
		act(() => result.current.add(many));
		expect(result.current.items).toHaveLength(CHAT_MESSAGE_MAX_ATTACHMENTS);
		expect(mockToast.warning).toHaveBeenCalledWith('teamChat.ATTACH_TOO_MANY');
		await waitFor(() => expect(result.current.isUploading).toBe(false));
	});

	it('refuses a file over the size the platform takes, without uploading it', () => {
		const { result } = renderHook(() => useChatAttachments());
		const huge = pdf('huge.pdf');
		Object.defineProperty(huge, 'size', { value: 60 * 1024 * 1024 });
		act(() => result.current.add([huge]));
		expect(result.current.items).toEqual([]);
		expect(mockUpload).not.toHaveBeenCalled();
		expect(mockToast.warning).toHaveBeenCalledWith('entityFiles.TOO_LARGE', expect.anything());
	});

	it('takes a file out', async () => {
		mockUpload.mockResolvedValue(accepted('doc-3'));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf()]));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-3']));
		act(() => result.current.remove(result.current.items[0].key));
		expect(result.current.items).toEqual([]);
		expect(result.current.readyIds).toEqual([]);
	});

	it('stops offering to attach once the role is refused, and where the platform has no documents', async () => {
		mockUpload.mockRejectedValue(Object.assign(new Error('Forbidden'), { status: 403 }));
		const { result } = renderHook(() => useChatAttachments());
		expect(result.current.canAttach).toBe(true);
		act(() => result.current.add([pdf()]));
		await waitFor(() => expect(result.current.canAttach).toBe(false));
		expect(mockToast.error).toHaveBeenCalledWith('teamChat.ATTACH_FORBIDDEN');

		// Another organization of the same person still offers it.
		mockScope = { ...mockScope, organizationId: 'org-b' };
		const elsewhere = renderHook(() => useChatAttachments());
		expect(elsewhere.result.current.canAttach).toBe(true);

		mockAvailability = 'unavailable';
		const other = renderHook(() => useChatAttachments());
		expect(other.result.current.canAttach).toBe(false);
	});
});

describe('useChatAttachments, files that stay and photos shrunk first', () => {
	it('lets go of the sent files after the send, and keeps a failed one with its retry', async () => {
		mockUpload.mockResolvedValueOnce(accepted('doc-ok')).mockRejectedValueOnce(new Error('network'));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf('ok.pdf'), pdf('broken.pdf')]));
		await waitFor(() => expect(result.current.isUploading).toBe(false));
		expect(result.current.readyIds).toEqual(['doc-ok']);
		act(() => result.current.releaseSent());
		expect(result.current.items.map((item) => [item.name, item.status])).toEqual([['broken.pdf', 'failed']]);
		mockUpload.mockResolvedValueOnce(accepted('doc-again'));
		act(() => result.current.retry(result.current.items[0].key));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-again']));
	});

	it('takes a photo over the cap when it is small enough once shrunk', async () => {
		mockShrink.mockImplementation(async (file: File) =>
			sized(new File(['x'], file.name, { type: file.type }), 3 * MB)
		);
		mockUpload.mockResolvedValue(accepted('doc-photo'));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([sized(new File(['x'], 'big.jpg', { type: 'image/jpeg' }), 60 * MB)]));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-photo']));
		expect(mockUpload.mock.calls[0][0][0].size).toBe(3 * MB);
		expect(mockToast.warning).not.toHaveBeenCalled();
	});

	it('refuses a photo still over the cap once shrunk, and one too large to shrink at all', async () => {
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([sized(new File(['x'], 'huge.jpg', { type: 'image/jpeg' }), 60 * MB)]));
		await waitFor(() => expect(result.current.items).toEqual([]));
		expect(mockUpload).not.toHaveBeenCalled();
		expect(mockToast.warning).toHaveBeenCalledWith('entityFiles.TOO_LARGE', expect.anything());

		mockToast.warning.mockClear();
		act(() => result.current.add([sized(new File(['x'], 'raw.png', { type: 'image/png' }), 200 * MB)]));
		expect(result.current.items).toEqual([]);
		expect(mockShrink).toHaveBeenCalledTimes(1);
		expect(mockToast.warning).toHaveBeenCalledWith('entityFiles.TOO_LARGE', expect.anything());
	});
});

describe('useChatAttachments, files uploaded and not sent', () => {
	it('discards an uploaded file taken out of the message', async () => {
		mockUpload.mockResolvedValue(accepted('doc-1'));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf()]));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-1']));
		act(() => result.current.remove(result.current.items[0].key));
		expect(mockDiscard).toHaveBeenCalledWith('doc-1');
		expect(uploadedFileOf('doc-1')).toBeUndefined();
	});

	it('discards what was uploaded and not sent when the place closes, never what a send took', async () => {
		mockUpload.mockResolvedValueOnce(accepted('doc-sent')).mockResolvedValueOnce(accepted('doc-left'));
		const { result, unmount } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf('sent.pdf')]));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-sent']));
		act(() => result.current.releaseSent());
		act(() => result.current.add([pdf('left.pdf')]));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-left']));
		unmount();
		expect(mockDiscard).toHaveBeenCalledTimes(1);
		expect(mockDiscard).toHaveBeenCalledWith('doc-left');
	});

	it('discards a file whose upload ends after it was taken out', async () => {
		let finish: (value: unknown) => void = () => undefined;
		mockUpload.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf()]));
		await waitFor(() => expect(mockUpload).toHaveBeenCalled());
		act(() => result.current.remove(result.current.items[0].key));
		expect(mockDiscard).not.toHaveBeenCalled();
		await act(async () => finish(accepted('doc-late')));
		expect(mockDiscard).toHaveBeenCalledWith('doc-late');
		expect(uploadedFileOf('doc-late')).toBeUndefined();
		expect(result.current.items).toEqual([]);
	});

	it('changes nothing when the platform refuses the discard (an older one has no route)', async () => {
		mockUpload.mockResolvedValue(accepted('doc-old'));
		mockDiscard.mockRejectedValue(Object.assign(new Error('Cannot DELETE /api/chat/attachments/doc-old'), { statusCode: 404 }));
		const { result } = renderHook(() => useChatAttachments());
		act(() => result.current.add([pdf()]));
		await waitFor(() => expect(result.current.readyIds).toEqual(['doc-old']));
		act(() => result.current.remove(result.current.items[0].key));
		await act(async () => undefined);
		expect(result.current.items).toEqual([]);
	});
});
