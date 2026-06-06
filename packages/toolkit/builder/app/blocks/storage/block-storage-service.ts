import { Block, StorageParams, StorageResponse, BuilderPlatform } from './types';
import { merge } from 'lodash';

export type { Block } from './types';
export { BuilderPlatform } from './types';

/**
 * Custom error class for storage-related errors
 */
export class StorageError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StorageError';
	}
}

/**
 * Service class for managing blocks in storage
 * Currently uses localStorage but can be extended to use API endpoints
 */
export class BlockStorageService {
	private readonly STORAGE_KEY_PREFIX = 'teams_blocks_';

	/**
	 * Generates a storage key for a specific tenant and organization
	 */
	private getStorageKey(tenantId: string, orgId: string): string {
		return `${this.STORAGE_KEY_PREFIX}${tenantId}_${orgId}`;
	}

	/**
	 * Validates storage parameters
	 */
	private validateParams(params: StorageParams): void {
		if (
			!params.tenantId ||
			!params.orgId ||
			typeof params.tenantId !== 'string' ||
			typeof params.orgId !== 'string' ||
			params.tenantId.trim() === '' ||
			params.orgId.trim() === ''
		) {
			throw new StorageError('Tenant ID and Organization ID are required and cannot be empty or whitespace');
		}
	}

	/**
	 * Retrieves all blocks for a specific tenant and organization
	 */
	async getBlocks(params: StorageParams): Promise<StorageResponse<Block[]>> {
		try {
			this.validateParams(params);
			const storageKey = this.getStorageKey(params.tenantId, params.orgId);
			if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
				throw new StorageError('localStorage is not available');
			}
			const storedData = window.localStorage.getItem(storageKey);

			if (!storedData) {
				return { data: [] };
			}

			let blocksData: Block[] | Record<string, Block>;
			try {
				blocksData = JSON.parse(storedData);
			} catch (parseError) {
				return {
					data: [],
					error: 'Stored data is corrupted or invalid',
					errorCode: 'INVALID_DATA'
				};
			}

			let blocksById: Record<string, Block>;
			if (Array.isArray(blocksData)) {
				blocksById = {};
				for (const block of blocksData) {
					blocksById[block.id] = block;
				}

				this.saveBlocksById(params, blocksById);
			} else {
				blocksById = blocksData;
			}

			const blocks = Object.values(blocksById).map((block) => ({
				...block,
				createdAt: new Date(block.createdAt),
				updatedAt: new Date(block.updatedAt)
			}));

			return { data: blocks };
		} catch (error) {
			return {
				data: [],
				error: error instanceof Error ? error.message : 'Failed to retrieve blocks',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}

	/**
	 * Retrieves a specific block by ID for a tenant and organization
	 */
	async getBlockById(params: StorageParams, blockId: string): Promise<StorageResponse<Block>> {
		try {
			this.validateParams(params);

			if (!blockId || typeof blockId !== 'string' || blockId.trim() === '') {
				return {
					data: null,
					error: 'Block ID is required and cannot be empty',
					errorCode: 'VALIDATION_ERROR'
				};
			}

			const storageKey = this.getStorageKey(params.tenantId, params.orgId);
			if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
				return {
					data: null,
					error: 'localStorage is not available',
					errorCode: 'STORAGE_UNAVAILABLE'
				};
			}
			const storedData = window.localStorage.getItem(storageKey);

			if (!storedData) {
				return {
					data: null,
					error: 'No blocks exist yet',
					errorCode: 'NO_BLOCKS'
				};
			}

			let blocksData: Block[] | Record<string, Block>;
			try {
				blocksData = JSON.parse(storedData);
			} catch (parseError) {
				return {
					data: null,
					error: 'Stored data is corrupted or invalid',
					errorCode: 'INVALID_DATA'
				};
			}

			let foundBlock: Block | undefined;
			if (Array.isArray(blocksData)) {
				const blocksById: Record<string, Block> = {};
				for (const block of blocksData) {
					blocksById[block.id] = block;
				}
				foundBlock = blocksById[blockId];

				this.saveBlocksById(params, blocksById);
			} else {
				foundBlock = blocksData[blockId];
			}

			if (!foundBlock) {
				return {
					data: null,
					error: `Block with ID ${blockId} not found`,
					errorCode: 'NOT_FOUND'
				};
			}

			const block = {
				...foundBlock,
				createdAt: new Date(foundBlock.createdAt),
				updatedAt: new Date(foundBlock.updatedAt)
			};

			return { data: block };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to retrieve block',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}

	/**
	 * Saves blocks indexed by ID for O(1) lookups
	 */
	private saveBlocksById(params: StorageParams, blocksById: Record<string, Block>): StorageResponse<void> {
		try {
			this.validateParams(params);

			if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
				return {
					data: undefined,
					error: 'localStorage is not available',
					errorCode: 'STORAGE_UNAVAILABLE'
				};
			}

			const storageKey = this.getStorageKey(params.tenantId, params.orgId);
			localStorage.setItem(storageKey, JSON.stringify(blocksById));
			return { data: undefined };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				return {
					data: undefined,
					error: error.message,
					errorCode: 'QUOTA_EXCEEDED'
				};
			}
			return {
				data: undefined,
				error: error instanceof Error ? error.message : 'Failed to save blocks',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}

	/**
	 * Saves all blocks for a specific tenant and organization
	 */
	async saveBlocks(params: StorageParams, blocks: Block[]): Promise<StorageResponse<void>> {
		try {
			this.validateParams(params);

			const blocksById: Record<string, Block> = {};
			for (const block of blocks) {
				blocksById[block.id] = block;
			}
			return this.saveBlocksById(params, blocksById);
		} catch (error) {
			return {
				data: undefined,
				error: error instanceof Error ? error.message : 'Failed to save blocks',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}

	/**
	 * Creates a new block
	 */
	async createBlock(
		params: StorageParams,
		blockData: Omit<Block, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<StorageResponse<Block>> {
		try {
			this.validateParams(params);
			const { data: existingBlocks, error: getErr, errorCode: getCode } = await this.getBlocks(params);
			if (getErr) {
				return { data: null, error: getErr, errorCode: getCode };
			}

			const newBlock: Block = {
				...blockData,
				id: crypto.randomUUID(),
				createdAt: new Date(),
				updatedAt: new Date()
			};

			const blocksById: Record<string, Block> = {};
			if (existingBlocks) {
				for (const block of existingBlocks) {
					blocksById[block.id] = block;
				}
			}
			blocksById[newBlock.id] = newBlock;

			const saveResult = this.saveBlocksById(params, blocksById);
			if (saveResult.error) {
				return {
					data: null,
					error: saveResult.error,
					errorCode: saveResult.errorCode
				};
			}

			return { data: newBlock };
		} catch (error) {
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to create block',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}

	/**
	 * Updates an existing block
	 */
	async updateBlock(
		params: StorageParams,
		blockId: string,
		updatedData: Partial<Block>
	): Promise<StorageResponse<Block>> {
		try {
			this.validateParams(params);

			// Atomic read-merge-write operation to prevent race conditions
			const storageKey = this.getStorageKey(params.tenantId, params.orgId);
			const raw = localStorage.getItem(storageKey) ?? '{}';
			let blocksById: Record<string, Block>;

			try {
				blocksById = JSON.parse(raw);
			} catch {
				return {
					data: null,
					error: 'Stored data is corrupted or invalid',
					errorCode: 'INVALID_DATA'
				};
			}

			const currentBlock = blocksById[blockId];
			if (!currentBlock) {
				return {
					data: null,
					error: `Block with ID ${blockId} not found`,
					errorCode: 'NOT_FOUND'
				};
			}

			// Deep merge configs if provided
			let mergedUpdatedData = { ...updatedData };
			if (updatedData.config) {
				mergedUpdatedData = {
					...updatedData,
					config: merge({}, currentBlock.config, updatedData.config)
				};
			}

			const updatedBlock: Block = {
				...currentBlock,
				...mergedUpdatedData,
				id: blockId, // Ensure ID cannot be changed
				updatedAt: new Date()
			};

			// Write back atomically
			blocksById[blockId] = updatedBlock;
			try {
				localStorage.setItem(storageKey, JSON.stringify(blocksById));
			} catch (error) {
				if (error instanceof DOMException && error.name === 'QuotaExceededError') {
					return {
						data: null,
						error: error.message,
						errorCode: 'QUOTA_EXCEEDED'
					};
				}
				return {
					data: null,
					error: error instanceof Error ? error.message : 'Failed to save updated blocks',
					errorCode: 'UNKNOWN_ERROR'
				};
			}

			return { data: updatedBlock };
		} catch (error) {
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				return {
					data: null,
					error: error.message,
					errorCode: 'QUOTA_EXCEEDED'
				};
			}
			return {
				data: null,
				error: error instanceof Error ? error.message : 'Failed to update block',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}

	/**
	 * Deletes a block
	 */
	async deleteBlock(params: StorageParams, blockId: string): Promise<StorageResponse<void>> {
		try {
			this.validateParams(params);

			if (!blockId || typeof blockId !== 'string' || blockId.trim() === '') {
				return {
					data: undefined,
					error: 'Block ID is required and cannot be empty',
					errorCode: 'VALIDATION_ERROR'
				};
			}

			if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
				return {
					data: undefined,
					error: 'localStorage is not available',
					errorCode: 'STORAGE_UNAVAILABLE'
				};
			}

			// Direct O(1) deletion using indexed storage
			const storageKey = this.getStorageKey(params.tenantId, params.orgId);
			const raw = localStorage.getItem(storageKey) ?? '{}';
			let blocksById: Record<string, Block>;

			try {
				blocksById = JSON.parse(raw);
			} catch {
				return {
					data: undefined,
					error: 'Stored data is corrupted or invalid',
					errorCode: 'INVALID_DATA'
				};
			}

			if (!blocksById[blockId]) {
				return {
					data: undefined,
					error: `Block with ID ${blockId} not found`,
					errorCode: 'NOT_FOUND'
				};
			}

			// Delete the block and save back
			delete blocksById[blockId];

			try {
				localStorage.setItem(storageKey, JSON.stringify(blocksById));
			} catch (error) {
				if (error instanceof DOMException && error.name === 'QuotaExceededError') {
					return {
						data: undefined,
						error: error.message,
						errorCode: 'QUOTA_EXCEEDED'
					};
				}
				return {
					data: undefined,
					error: error instanceof Error ? error.message : 'Failed to save updated blocks',
					errorCode: 'UNKNOWN_ERROR'
				};
			}

			return { data: undefined };
		} catch (error) {
			return {
				data: undefined,
				error: error instanceof Error ? error.message : 'Failed to delete block',
				errorCode: 'UNKNOWN_ERROR'
			};
		}
	}
}
