import { Data } from 'clarity-decode';
import { ClickEvent } from 'clarity-decode/types/interaction';

// Helper function to format dates in a user-friendly way
export const formatDateRange = (fromDate: string, toDate: string): string => {
	try {
		const from = new Date(fromDate);
		const to = new Date(toDate);

		const formatOptions: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		};

		const fromFormatted = from.toLocaleDateString('en-US', formatOptions);
		const toFormatted = to.toLocaleDateString('en-US', formatOptions);

		// If same date, show date once with time range
		if (from.toDateString() === to.toDateString()) {
			const dateStr = from.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
			const fromTime = from.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
			const toTime = to.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
			return `${dateStr}, ${fromTime} - ${toTime}`;
		}

		return `${fromFormatted} - ${toFormatted}`;
	} catch (error) {
		console.error('Error formatting date range:', error);
		return `${fromDate} - ${toDate}`;
	}
};

/**
 * Determines whether the given user agent string corresponds to a mobile device.
 *
 * @param userAgent - The user agent string to test.
 * @returns `true` if the user agent matches a known mobile device pattern, otherwise `false`.
 */
export function isMobileDevice(userAgent: string): boolean {
	if (!userAgent) {
		return false;
	}

	return /android|webos|iphone|ipad|ipod|blackberry|windows phone|opera mini|iemobile|mobile|silk|fennec|bada|tizen|symbian|nokia|palmsource|meego|sailfish|kindle|playbook|bb10|rim/i.test(
		userAgent
	);
}

/**
 * Extracts user agent string from the specific payload location for device detection
 * @param decodedPayloads - Array of decoded payloads
 * @returns User agent string or empty string if not found
 */
export const extractUserAgentFromPayload = (decodedPayloads: Data.DecodedPayload[]): string => {
	try {
		// Extract user agent from payloads[0].dimension?.[0].data[0][0]
		const userAgent = decodedPayloads[0]?.dimension?.[0]?.data?.[0]?.[0];
		return typeof userAgent === 'string' ? userAgent : '';
	} catch (error) {
		console.warn('Failed to extract user agent from payload:', error);
		return '';
	}
};

/**
 * Determines if a session was recorded on a mobile device
 * @param decodedPayloads - Array of decoded payloads for the session
 * @returns Object with isMobile boolean and deviceLabel string
 */
export const getSessionDeviceType = (
	decodedPayloads: Data.DecodedPayload[]
): { isMobile: boolean; deviceLabel: string } => {
	const userAgent = extractUserAgentFromPayload(decodedPayloads);
	const isMobile = isMobileDevice(userAgent);
	return {
		isMobile,
		deviceLabel: isMobile ? '📱 Mobile' : '🖥️ Desktop'
	};
};

/**
 * Formats a duration given in milliseconds into a human-readable string in the format "HH:MM:SS" or "MM:SS".
 *
 * - If the duration is at least one hour, the output will be "HH:MM:SS".
 * - If the duration is less than one hour, the output will be "MM:SS".
 *
 * @param ms - The duration in milliseconds.
 * @returns The formatted duration string.
 */
export const formatDuration = (ms: number) => {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return [
		hours > 0 ? String(hours).padStart(2, '0') : null,
		String(minutes).padStart(2, '0'),
		String(seconds).padStart(2, '0')
	]
		.filter(Boolean)
		.join(':');
};

/**
 * Shared Analytics Utilities for Clarity Components
 *
 * This module provides reusable calculation functions for extracting
 * numerical insights from Clarity decodedPayloads data.
 */

// Core interfaces for analytics data structures
export interface SessionMetrics {
	totalDuration: number; // Total session duration in milliseconds
	activeDuration: number; // Time with actual interactions in milliseconds
	idleTime: number; // Time without interactions in milliseconds
	engagementScore: number; // 0-100 engagement score
	interactionRate: number; // Interactions per minute
	eventCount: number; // Total number of events
}

export interface IClickInsight {
	totalClicks: number; // Total number of clicks
	clickRate: number; // Clicks per minute
	clickDensity: number; // Clicks per 1000 pixels squared
	uniqueElements: number; // Number of unique elements clicked
	averageClicksPerElement: number; // Average clicks per element
	topClickedElements: ElementClickData[]; // Most clicked elements
	clickDistribution: ClickDistributionData; // Spatial distribution stats
}

export interface ElementClickData {
	elementId: string;
	clickCount: number;
	percentage: number; // Percentage of total clicks
}

export interface ClickDistributionData {
	topQuadrant: number; // Clicks in top 25% of page
	middleQuadrant: number; // Clicks in middle 50% of page
	bottomQuadrant: number; // Clicks in bottom 25% of page
	leftHalf: number; // Clicks in left 50% of page
	rightHalf: number; // Clicks in right 50% of page
}

export interface HotspotData {
	x: number;
	y: number;
	clickCount: number;
	radius: number; // Effective radius of hotspot
	intensity: number; // 0-1 normalized intensity
}

/**
 * Extract all click events from decoded payloads
 */
export const extractClickEvents = (decodedPayloads: Data.DecodedPayload[]): ClickEvent[] => {
	const clickEvents: ClickEvent[] = [];

	decodedPayloads.forEach((payload) => {
		if (payload.click && Array.isArray(payload.click)) {
			clickEvents.push(...payload.click);
		}
	});

	return clickEvents;
};

/**
 * Extract all events from decoded payloads using visualizer merge
 */
export const extractAllEvents = (decodedPayloads: Data.DecodedPayload[]): Data.DecodedEvent[] => {
	if (!decodedPayloads.length) return [];

	try {
		// Use a simple approach to extract events without requiring visualizer instance
		const allEvents: Data.DecodedEvent[] = [];

		decodedPayloads.forEach((payload) => {
			// Extract events from various payload properties
			if (payload.click) {
				allEvents.push(...(payload.click as Data.DecodedEvent[]));
			}
			if ('scroll' in payload) {
				const scrollEvents = (payload as Data.DecodedPayload & { scroll: Data.DecodedEvent[] }).scroll;
				allEvents.push(...scrollEvents);
			}
			if ('events' in payload) {
				const genericEvents = (payload as Data.DecodedPayload & { events: Data.DecodedEvent[] }).events;
				allEvents.push(...genericEvents);
			}
		});

		return allEvents.filter((event) => event && typeof event.time === 'number');
	} catch (error) {
		console.warn('Error extracting events from payloads:', error);
		return [];
	}
};

/**
 * Calculate comprehensive session metrics from decoded payloads
 */
export const calculateSessionMetrics = (decodedPayloads: Data.DecodedPayload[]): SessionMetrics => {
	if (!decodedPayloads.length) {
		return {
			totalDuration: 0,
			activeDuration: 0,
			idleTime: 0,
			engagementScore: 0,
			interactionRate: 0,
			eventCount: 0
		};
	}

	// Calculate total duration from envelope data
	const totalDuration = decodedPayloads.reduce((sum, payload) => {
		return sum + (Number(payload.envelope?.duration) || 0);
	}, 0);

	// Extract all events for analysis
	const allEvents = extractAllEvents(decodedPayloads);
	const eventCount = allEvents.length;

	// Calculate active duration (time with interactions)
	const activeDuration = calculateActiveDuration(allEvents, totalDuration);

	// Calculate engagement score (0-100)
	const engagementScore = calculateEngagementScore(allEvents, totalDuration);

	// Calculate interaction rate (interactions per minute)
	const interactionRate = totalDuration > 0 ? eventCount / (totalDuration / 60000) : 0;

	return {
		totalDuration,
		activeDuration,
		idleTime: Math.max(0, totalDuration - activeDuration),
		engagementScore,
		interactionRate,
		eventCount
	};
};

/**
 * Calculate active duration based on event timestamps
 */
const calculateActiveDuration = (events: Data.DecodedEvent[], totalDuration: number): number => {
	if (!events.length) return 0;

	// Sort events by time
	const sortedEvents = events.filter((e) => typeof e.time === 'number').sort((a, b) => (a.time || 0) - (b.time || 0));

	if (sortedEvents.length === 0) return 0;

	// Calculate active periods (periods with events within 5 seconds of each other)
	const activeThreshold = 5000; // 5 seconds
	let activeDuration = 0;
	let currentActiveStart = sortedEvents[0].time || 0;
	let lastEventTime = currentActiveStart;

	for (let i = 1; i < sortedEvents.length; i++) {
		const eventTime = sortedEvents[i].time || 0;
		const timeSinceLastEvent = eventTime - lastEventTime;

		if (timeSinceLastEvent > activeThreshold) {
			// End of active period
			activeDuration += lastEventTime - currentActiveStart + 1000; // Add 1 second buffer
			currentActiveStart = eventTime;
		}

		lastEventTime = eventTime;
	}

	// Add final active period
	activeDuration += lastEventTime - currentActiveStart + 1000;

	// Ensure active duration doesn't exceed total duration
	return Math.min(activeDuration, totalDuration);
};

/**
 * Calculate engagement score (0-100) based on interaction patterns
 */
const calculateEngagementScore = (events: Data.DecodedEvent[], totalDuration: number): number => {
	if (!events.length || totalDuration === 0) return 0;

	// Factors for engagement calculation
	const eventDensity = events.length / (totalDuration / 1000); // Events per second
	const maxExpectedDensity = 2; // Maximum expected events per second for high engagement

	// Normalize event density to 0-1 scale
	const densityScore = Math.min(eventDensity / maxExpectedDensity, 1);

	// Calculate time distribution score (more even distribution = higher engagement)
	const timeDistributionScore = calculateTimeDistributionScore(events, totalDuration);

	// Combine scores with weights
	const engagementScore = (densityScore * 0.6 + timeDistributionScore * 0.4) * 100;

	return Math.round(Math.min(engagementScore, 100));
};

/**
 * Calculate how evenly distributed events are across the session timeline
 */
const calculateTimeDistributionScore = (events: Data.DecodedEvent[], totalDuration: number): number => {
	if (!events.length || totalDuration === 0) return 0;

	// Divide session into 10 time buckets
	const bucketCount = 10;
	const bucketSize = totalDuration / bucketCount;
	const buckets = new Array(bucketCount).fill(0);

	// Count events in each bucket
	events.forEach((event) => {
		if (typeof event.time === 'number') {
			const bucketIndex = Math.min(Math.floor(event.time / bucketSize), bucketCount - 1);
			buckets[bucketIndex]++;
		}
	});

	// Calculate coefficient of variation (lower = more even distribution)
	const mean = events.length / bucketCount;
	const variance = buckets.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / bucketCount;
	const standardDeviation = Math.sqrt(variance);
	const coefficientOfVariation = mean > 0 ? standardDeviation / mean : 1;

	// Convert to score (0-1, where 1 is perfectly even distribution)
	return Math.max(0, 1 - Math.min(coefficientOfVariation, 1));
};

/**
 * Calculate comprehensive click analytics from decoded payloads
 */
export const calculateClickInsights = (decodedPayloads: Data.DecodedPayload[]): IClickInsight => {
	const clickEvents = extractClickEvents(decodedPayloads);

	if (!clickEvents.length) {
		return {
			totalClicks: 0,
			clickRate: 0,
			clickDensity: 0,
			uniqueElements: 0,
			averageClicksPerElement: 0,
			topClickedElements: [],
			clickDistribution: {
				topQuadrant: 0,
				middleQuadrant: 0,
				bottomQuadrant: 0,
				leftHalf: 0,
				rightHalf: 0
			}
		};
	}

	// Calculate total session duration for rate calculations
	const totalDuration = decodedPayloads.reduce((sum, payload) => {
		return sum + (Number(payload.envelope?.duration) || 0);
	}, 0);

	// Calculate basic metrics
	const totalClicks = clickEvents.length;
	const clickRate = totalDuration > 0 ? totalClicks / (totalDuration / 60000) : 0; // Clicks per minute

	// Calculate click density (clicks per 1000 pixels squared)
	const clickDensity = calculateClickDensity(clickEvents);

	// Analyze element-level clicks
	const elementAnalysis = analyzeElementClicks(clickEvents);

	// Calculate spatial distribution
	const clickDistribution = calculateClickDistribution(clickEvents);

	return {
		totalClicks,
		clickRate,
		clickDensity,
		uniqueElements: elementAnalysis.uniqueElements,
		averageClicksPerElement: elementAnalysis.averageClicksPerElement,
		topClickedElements: elementAnalysis.topClickedElements,
		clickDistribution
	};
};

/**
 * Calculate click density based on screen area coverage
 */
const calculateClickDensity = (clickEvents: ClickEvent[]): number => {
	if (!clickEvents.length) return 0;

	// Extract valid coordinates
	const coordinates = clickEvents
		.map((event) => ({ x: event.data?.x, y: event.data?.y }))
		.filter((coord) => typeof coord.x === 'number' && typeof coord.y === 'number') as { x: number; y: number }[];

	if (!coordinates.length) return 0;

	// Calculate bounding box of all clicks
	const minX = Math.min(...coordinates.map((c) => c.x));
	const maxX = Math.max(...coordinates.map((c) => c.x));
	const minY = Math.min(...coordinates.map((c) => c.y));
	const maxY = Math.max(...coordinates.map((c) => c.y));

	// Calculate area (add padding to avoid division by zero)
	const width = Math.max(maxX - minX, 100);
	const height = Math.max(maxY - minY, 100);
	const area = width * height;

	// Return clicks per 1000 pixels squared
	return (coordinates.length / area) * 1000;
};

/**
 * Analyze clicks by element to identify most engaged elements
 */
const analyzeElementClicks = (
	clickEvents: ClickEvent[]
): {
	uniqueElements: number;
	averageClicksPerElement: number;
	topClickedElements: ElementClickData[];
} => {
	// Group clicks by element ID
	const elementClickMap = new Map<string, number>();

	clickEvents.forEach((event) => {
		const elementId = event.data?.target ? String(event.data.target) : 'unknown';
		elementClickMap.set(elementId, (elementClickMap.get(elementId) || 0) + 1);
	});

	const uniqueElements = elementClickMap.size;
	const averageClicksPerElement = uniqueElements > 0 ? clickEvents.length / uniqueElements : 0;

	// Create sorted list of top clicked elements
	const topClickedElements: ElementClickData[] = Array.from(elementClickMap.entries())
		.map(([elementId, clickCount]) => ({
			elementId,
			clickCount,
			percentage: (clickCount / clickEvents.length) * 100
		}))
		.sort((a, b) => b.clickCount - a.clickCount)
		.slice(0, 10); // Top 10 elements

	return {
		uniqueElements,
		averageClicksPerElement,
		topClickedElements
	};
};

/**
 * Calculate spatial distribution of clicks across page quadrants
 */
const calculateClickDistribution = (clickEvents: ClickEvent[]): ClickDistributionData => {
	// Extract valid coordinates
	const coordinates = clickEvents
		.map((event) => ({ x: event.data?.x, y: event.data?.y }))
		.filter((coord) => typeof coord.x === 'number' && typeof coord.y === 'number') as { x: number; y: number }[];

	if (!coordinates.length) {
		return {
			topQuadrant: 0,
			middleQuadrant: 0,
			bottomQuadrant: 0,
			leftHalf: 0,
			rightHalf: 0
		};
	}

	// Calculate page bounds
	const minX = Math.min(...coordinates.map((c) => c.x));
	const maxX = Math.max(...coordinates.map((c) => c.x));
	const minY = Math.min(...coordinates.map((c) => c.y));
	const maxY = Math.max(...coordinates.map((c) => c.y));

	const width = maxX - minX;
	const height = maxY - minY;

	// Count clicks in each region
	let topQuadrant = 0;
	let middleQuadrant = 0;
	let bottomQuadrant = 0;
	let leftHalf = 0;
	let rightHalf = 0;

	coordinates.forEach((coord) => {
		const relativeY = (coord.y - minY) / height;
		const relativeX = (coord.x - minX) / width;

		// Vertical distribution
		if (relativeY <= 0.25) {
			topQuadrant++;
		} else if (relativeY <= 0.75) {
			middleQuadrant++;
		} else {
			bottomQuadrant++;
		}

		// Horizontal distribution
		if (relativeX <= 0.5) {
			leftHalf++;
		} else {
			rightHalf++;
		}
	});

	return {
		topQuadrant,
		middleQuadrant,
		bottomQuadrant,
		leftHalf,
		rightHalf
	};
};
