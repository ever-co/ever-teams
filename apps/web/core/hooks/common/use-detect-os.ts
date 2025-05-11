'use client';

import { useEffect, useState } from 'react';

const detectOS = (): 'Windows' | 'Mac' | 'Linux' | 'Other' => {
	const userAgent = window.navigator.userAgent;
	if (/win/i.test(userAgent)) {
		return 'Windows';
	} else if (/mac/i.test(userAgent)) {
		return 'Mac';
	} else if (/linux/i.test(userAgent)) {
		return 'Linux';
	} else {
		return 'Other';
	}
};

export const useDetectOS = () => {
	const [os, setOS] = useState<'Windows' | 'Mac' | 'Linux' | 'Other'>('Other');

	useEffect(() => {
		// Detect the user's operating system and update the state
		setOS(detectOS());
	}, []);

	return {
		os
	};
};
