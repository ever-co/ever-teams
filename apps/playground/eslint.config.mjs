import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

/**
 * ESLint 9 flat config. eslint-config-next 16 ships flat configs only, so the former
 * `new FlatCompat().extends('next/core-web-vitals', 'next/typescript')` shim crashed ("Converting circular structure
 * to JSON"); the same two configs are imported natively.
 */
const eslintConfig = [...nextVitals, ...nextTypescript];

export default eslintConfig;
