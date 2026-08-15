import { ICustomTheme } from '@ever-teams/toolkit-types';

export const getColorHex = (color: string): string => {
	return colorHexMap[color] || color;
};

export const defaultTheme: ICustomTheme = {
	colors: {
		textColor: '#000',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, #3826A6 0%, #A11DB1 100%)',
		borderColor: '#A11DB1'
	}
};

export const theme1: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'black',

		// mainColor: '#3826A6',
		borderColor: '#000000'
	}
};

export const theme2: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, red 0%, green 100%)',
		borderColor: '#008000'
	}
};

export const theme3: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, yellow 0%, red 100%)',
		borderColor: '#FFA500'
	}
};

export const theme4: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'blue',
		borderColor: '#0000FF'
	}
};

export const theme5: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, blue 0%, green 100%)',
		borderColor: '#00FFFF'
	}
};

export const theme6: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, purple 0%, pink 100%)',
		borderColor: '#FF00FF'
	}
};

export const theme7: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, teal 0%, orange 100%)',
		borderColor: '#FF8C00'
	}
};

export const theme8: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, red 0%, blue 100%)',
		borderColor: '#ADD8E6'
	}
};

export const theme9: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, green 0%, yellow 100%)',
		borderColor: '#00FF00'
	}
};

export const theme10: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, pink 0%, blue 100%)',
		borderColor: '#00BFFF'
	}
};

export const theme11: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, orange 0%, purple 100%)',
		borderColor: '#EE82EE'
	}
};

export const theme12: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, brown 0%, beige 100%)',
		borderColor: '#8B4513'
	}
};

export const theme13: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, turquoise 0%, pink 100%)',
		borderColor: '#FF69B4'
	}
};

export const theme14: ICustomTheme = {
	colors: {
		textColor: 'black',
		backgroundColor: 'white',
		mainColor: 'linear-gradient(135deg, yellow 0%, purple 100%)',
		borderColor: '#9932CC'
	}
};

const colorHexMap: { [key: string]: string } = {
	black: '#000000',
	white: '#FFFFFF',
	red: '#FF0000',
	green: '#008000',
	blue: '#0000FF',
	yellow: '#FFFF00',
	orange: '#FFA500',
	cyan: '#00FFFF',
	magenta: '#FF00FF',
	teal: '#008080',
	purple: '#800080',
	pink: '#FFC0CB',
	lightblue: '#ADD8E6',
	lime: '#00FF00',
	deepskyblue: '#00BFFF',
	violet: '#EE82EE',
	saddlebrown: '#8B4513',
	hotpink: '#FF69B4',
	brown: '#A52A2A',
	beige: '#F5F5DC',
	darkorange: '#FF8C00',
	darkorchid: '#9932CC',
	turquoise: '#40E0D0'
};
