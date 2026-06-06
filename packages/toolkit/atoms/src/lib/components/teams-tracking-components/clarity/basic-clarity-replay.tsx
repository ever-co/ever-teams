'use client';

import { Data } from 'clarity-decode';
import { Visualizer } from 'clarity-visualize';
import React, { useRef, useEffect } from 'react';

interface ClarityReplayProps {
	decodedData: Data.DecodedPayload[];
	width?: number;
	height?: number;
	onReady?: () => void;
	onError?: (error: Error) => void;
}

const BasicClarityReplay: React.FC<ClarityReplayProps> = ({ decodedData, onReady, onError, width, height }) => {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const visualizerRef = useRef<Visualizer | null>(null);

	useEffect(() => {
		if (!decodedData?.length) return;

		const initializeVisualizer = async () => {
			try {
				const contentWindow = iframeRef.current?.contentWindow;
				if (!contentWindow) return;

				const visualizer = new Visualizer();
				visualizerRef.current = visualizer;

				// Setup the visualizer
				await visualizer.setup(contentWindow, {
					version: decodedData[0].envelope.version,
					mobile: false,
					vNext: true,
					locale: 'en-us',
					canvas: true,
					keyframes: false
				});

				// Merge payloads and render initial DOM
				const merged = visualizer.merge(decodedData);

				if (merged.dom) {
					await visualizer.dom(merged.dom);
				}

				onReady?.();
			} catch (error) {
				onError?.(error as Error);
			}
		};

		initializeVisualizer();

		// Cleanup function
		return () => {
			if (visualizerRef.current) {
				visualizerRef.current = null;
			}
		};
	}, [decodedData]);

	return (
		<div className="clarity-replay-container w-full h-full">
			<iframe width={width} height={height} ref={iframeRef} title="Clarity Replay" className="w-full h-full" />
		</div>
	);
};

export default BasicClarityReplay;
