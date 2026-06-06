import { useState, useEffect } from 'react';

function useLoader<T>(hook: () => T) {
	const [loading, setLoading] = useState<boolean>(true);
	const [result, setResult] = useState<T | null>(null);

	useEffect(() => {
		const loadHookData = async () => {
			setLoading(true);
			try {
				const hookResult = await hook();
				setResult(hookResult);
			} catch (error) {
				console.error('Error in hook:', error);
			} finally {
				setLoading(false);
			}
		};

		loadHookData();
	}, [hook]);

	return { loading, result };
}

export { useLoader };
