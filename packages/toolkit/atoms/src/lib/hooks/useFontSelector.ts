import { useState, useEffect } from 'react';
import { FONT_OPTIONS } from '../font/font';

const useFontSelector = () => {
	const [selectedFont, setSelectedFont] = useState<string>(
		() =>
			(typeof window !== 'undefined' && localStorage.getItem('selected-font')) ||
			FONT_OPTIONS[0].value ||
			FONT_OPTIONS[1].value
	);

	useEffect(() => {
		const font = FONT_OPTIONS.find((f) => f.value === selectedFont);

		if (font?.googleFont) {
			const fontName = font.name.replace(' ', '+');
			const linkId = `google-font-${fontName}`;

			if (!document.getElementById(linkId)) {
				const link = document.createElement('link');
				link.id = linkId;
				link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`;
				link.rel = 'stylesheet';
				document.head.appendChild(link);
			}
		}

		document.body.style.fontFamily = selectedFont;
		typeof window !== 'undefined' && localStorage.setItem('selected-font', selectedFont);
	}, [selectedFont]);
	return {
		selectedFont,
		setSelectedFont,
		fontOptions: FONT_OPTIONS
	};
};

export default useFontSelector;
