import { BOARD_FIREBASE_CONFIG, FILE_CACHE_MAX_AGE_SEC } from '@/core/constants/config/constants';
import { MIME_TYPES } from '@excalidraw/excalidraw';
import { FileId } from '@excalidraw/excalidraw/dist/types/excalidraw/element/types';

// Variables
let firebasePromise: Promise<any> | null = null;
let isFirebaseInitialized = false;
let firebaseStoragePromise: Promise<any> | null | true = null;

// -------------------------------------------
// Lazy-load Firebase App (compat version)
// -------------------------------------------
const _loadFirebase = async () => {
	const firebase: any = (await import('firebase/compat/app')).default;

	if (!isFirebaseInitialized) {
		try {
			if (!BOARD_FIREBASE_CONFIG.value) {
				throw new Error('Invalid Firebase configuration');
			}

			firebase.initializeApp(JSON.parse(BOARD_FIREBASE_CONFIG.value));
		} catch (error: any) {
			if (error.code === 'app/duplicate-app') {
				console.warn('[Firebase] duplicate-app:', error.code);
			} else {
				throw error;
			}
		}

		isFirebaseInitialized = true;
	}

	return firebase;
};

// -------------------------------------------
// Ensure Firebase instance is kept in memory
// -------------------------------------------
const _getFirebase = async (): Promise<any> => {
	if (!firebasePromise) {
		firebasePromise = _loadFirebase();
	}
	return firebasePromise;
};

// -------------------------------------------
// Lazy-load Firebase Storage (compat)
// -------------------------------------------
const loadFirebaseStorage = async () => {
	const firebase: any = await _getFirebase();

	if (!firebaseStoragePromise) {
		firebaseStoragePromise = import('firebase/compat/storage');
	}

	if (firebaseStoragePromise !== true) {
		await firebaseStoragePromise;
		firebaseStoragePromise = true;
	}

	return firebase;
};

// -------------------------------------------
// Upload files to Firebase Storage
// -------------------------------------------
export const saveFilesToFirebase = async ({
	prefix,
	files
}: {
	prefix: string;
	files: { id: FileId; buffer: Uint8Array }[];
}) => {
	const firebase: any = await loadFirebaseStorage();

	const erroredFiles = new Map<FileId, true>();
	const savedFiles = new Map<FileId, true>();

	await Promise.all(
		files.map(async ({ id, buffer }) => {
			try {
				const arrayBuffer = new Uint8Array(buffer).buffer;

				await firebase
					.storage()
					.ref(`${prefix}/${id}`)
					.put(new Blob([arrayBuffer], { type: MIME_TYPES.binary }), {
						cacheControl: `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`
					});

				savedFiles.set(id, true);
			} catch (error: any) {
				console.error('[Firebase Storage] Upload error:', error);
				erroredFiles.set(id, true);
			}
		})
	);

	return { savedFiles, erroredFiles };
};
