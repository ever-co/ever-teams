import { deflateRaw } from 'pako';
import { timeImportTableOf } from './time-import-sheet';
import {
	csvTextOf,
	readWorkspaceFiles,
	tableOfRecords,
	workspaceFileKindOf,
	type WorkspacePickedFile
} from './workspace-import-files';

const encoder = new TextEncoder();

function fileOf(name: string, content: string | Uint8Array): WorkspacePickedFile {
	let bytes: Uint8Array;
	if (typeof content === 'string') {
		bytes = encoder.encode(content);
	} else {
		bytes = content;
	}
	return {
		name,
		size: bytes.byteLength,
		arrayBuffer: async () => bytes.slice().buffer
	};
}

/** One deflated entry, enough for the archive path of the reader. */
function zipWith(entryName: string, text: string): Uint8Array {
	const name = encoder.encode(entryName);
	const content = encoder.encode(text);
	const packed = deflateRaw(content);
	const local = new DataView(new ArrayBuffer(30));
	local.setUint32(0, 0x04034b50, true);
	local.setUint16(8, 8, true);
	local.setUint32(18, packed.byteLength, true);
	local.setUint32(22, content.byteLength, true);
	local.setUint16(26, name.byteLength, true);
	const central = new DataView(new ArrayBuffer(46));
	central.setUint32(0, 0x02014b50, true);
	central.setUint16(10, 8, true);
	central.setUint32(20, packed.byteLength, true);
	central.setUint32(24, content.byteLength, true);
	central.setUint16(28, name.byteLength, true);
	const directoryOffset = 30 + name.byteLength + packed.byteLength;
	const end = new DataView(new ArrayBuffer(22));
	end.setUint32(0, 0x06054b50, true);
	end.setUint16(8, 1, true);
	end.setUint16(10, 1, true);
	end.setUint32(12, 46 + name.byteLength, true);
	end.setUint32(16, directoryOffset, true);
	const parts = [new Uint8Array(local.buffer), name, packed, new Uint8Array(central.buffer), name];
	const out = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0) + 22);
	let position = 0;
	for (const part of parts) {
		out.set(part, position);
		position += part.byteLength;
	}
	out.set(new Uint8Array(end.buffer), position);
	return out;
}

describe('workspaceFileKindOf', () => {
	it('tells a file by the words of its name', () => {
		expect(workspaceFileKindOf('Clients.csv', ['Name'])).toBe('clients');
		expect(workspaceFileKindOf('export/projects.csv', ['Name', 'Client'])).toBe('projects');
		expect(workspaceFileKindOf('Tags_2026.csv', ['Name'])).toBe('tags');
		expect(workspaceFileKindOf('Time_Entries.csv', ['Project', 'Start Date', 'Start Time'])).toBe('entries');
	});

	it('falls back on the columns: times make entries, a client next to a name makes projects', () => {
		expect(workspaceFileKindOf('export.csv', ['Email', 'Start Date', 'Duration (h)'])).toBe('entries');
		expect(workspaceFileKindOf('list.csv', ['Name', 'Client', 'Color'])).toBe('projects');
		expect(workspaceFileKindOf('notes.csv', ['Text'])).toBeNull();
	});

	it('keeps a list named as such even when it has a date column', () => {
		expect(workspaceFileKindOf('projects.csv', ['Name', 'Start Date'])).toBe('projects');
	});
});

describe('tableOfRecords', () => {
	it('flattens nested records, keeps names of linked records and joins lists', () => {
		const table = tableOfRecords([
			{
				description: 'Kick-off',
				project: { name: 'Website' },
				tags: [{ name: 'Design' }, 'Meeting'],
				timeInterval: { start: '2026-10-01T09:00:00Z', end: '2026-10-01T10:00:00Z' }
			},
			{ description: 'Call', billable: true }
		]);

		expect(table.headers).toEqual([
			'description',
			'project',
			'tags',
			'timeInterval start',
			'timeInterval end',
			'billable'
		]);
		expect(table.records[0].cells).toEqual([
			'Kick-off',
			'Website',
			'Design, Meeting',
			'2026-10-01T09:00:00Z',
			'2026-10-01T10:00:00Z',
			''
		]);
		expect(table.records[1]).toEqual({ row: 3, cells: ['Call', '', '', '', '', 'true'] });
	});
});

describe('csvTextOf', () => {
	it('writes a table that reads back the same, quotes and commas included', () => {
		const table = {
			headers: ['Project', 'Notes'],
			records: [{ row: 2, cells: ['Acme, Inc.', 'Said "hi"\non two lines'] }]
		};

		const reread = timeImportTableOf(csvTextOf(table)).table;

		expect(reread?.headers).toEqual(['Project', 'Notes']);
		expect(reread?.records[0].cells).toEqual(['Acme, Inc.', 'Said "hi"\non two lines']);
	});
});

describe('readWorkspaceFiles', () => {
	it('reads CSV, JSON and archived files, and appends entries files with the same columns', async () => {
		const files = await readWorkspaceFiles([
			fileOf('clients.json', JSON.stringify([{ name: 'Acme' }, { name: 'Globex' }])),
			fileOf('time-entries-october.csv', 'Email,Start Date,Duration\na@x.io,2026-10-01,1\n'),
			fileOf('export.zip', zipWith('time-entries-november.csv', 'Email,Start Date,Duration\nb@x.io,2026-11-02,2\n'))
		]);

		expect(files.problems).toEqual([]);
		expect(files.clients?.table.records.map((record) => record.cells)).toEqual([['Acme'], ['Globex']]);
		expect(files.entries?.fileName).toBe('time-entries-october.csv');
		expect(files.entries?.table.records).toEqual([
			{ row: 2, cells: ['a@x.io', '2026-10-01', '1'] },
			{ row: 3, cells: ['b@x.io', '2026-11-02', '2'] }
		]);
		expect(files.read.map((table) => table.fileName)).toEqual([
			'clients.json',
			'time-entries-october.csv',
			'export.zip / time-entries-november.csv'
		]);
	});

	it('reads the lists a JSON object names', async () => {
		const files = await readWorkspaceFiles([
			fileOf(
				'workspace.json',
				JSON.stringify({ clients: [{ name: 'Acme' }], projects: [{ name: 'Website', client: 'Acme' }] })
			)
		]);

		expect(files.clients?.fileName).toBe('workspace.json / clients');
		expect(files.projects?.table.headers).toEqual(['name', 'client']);
	});

	it('lists every file it cannot use, with the reason', async () => {
		const files = await readWorkspaceFiles([
			fileOf('photo.png', 'x'),
			fileOf('broken.json', '{ nope'),
			fileOf('quote.csv', 'name\n"never closed\n'),
			fileOf('latin1.csv', new Uint8Array([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0xe9])),
			fileOf('archive.zip', 'not an archive'),
			fileOf('notes.csv', 'Text\nhello\n'),
			fileOf('time.csv', 'Email,Start Date\na@x.io,2026-10-01\n'),
			fileOf('time-other.csv', 'Member,Start Date,Duration\na@x.io,2026-10-01,1\n')
		]);

		expect(files.problems.map((problem) => [problem.code, problem.fileName])).toEqual([
			['notSupported', 'photo.png'],
			['notText', 'latin1.csv'],
			['zip', 'archive.zip'],
			['json', 'broken.json'],
			['csv', 'quote.csv'],
			['unknownContent', 'notes.csv'],
			['entriesColumnsDiffer', 'time-other.csv']
		]);
	});

	it('reads the first file of a list and says the next one of the same kind is not used', async () => {
		const files = await readWorkspaceFiles([
			fileOf('clients.csv', 'Name\nAcme\n'),
			fileOf('clients (1).csv', 'Name\nGlobex\n')
		]);

		expect(files.clients?.table.records).toHaveLength(1);
		expect(files.problems).toEqual([{ code: 'repeatedKind', fileName: 'clients (1).csv', kind: 'clients' }]);
	});
});
