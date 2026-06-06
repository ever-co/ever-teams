'use client';
import { useEffect, useState } from 'react';

export const useUrlInfo = () => {
	const [urlInfo, setUrlInfo] = useState({
		url: '',
		host: '',
		protocol: '',
		path: '',
		query: '',
		hash: ''
	});

	useEffect(() => {
		const currentUrl = window.location.href;
		const currentHost = window.location.host;
		const currentProtocol = window.location.protocol;
		const currentPath = window.location.pathname;
		const currentQuery = window.location.search;
		const currentHash = window.location.hash;

		setUrlInfo({
			url: currentUrl,
			host: currentHost,
			protocol: currentProtocol,
			path: currentPath,
			query: currentQuery,
			hash: currentHash
		});
	}, []);

	return { urlInfo };
};
