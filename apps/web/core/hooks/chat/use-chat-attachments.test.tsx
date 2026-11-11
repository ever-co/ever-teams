/**
 * @jest-environment jsdom
 */
import { act, renderHook, waitFor } from '@testing-library/react';

const mockUpload = jest.fn();
let mockAvailability = 'available';

jest.mock('next-intl', () => ({
	useLocale: () => 'en-US',
	useTranslations: () => (key: string) => key
}));
jest.mock('sonner', () => ({ toast: Object.assign(jest.fn(), { error: jest.fn(), warning: jest.fn() }) }));
jest.mock('@/core/hooks/docs/use-docs-availability', () => ({ useDocsAvailability: () => mockAvailability }));
jest.mock('@/core/services/client/api/chat', () => ({
	chatService: { uploadAttachments: (files: File[]) => mockUpload(files) }
}));
jest.mock('@/core/lib/utils/chat-image-shrink', () => ({ shrinkImage: async (file: File) => file }));

import { toast } from 'sonner';
import { CHAT_MESSAGE_MAX_ATTACHMENTS } from '@/core/types/interfaces/common/chat';
import { resetChatUploads, uploadedFileOf, useChatAttachments } from './use-chat-attachments';

const mockToast = toast as unknown as { error: jest.Mock; warning: jest.Mock };
const pdf = (name = 'plan.pdf') => new File(['%PDF'], name, { type: 'application/pdf' });
const accepted = (id: string) => ({
	results: [{ document: { id, mimeType: 'application/pdf', fileSize: 4 } }],
	rejected: []
});

beforeEach(() => {
	mockUpload.mockReset();
	mockAvailability = 'available';
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
		act(() => result.current.clear());
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

		resetChatUploads();
		mockAvailability = 'unavailable';
		const other = renderHook(() => useChatAttachments());
		expect(other.result.current.canAttach).toBe(false);
	});
});
