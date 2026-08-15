'use client';

import { useEffect } from 'react';
import { useState } from 'react';
import { Button, cn } from '@ever-teams/toolkit-ui';
import ClarityReplay from './clarity/clarity-replay';
import { Data, decode } from 'clarity-decode';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateRange, formatDuration, getSessionDeviceType } from '../../utils/tracking-utils';
import { useTrackingContext } from '@lib/context/teams-tracking-context';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';

/**
 * Internal Session Replay Component that uses global filter context
 */
export default function TeamsTrackingSessionReplay({ className }: { className?: string }) {
	const { t } = useTranslation(undefined, { keyPrefix: 'TEAMS_TRACKING_SESSION_REPLAY' });
	// Use global filter context for sessions data
	const { sessions, loading, error } = useTrackingContext();

	const [currentSessionDecodedPayloads, setCurrentSessionDecodedPayloads] = useState<Data.DecodedPayload[]>([]);

	// Clear current session when sessions change (e.g., after applying new filters)
	useEffect(() => {
		// If the currently selected session is no longer in the sessions list, clear the selection
		if (currentSessionDecodedPayloads.length > 0) {
			const currentSessionId = currentSessionDecodedPayloads[0]?.envelope?.sessionId;
			const sessionExists = sessions.some((session) => session.sessionId === currentSessionId);

			if (!sessionExists) {
				setCurrentSessionDecodedPayloads([]);
			}
		}
	}, [sessions, currentSessionDecodedPayloads]);

	return (
		<div className={cn(' rounded-xl  shadow-lg bg-white dark:bg-black px-6 py-4 w-[90vw] h-fit ', className)}>
			<h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{t('title')}</h1>

			{/* Global Filter Component */}

			<div className="flex gap-4 flex-col lg:flex-row">
				<div className=" flex-col dark:bg-black/70 bg-white text-black dark:text-white  flex gap-2">
					<div className="lg:w-72 w-full flex flex-col justify-center gap-4 rounded-lg border p-3 border-gray-200 dark:border-gray-700">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
									{t('sessions_title')}
								</h1>
								{sessions.length > 0 && (
									<span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
										{sessions.length}
									</span>
								)}
							</div>
							{currentSessionDecodedPayloads.length > 0 && (
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentSessionDecodedPayloads([])}
									className="text-xs px-2 py-1"
									title="Clear current session selection"
								>
									{t('actions.clear')}
								</Button>
							)}
						</div>
						{sessions &&
							sessions[0] &&
							sessions.map(({ session: { sessionId, payloads, createdAt, lastActivity } }) => {
								// Calculate total duration for this session
								const decodedPayloads = payloads.map((elt) => decode(elt.encodedData));

								const totalDuration = decodedPayloads.reduce(
									(sum, elt) => sum + (Number(elt.envelope.duration) || 0),
									0
								);

								// Detect device type for this session
								// Memoize device type calculation for performance
								const deviceLabel = (() => {
									// Use a WeakMap or Map outside the component if you want to persist cache across renders
									// For now, memoize per render using a static object
									const deviceTypeCache = ((TeamsTrackingSessionReplay as any)._deviceTypeCache ||=
										new Map());
									const cacheKey = decodedPayloads?.[0]?.envelope?.sessionId;
									if (cacheKey && deviceTypeCache.has(cacheKey)) {
										return deviceTypeCache.get(cacheKey);
									}
									const { deviceLabel } = getSessionDeviceType(decodedPayloads);
									if (cacheKey) deviceTypeCache.set(cacheKey, deviceLabel);
									return deviceLabel;
								})();

								return (
									<div
										key={sessionId}
										className={`flex flex-col gap-1 border text-xs rounded-lg border-gray-200 dark:border-gray-700 p-2 w-full cursor-pointer transition
                                    ${
										currentSessionDecodedPayloads?.[0]?.envelope?.sessionId ===
										decodedPayloads?.[0]?.envelope?.sessionId
											? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-500 ring-2 ring-blue-300 dark:ring-blue-700'
											: 'bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 dark:hover:bg-blue-950'
									}`}
										onClick={() => setCurrentSessionDecodedPayloads(decodedPayloads)}
										title="Click to view this session"
									>
										<div className="flex justify-between items-center font-semibold dark:text-blue-300">
											<div className="flex items-center gap-2">
												<span>
													{t('session_details.session_id')}{' '}
													<span className="font-mono text-gray-500">{sessionId}</span>
												</span>
												{/* Device Type Indicator */}
												<span className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-normal">
													{deviceLabel}
												</span>
											</div>

											<span className="text-gray-500 ">{formatDuration(totalDuration)}</span>
										</div>

										<div className="dark:text-blue-300">
											<span>{t('session_details.time_range')}</span>{' '}
											<span className="text-gray-500">
												{formatDateRange(createdAt, lastActivity)}
											</span>
										</div>

										<div className="dark:text-blue-300">
											<span>{t('session_details.url')}</span>{' '}
											<span className="text-gray-500">
												{decodedPayloads[0] && decodedPayloads[0].envelope.url}
											</span>
										</div>
									</div>
								);
							})}

						{!sessions ||
							(sessions.length === 0 && (
								<div className="text-gray-500 text-sm">{t('states.no_sessions')}</div>
							))}
					</div>
				</div>

				<div className="p-3  max-h-[720px]  w-full h-[80vh]  min-h-52 flex flex-col justify-center items-center rounded-lg border border-gray-200 dark:border-gray-700">
					{/* Loading State */}
					{loading && (
						<div className="flex flex-col items-center gap-3">
							<Loader2 className="animate-spin h-8 w-8 text-blue-500" />
							<p className="text-gray-500 text-sm">{t('states.loading')}</p>
						</div>
					)}

					{/* Error State */}
					{!loading && error && (
						<div className="flex flex-col items-center gap-3 text-center">
							<div className="text-red-500 text-lg">⚠️</div>
							<div>
								<p className="text-gray-700 dark:text-gray-300 font-medium">{t('states.error')}</p>
								<p className="text-gray-500 text-sm mt-1">{error}</p>
							</div>
						</div>
					)}

					{/* No Sessions Available */}
					{!loading && !error && sessions.length === 0 && (
						<div className="flex flex-col items-center gap-3 text-center">
							<div className="text-gray-400 text-4xl">📹</div>
							<div>
								<p className="text-gray-700 dark:text-gray-300 font-medium">
									{t('states.no_sessions_available')}
								</p>
								<p className="text-gray-500 text-sm mt-1">
									Try adjusting your filters or check back later for new sessions.
								</p>
							</div>
						</div>
					)}

					{/* Sessions Available but None Selected */}
					{!loading && !error && sessions.length > 0 && currentSessionDecodedPayloads.length === 0 && (
						<div className="flex flex-col items-center gap-3 text-center">
							<div className="text-blue-500 text-4xl">👆</div>
							<div>
								<p className="text-gray-700 dark:text-gray-300 font-medium">
									{t('states.select_session')}
								</p>
								<p className="text-gray-500 text-sm mt-1">{t('states.select_session_message')}</p>
							</div>
						</div>
					)}

					{/* Session Selected - Show Replay or Heatmap */}
					{!loading && !error && sessions.length > 0 && currentSessionDecodedPayloads.length > 0 && (
						<div className="w-full h-full">
							<ClarityReplay decodedPayloads={currentSessionDecodedPayloads} />
						</div>
					)}
				</div>
			</div>
			<TeamsTimerFooter className="mt-3" />
		</div>
	);
}

export { TeamsTrackingSessionReplay };
