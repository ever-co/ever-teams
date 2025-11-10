import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';

interface FuseMemberSearchOptions {
	threshold?: number;
}

/**
 * Utility function to extract searchable text from a member
 * Combines all name fields into a single searchable string
 */
function getMemberSearchableText(member: TOrganizationTeamEmployee): string {
	const parts = [
		member.fullName,
		member.name,
		member.firstName,
		member.lastName,
		member.email,
		member.employee?.user?.name,
		member.employee?.user?.firstName,
		member.employee?.user?.lastName
	];

	return parts
		.filter((part): part is string => typeof part === 'string' && part.length > 0)
		.join(' ')
		.toLowerCase();
}

/**
 * Hook for fuzzy searching team members using Fuse.js
 * Provides better UX with approximate matching (e.g., "jon" finds "John")
 *
 * @param members - Array of team members to search
 * @param searchQuery - Search query string
 * @param options - Fuse.js options (threshold, keys)
 * @returns Filtered members based on fuzzy search
 */
export function useFuseMemberSearch(
	members: TOrganizationTeamEmployee[],
	searchQuery: string,
	options: FuseMemberSearchOptions = {}
): TOrganizationTeamEmployee[] {
	const { threshold = 0.4 } = options;

	// Create Fuse index once per members array change (expensive operation)
	const fuse = useMemo(() => {
		const searchableMembers = members.map((member) => ({
			member,
			searchText: getMemberSearchableText(member)
		}));

		return new Fuse(searchableMembers, {
			keys: ['searchText'],
			threshold,
			includeScore: false,
			minMatchCharLength: 1,
			ignoreLocation: true,
			useExtendedSearch: false
		});
	}, [members, threshold]);

	// Search in the index (fast operation, reuses Fuse instance)
	return useMemo(() => {
		// Return all members if search query is empty
		if (!searchQuery.trim()) {
			return members;
		}

		// Search and extract items from results
		const results = fuse.search(searchQuery);
		return results.map((result) => result.item.member);
	}, [fuse, searchQuery, members]);
}
