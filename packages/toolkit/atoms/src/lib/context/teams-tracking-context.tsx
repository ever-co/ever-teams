'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { ITeamsSession, isSuccessResponse, ITrackingApiHeaders } from '@ever-teams/toolkit-types';
import { trackingApiClient } from '@ever-teams/api';
import { useTeamsContext } from './teams-context';

/**
 * Global Filter State Interface
 * Consolidates common filtering logic from tracking components
 */
export interface ITrackingContext {
	// Filter form data
	formData: {
		from: Date;
		to: Date;
		employeeIds: string[] | null;
	};

	// Sessions data and state
	sessions: ITeamsSession[];
	loading: boolean;
	error: string | null;

	// Actions
	setFormData: React.Dispatch<React.SetStateAction<ITrackingContext['formData']>>;
	fetchSessions: () => Promise<void>;
	refetchSessions: () => Promise<void>;

	// Registers a component that shows sessions; returns its unregister function. Sessions are read only while at
	// least one is mounted, so a page with a timer alone never asks for them.
	registerConsumer?: () => () => void;
}

/**
 * Global Filter Context
 * Provides shared filter state and actions for tracking components
 */
const TrackingContext = createContext<ITrackingContext | null>(null);

/**
 * Hook to use the global filter context
 * Throws error if used outside of provider
 */
export const useTrackingContext = (): ITrackingContext => {
	const context = useContext(TrackingContext);
	const registerConsumer = context?.registerConsumer;
	useEffect(() => registerConsumer?.(), [registerConsumer]);
	if (!context) {
		throw new Error('useTrackingContext must be used within a TrackingProvider');
	}
	return context;
};

/**
 * Global Filter Provider Props
 */
interface ITrackingProviderProps {
	children: ReactNode;
	config?: {
		baseUrl?: string;
		headers?: ITrackingApiHeaders;
		timeout?: number;
	};
}

/**
 * Global Filter Provider Component
 * Manages shared filter state and API requests for tracking components
 */
export const TrackingProvider: React.FC<ITrackingProviderProps> = ({ children, config }) => {
	const { selectedOrganization, token, selectedEmployee, authenticatedUser: user } = useTeamsContext();

	// Initialize form data with current time and 1 hour range
	const [formData, setFormData] = useState(() => {
		const toDate = new Date();
		const fromDate = new Date(toDate.getTime() - 60 * 60 * 1000); // 1 hour ago

		return {
			from: fromDate,
			to: toDate,
			employeeIds: selectedEmployee === 'all' ? null : [selectedEmployee]
		};
	});

	// Sessions state
	const [sessions, setSessions] = useState<ITeamsSession[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [consumerCount, setConsumerCount] = useState(0);
	const hasConsumers = consumerCount > 0;

	// Only the latest read may write the state: an older one that ends later is ignored.
	const latestRead = useRef(0);
	// The provider's own address, sent with each of its reads.
	const baseUrl = config?.baseUrl;

	const registerConsumer = useCallback(() => {
		setConsumerCount((count) => count + 1);
		return () => setConsumerCount((count) => count - 1);
	}, []);

	/**
	 * Fetch sessions from API with current filter parameters
	 */
	const fetchSessions = useCallback(async () => {
		const read = latestRead.current + 1;
		latestRead.current = read;
		const isLatest = () => read === latestRead.current;
		setLoading(true);
		setError(null);

		try {
			if (!selectedOrganization || !selectedEmployee || !token || !user) {
				throw new Error('Missing organization, employee, or token');
			}

			// Validate date format
			const fromDate = new Date(formData.from);
			const toDate = new Date(formData.to);

			if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
				throw new Error('Invalid date format. Please use ISO 8601 format (e.g., 2024-01-01T00:00:00.000Z)');
			}

			if (fromDate >= toDate) {
				throw new Error('From date must be earlier than to date');
			}

			// Call the filtered sessions endpoint
			const response = await trackingApiClient.getFilteredSessions(
				formData.from.toISOString(),
				formData.to.toISOString(),
				formData.employeeIds,
				selectedOrganization,
				user?.tenantId,
				token!,
				{ apiUrl: baseUrl }
			);

			if (!isLatest()) {
				return;
			}

			if (isSuccessResponse(response)) {
				// The time-zone helpers carry the whole zone database: they load with the first sessions to convert, so a page
				// that shows no session list never downloads it.
				const { convertSessionDatesToTimezone, getUserTimezone } = await import('@lib/utils/time-zone');
				if (!isLatest()) {
					return;
				}

				// Get the user's timezone with fallback priority
				const userTimezone = getUserTimezone(user?.timeZone);

				// Convert all session dates from UTC to user's timezone
				const convertedSessions = response.data.sessions.map((session) =>
					convertSessionDatesToTimezone(session, userTimezone)
				);

				setSessions(convertedSessions);

				setError(null);
			} else {
				setError(response.error || 'Failed to fetch sessions');
				setSessions([]);
			}
		} catch (err) {
			if (!isLatest()) {
				return;
			}
			setError(err instanceof Error ? err.message : 'An unexpected error occurred');
			setSessions([]);
		} finally {
			if (isLatest()) {
				setLoading(false);
			}
		}
	}, [formData, selectedOrganization, selectedEmployee, token, user, baseUrl]);

	/**
	 * Refetch sessions - alias for fetchSessions for clarity
	 */
	const refetchSessions = useCallback(() => {
		return fetchSessions();
	}, [fetchSessions]);

	// Update API client config when config changes, but never with the provider's address: kept in the page's one
	// client, it would reach the reads of a provider without an address of its own, which follow the page's address at
	// the time of each read (or the base URL a host gave the client itself).
	useEffect(() => {
		if (config) {
			trackingApiClient.updateConfig({ headers: config.headers, timeout: config.timeout });
		}
	}, [config]);

	// Update employeeIds when selectedEmployee changes
	useEffect(() => {
		if (selectedEmployee) {
			setFormData((prev) => ({
				...prev,
				employeeIds: selectedEmployee === 'all' ? null : [selectedEmployee]
			}));
		}
	}, [selectedEmployee]);

	// Another user, organization or employee: the sessions read for the previous one are dropped at once, even
	// when no component shows them, so a component mounted later never shows them.
	useEffect(() => {
		latestRead.current += 1;
		setSessions([]);
		setError(null);
		setLoading(false);
	}, [selectedOrganization, selectedEmployee, token]);

	// Auto-fetch sessions when context values change, only while a component shows them
	useEffect(() => {
		const signedIn = Boolean(selectedOrganization && selectedEmployee && token);
		if (signedIn && hasConsumers) {
			fetchSessions();
		}
	}, [selectedOrganization, selectedEmployee, token, hasConsumers]);

	const contextValue: ITrackingContext = {
		formData,
		sessions,
		loading,
		error,
		setFormData,
		fetchSessions,
		refetchSessions,
		registerConsumer
	};

	return <TrackingContext.Provider value={contextValue}>{children}</TrackingContext.Provider>;
};

export default TrackingProvider;
