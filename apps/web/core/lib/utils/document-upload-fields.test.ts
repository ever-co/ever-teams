import { passedUploadFieldsOf } from './document-upload-fields';

function form(fields: Record<string, string | Blob>): FormData {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) data.append(name, value);
	return data;
}

describe('passedUploadFieldsOf', () => {
	it('passes the chat upload fields on', () => {
		const incoming = form({
			source: 'CHAT',
			visibility: 'PRIVATE',
			importToKnowledge: 'false',
			classifyWithAi: 'false'
		});
		expect(passedUploadFieldsOf(incoming)).toEqual([
			['source', 'CHAT'],
			['visibility', 'PRIVATE'],
			['importToKnowledge', 'false'],
			['classifyWithAi', 'false']
		]);
	});

	it('drops a value the field may not take, and any other field', () => {
		const incoming = form({
			source: 'SYSTEM',
			visibility: 'TEAM',
			importToKnowledge: 'yes',
			tenantId: 'other-tenant',
			parentId: 'x'
		});
		expect(passedUploadFieldsOf(incoming)).toEqual([]);
	});

	it('ignores a file sent under a field name, and a missing form', () => {
		expect(passedUploadFieldsOf(form({ source: new Blob(['CHAT']) }))).toEqual([]);
		expect(passedUploadFieldsOf(null)).toEqual([]);
	});
});
