import { deflate } from 'pako';
import { encryptData } from './encryption';

// -----------------------------------------------------------------------------
// byte (binary) strings
// -----------------------------------------------------------------------------

// fast, Buffer-compatible implem
export const toByteString = (
	data: string | Uint8Array | ArrayBuffer
): Promise<string> => {
	return new Promise((resolve, reject) => {
		const blob =
			typeof data === 'string'
				? new Blob([new TextEncoder().encode(data)])
				: new Blob([data instanceof Uint8Array ? data : new Uint8Array(data)]);
		const reader = new FileReader();
		reader.onload = (event) => {
			if (!event.target || typeof event.target.result !== 'string') {
				return reject(new Error("couldn't convert to byte string"));
			}
			resolve(event.target.result);
		};
		reader.readAsBinaryString(blob);
	});
};

// -----------------------------------------------------------------------------
// binary encoding
// -----------------------------------------------------------------------------

type FileEncodingInfo = {
	/* version 2 is the version we're shipping the initial image support with.
    version 1 was a PR version that a lot of people were using anyway.
    Thus, if there are issues we can check whether they're not using the
    unoffic version */
	version: 1 | 2;
	compression: 'pako@1' | null;
	encryption: 'AES-GCM' | null;
};

// -----------------------------------------------------------------------------
const CONCAT_BUFFERS_VERSION = 1;
/** how many bytes we use to encode how many bytes the next chunk has.
 * Corresponds to DataView setter methods (setUint32, setUint16, etc).
 *
 * NOTE ! values must not be changed, which would be backwards incompatible !
 */
const VERSION_DATAVIEW_BYTES = 4;
const NEXT_CHUNK_SIZE_DATAVIEW_BYTES = 4;
// -----------------------------------------------------------------------------

const DATA_VIEW_BITS_MAP = { 1: 8, 2: 16, 4: 32 } as const;

// getter
function dataView(buffer: Uint8Array, bytes: 1 | 2 | 4, offset: number): number;
// setter
function dataView(
	buffer: Uint8Array,
	bytes: 1 | 2 | 4,
	offset: number,
	value: number
): Uint8Array;
/**
 * abstraction over DataView that serves as a typed getter/setter in case
 * you're using constants for the byte size and want to ensure there's no
 * discrepenancy in the encoding across refactors.
 *
 * DataView serves for an endian-agnostic handling of numbers in ArrayBuffers.
 */
function dataView(
	buffer: Uint8Array,
	bytes: 1 | 2 | 4,
	offset: number,
	value?: number
): Uint8Array | number {
	if (value != null) {
		if (value > Math.pow(2, DATA_VIEW_BITS_MAP[bytes]) - 1) {
			throw new Error(
				`attempting to set value higher than the allocated bytes (value: ${value}, bytes: ${bytes})`
			);
		}
		const method = `setUint${DATA_VIEW_BITS_MAP[bytes]}` as const;
		new DataView(buffer.buffer)[method](offset, value);
		return buffer;
	}
	const method = `getUint${DATA_VIEW_BITS_MAP[bytes]}` as const;
	return new DataView(buffer.buffer)[method](offset);
}

// -----------------------------------------------------------------------------

/**
 * Resulting concatenated buffer has this format:
 *
 * [
 *   VERSION chunk (4 bytes)
 *   LENGTH chunk 1 (4 bytes)
 *   DATA chunk 1 (up to 2^32 bits)
 *   LENGTH chunk 2 (4 bytes)
 *   DATA chunk 2 (up to 2^32 bits)
 *   ...
 * ]
 *
 * @param buffers each buffer (chunk) must be at most 2^32 bits large (~4GB)
 */
const concatBuffers = (...buffers: Uint8Array[]) => {
	const bufferView = new Uint8Array(
		VERSION_DATAVIEW_BYTES +
			NEXT_CHUNK_SIZE_DATAVIEW_BYTES * buffers.length +
			buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0)
	);

	let cursor = 0;

	// as the first chunk we'll encode the version for backwards compatibility
	dataView(bufferView, VERSION_DATAVIEW_BYTES, cursor, CONCAT_BUFFERS_VERSION);
	cursor += VERSION_DATAVIEW_BYTES;

	for (const buffer of buffers) {
		dataView(
			bufferView,
			NEXT_CHUNK_SIZE_DATAVIEW_BYTES,
			cursor,
			buffer.byteLength
		);
		cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;

		bufferView.set(buffer, cursor);
		cursor += buffer.byteLength;
	}

	return bufferView;
};

// helpers for (de)compressing data with JSON metadata including encryption
// -----------------------------------------------------------------------------

/** @private */
const _encryptAndCompress = async (
	data: Uint8Array | string,
	encryptionKey: string
) => {
	const { encryptedBuffer, iv } = await encryptData(
		encryptionKey,
		deflate(data)
	);

	return { iv, buffer: new Uint8Array(encryptedBuffer) };
};

/**
 * The returned buffer has following format:
 * `[]` refers to a buffers wrapper (see `concatBuffers`)
 *
 * [
 *   encodingMetadataBuffer,
 *   iv,
 *   [
 *      contentsMetadataBuffer
 *      contentsBuffer
 *   ]
 * ]
 */
export const compressData = async <T extends Record<string, any> = never>(
	dataBuffer: Uint8Array,
	options: {
		encryptionKey: string;
	} & ([T] extends [never]
		? {
				metadata?: T;
		  }
		: {
				metadata: T;
		  })
): Promise<Uint8Array> => {
	const fileInfo: FileEncodingInfo = {
		version: 2,
		compression: 'pako@1',
		encryption: 'AES-GCM',
	};

	const encodingMetadataBuffer = new TextEncoder().encode(
		JSON.stringify(fileInfo)
	);

	const contentsMetadataBuffer = new TextEncoder().encode(
		JSON.stringify(options.metadata || null)
	);

	const { iv, buffer } = await _encryptAndCompress(
		concatBuffers(contentsMetadataBuffer, dataBuffer),
		options.encryptionKey
	);

	return concatBuffers(encodingMetadataBuffer, iv, buffer);
};
