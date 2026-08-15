import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BlockStorageService, BuilderPlatform, Block, isBuilderIoConfig } from '../../blocks/storage';
import { normalizePageUrl, getValidBuilderUrl } from '@/utils/helpers';

interface EnsureBlockParams {
	id: string | null;
	pathname: string;
	storageService: BlockStorageService;
	tenantId: string;
	orgId: string;
	updateApiKey: (key: string) => void;
	onBlockLoaded: (block: Block, title: string, pageUrl: string) => void;
	onError: (title: string, url: string) => void;
}

const DEFAULT_BUILDER_URL = process.env.NEXT_PUBLIC_DEFAULT_BUILDER_URL || '/builder/builder-demo';

export function useEnsureBlock({
	id,
	pathname,
	storageService,
	tenantId,
	orgId,
	updateApiKey,
	onBlockLoaded,
	onError
}: EnsureBlockParams) {
	const router = useRouter();

	useEffect(() => {
		let isMounted = true;

		async function ensureBlock() {
			try {
				const normalizedPath = normalizePageUrl(pathname);
				let block: Block | undefined;

				if (id) {
					const {
						data: foundBlock,
						error,
						errorCode
					} = await storageService.getBlockById({ tenantId, orgId }, id);

					if (!isMounted) return;

					if (errorCode === 'NOT_FOUND' || errorCode === 'NO_BLOCKS') {
						// Continue to create new block
					} else if (error || errorCode) {
						throw new Error(`Failed to load block: ${error || errorCode}`);
					} else if (foundBlock && foundBlock.builderPlatform === BuilderPlatform.BuilderIO) {
						const pageUrl = isBuilderIoConfig(foundBlock.config)
							? getValidBuilderUrl(foundBlock.config.builderIoPageUrl, DEFAULT_BUILDER_URL)
							: DEFAULT_BUILDER_URL;

						if (isBuilderIoConfig(foundBlock.config) && foundBlock.config.builderApiKey) {
							updateApiKey(foundBlock.config.builderApiKey);
						}

						onBlockLoaded(foundBlock, foundBlock.title, pageUrl);
						return;
					} else if (foundBlock) {
						console.warn('Block found but not a Builder.IO platform block');
					}

					const { data: newBlock, error: createError } = await storageService.createBlock(
						{ tenantId, orgId },
						{
							title: 'Builder Block',
							builderPlatform: BuilderPlatform.BuilderIO,
							config: { builderIoPageUrl: getValidBuilderUrl(normalizedPath, DEFAULT_BUILDER_URL) }
						}
					);

					if (!isMounted) return;

					if (createError) {
						throw new Error(`Failed to create block: ${createError}`);
					}
					if (!newBlock) {
						throw new Error('Failed to create new block');
					}
					router.replace(`${pathname}?id=${newBlock.id}`);
					return;
				}

				const { data: blocks, error, errorCode } = await storageService.getBlocks({ tenantId, orgId });

				if (!isMounted) return;

				if (error || errorCode) {
					throw new Error(`Failed to load blocks: ${error ?? errorCode}`);
				}

				if (!blocks) {
					throw new Error('No blocks found');
				}

				block = blocks.find(
					(b) =>
						b.builderPlatform === BuilderPlatform.BuilderIO &&
						isBuilderIoConfig(b.config) &&
						normalizePageUrl(b.config.builderIoPageUrl) === normalizedPath
				);

				if (block) {
					router.replace(`${pathname}?id=${block.id}`);
					return;
				} else {
					const { data: newBlock, error: createError } = await storageService.createBlock(
						{ tenantId, orgId },
						{
							title: 'Builder Block',
							builderPlatform: BuilderPlatform.BuilderIO,
							config: { builderIoPageUrl: getValidBuilderUrl(normalizedPath, DEFAULT_BUILDER_URL) }
						}
					);

					if (!isMounted) return;

					if (createError) {
						throw new Error(`Failed to create block: ${createError}`);
					}
					if (!newBlock) {
						throw new Error('Failed to create new block');
					}
					router.replace(`${pathname}?id=${newBlock.id}`);
					return;
				}
			} catch (error) {
				if (!isMounted) return;

				console.error('Failed to ensure block:', error);
				onError('Block Loading Failed', getValidBuilderUrl(pathname, DEFAULT_BUILDER_URL));
			}
		}

		ensureBlock();

		return () => {
			isMounted = false;
		};
	}, [id, pathname, storageService, router, tenantId, orgId, updateApiKey, onBlockLoaded, onError]);
}
