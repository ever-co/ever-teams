export type FontOption = {
	name: string;
	value: string;
	googleFont?: boolean;
};

export const FONT_OPTIONS: FontOption[] = [
	{ name: 'Geist', value: '"Geist", serif', googleFont: true },
	{ name: 'Arial', value: 'Arial, sans-serif' },
	{ name: 'Verdana', value: 'Verdana, sans-serif' },
	{ name: 'Times New Roman', value: '"Times New Roman", serif' },
	{ name: 'Georgia', value: 'Georgia, serif' },
	{ name: 'Courier New', value: '"Courier New", monospace' },
	{ name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
	{ name: 'Impact', value: 'Impact, sans-serif' },
	{ name: 'Roboto', value: '"Roboto", sans-serif', googleFont: true },
	{ name: 'Open Sans', value: '"Open Sans", sans-serif', googleFont: true },
	{ name: 'Lato', value: '"Lato", sans-serif', googleFont: true },
	{ name: 'Montserrat', value: '"Montserrat", sans-serif', googleFont: true },
	{ name: 'Oswald', value: '"Oswald", sans-serif', googleFont: true },
	{ name: 'Raleway', value: '"Raleway", sans-serif', googleFont: true },
	{ name: 'Poppins', value: '"Poppins", sans-serif', googleFont: true },
	{ name: 'Noto Sans', value: '"Noto Sans", sans-serif', googleFont: true },
	{ name: 'Nunito', value: '"Nunito", sans-serif', googleFont: true },
	{ name: 'Merriweather', value: '"Merriweather", serif', googleFont: true },
	{ name: 'Playfair Display', value: '"Playfair Display", serif', googleFont: true },
	{ name: 'Source Sans Pro', value: '"Source Sans Pro", sans-serif', googleFont: true },
	{ name: 'Ubuntu', value: '"Ubuntu", sans-serif', googleFont: true },
	{ name: 'Dancing Script', value: '"Dancing Script", cursive', googleFont: true },
	{ name: 'Pacifico', value: '"Pacifico", cursive', googleFont: true },
	{ name: 'Josefin Sans', value: '"Josefin Sans", sans-serif', googleFont: true },
	{ name: 'Rubik', value: '"Rubik", sans-serif', googleFont: true },
	{ name: 'Karla', value: '"Karla", sans-serif', googleFont: true }
];
