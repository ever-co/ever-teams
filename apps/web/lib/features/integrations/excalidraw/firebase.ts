import { EXCALIDRAW_FIREBASE_CONFIG } from '@app/constants';
import { MIME_TYPES } from '@excalidraw/excalidraw';
import { FileId } from '@excalidraw/excalidraw/types/element/types';
import { FILE_CACHE_MAX_AGE_SEC } from './constants';

// Varibales
let firebasePromise: Promise<typeof import('firebase/app').default> | null =
	null;
let isFirebaseInitialized = false;
let firebaseStoragePromise: Promise<any> | null | true = null;

// Load lazily Firebase App
const _loadFirebase = async () => {
	const firebase = (
		await import(/* webpackChunkName: "firebase" */ 'firebase/app')
	).default;

	if (!isFirebaseInitialized) {
		try {
			if (!EXCALIDRAW_FIREBASE_CONFIG) {
				throw Error('Invalid Firebase configuration');
			}
			firebase.initializeApp(JSON.parse(EXCALIDRAW_FIREBASE_CONFIG));
		} catch (error: any) {
			// trying initialize again throws. Usually this is harmless, and happens
			// mainly in dev (HMR)
			if (error.code === 'app/duplicate-app') {
				console.warn(error.name, error.code);
			} else {
				throw error;
			}
		}
		isFirebaseInitialized = true;
	}

	return firebase;
};

// Instanciate Firebase app and keep in memory
const _getFirebase = async (): Promise<
	typeof import('firebase/app').default
> => {
	if (!firebasePromise) {
		firebasePromise = _loadFirebase();
	}
	return firebasePromise;
};

// Load firebase storage
const loadFirebaseStorage = async () => {
	const firebase = await _getFirebase();
	if (!firebaseStoragePromise) {
		firebaseStoragePromise = import(
			/* webpackChunkName: "storage" */ 'firebase/storage'
		);
	}
	if (firebaseStoragePromise !== true) {
		await firebaseStoragePromise;
		firebaseStoragePromise = true;
	}
	return firebase;
};

// Save files to firebase
export const saveFilesToFirebase = async ({
	prefix,
	files,
}: {
	prefix: string;
	files: { id: FileId; buffer: Uint8Array }[];
}) => {
	const firebase = await loadFirebaseStorage();

	const erroredFiles = new Map<FileId, true>();
	const savedFiles = new Map<FileId, true>();

	await Promise.all(
		files.map(async ({ id, buffer }) => {
			console.log(id);

			try {
				await firebase
					.storage()
					.ref(`${prefix}/${id}`)
					.put(
						new Blob([buffer], {
							type: MIME_TYPES.binary,
						}),
						{
							cacheControl: `public, max-age=${FILE_CACHE_MAX_AGE_SEC}`,
						}
					);
				savedFiles.set(id, true);
			} catch (error: any) {
				console.log('errr firebase storage', error);

				erroredFiles.set(id, true);
			}
		})
	);

	return { savedFiles, erroredFiles };
};
