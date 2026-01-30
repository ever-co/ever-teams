/**
 * Number formatting and conversion utilities
 */

/**
 * Format number to fixed decimal places
 * 
 * @example
 * formatFixed(123.456, 2) // '123.46'
 * formatFixed(99.999, 1) // '100.0'
 * formatFixed(null, 2) // '0.00'
 * 
 * @param value Number to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatFixed(value: number | null | undefined, decimals: number = 2): string {
	if (value == null || isNaN(value)) return '0.' + '0'.repeat(decimals);
	return value.toFixed(decimals);
}

/**
 * Format currency value with fixed decimal places
 * 
 * @example
 * formatCurrency(1234.567) // '1234.57'
 * formatCurrency(99.9, 2, '$') // '$99.90'
 * formatCurrency(null) // '0.00'
 * 
 * @param value Amount to format
 * @param decimals Number of decimal places (default: 2)
 * @param symbol Optional currency symbol prefix
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | null | undefined, decimals: number = 2, symbol?: string): string {
	const formatted = formatFixed(value, decimals);
	return symbol ? `${symbol}${formatted}` : formatted;
}

/**
 * Format percentage value
 * 
 * @example
 * formatPercentage(75.456, 1) // '75.5%'
 * formatPercentage(99.999, 0) // '100%'
 * formatPercentage(null) // '0.00%'
 * 
 * @param value Percentage value to format
 * @param decimals Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | null | undefined, decimals: number = 2): string {
	return formatFixed(value, decimals) + '%';
}

/**
 * Format number with locale-specific formatting
 * 
 * @example
 * formatLocaleNumber(1234567.89) // '1,234,567.89' (en-US)
 * formatLocaleNumber(1234567.89, 'de-DE') // '1.234.567,89'
 * 
 * @param value Number to format
 * @param locale Locale string (default: undefined = browser default)
 * @param options Intl.NumberFormatOptions
 * @returns Formatted number string
 */
export function formatLocaleNumber(
	value: number | null | undefined,
	locale?: string,
	options?: Intl.NumberFormatOptions
): string {
	if (value == null || isNaN(value)) return '0';
	return value.toLocaleString(locale, options);
}

/**
 * Safe number parsing with fallback
 * 
 * @example
 * safeParseNumber('123.45') // 123.45
 * safeParseNumber('invalid', 0) // 0
 * safeParseNumber(null, 10) // 10
 * 
 * @param value Value to parse
 * @param fallback Fallback value if parsing fails (default: 0)
 * @returns Parsed number or fallback
 */
export function safeParseNumber(value: string | number | null | undefined, fallback: number = 0): number {
	if (value == null) return fallback;
	if (typeof value === 'number') return isNaN(value) ? fallback : value;
	
	const parsed = parseFloat(value);
	return isNaN(parsed) ? fallback : parsed;
}

/**
 * Safe integer parsing with fallback
 * 
 * @example
 * safeParseInt('123') // 123
 * safeParseInt('123.99') // 123
 * safeParseInt('invalid', 0) // 0
 * 
 * @param value Value to parse
 * @param fallback Fallback value if parsing fails (default: 0)
 * @returns Parsed integer or fallback
 */
export function safeParseInt(value: string | number | null | undefined, fallback: number = 0): number {
	if (value == null) return fallback;
	if (typeof value === 'number') return isNaN(value) ? fallback : Math.floor(value);
	
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? fallback : parsed;
}

/**
 * Clamp number between min and max values
 * 
 * @example
 * clamp(5, 0, 10) // 5
 * clamp(-5, 0, 10) // 0
 * clamp(15, 0, 10) // 10
 * 
 * @param value Number to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped number
 */
export function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/**
 * Round number to specified decimal places
 * 
 * @example
 * roundTo(123.456, 2) // 123.46
 * roundTo(123.456, 0) // 123
 * roundTo(123.456, -1) // 120
 * 
 * @param value Number to round
 * @param decimals Number of decimal places (can be negative)
 * @returns Rounded number
 */
export function roundTo(value: number, decimals: number = 0): number {
	const factor = Math.pow(10, decimals);
	return Math.round(value * factor) / factor;
}
