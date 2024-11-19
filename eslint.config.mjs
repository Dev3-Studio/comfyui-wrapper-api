// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
	{
		// config with just ignores is the replacement for `.eslintignore`
		ignores: ['**/build/**', '**/dist/**', '**/node_modules/**', 'eslint.config.mjs'],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		plugins: {
			'@typescript-eslint': tseslint.plugin,
		},
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: true,
			},
		},
		rules: {
			'arrow-spacing': [
				'warn',
				{
					'before': true,
					'after': true,
				},
			],
			'brace-style': [
				'off',
				'stroustrup',
				{
					'allowSingleLine': true,
				},
			],
			'comma-dangle': [
				'error',
				'always-multiline',
			],
			'comma-spacing': 'error',
			'comma-style': 'error',
			'curly': [
				'error',
				'multi-line',
				'consistent',
			],
			'dot-location': [
				'error',
				'property',
			],
			'handle-callback-err': 'off',
			'indent': [
				'error',
				'tab',
				{
					'SwitchCase': 1,
				},
			],
			'keyword-spacing': 'error',
			'max-nested-callbacks': [
				'error',
				{
					'max': 4,
				},
			],
			'max-statements-per-line': [
				'error',
				{
					'max': 2,
				},
			],
			'no-console': 'off',
			'no-empty-function': 'off',
			'no-empty-pattern': 'off',
			'no-floating-decimal': 'error',
			'no-inline-comments': 'off',
			'no-lonely-if': 'error',
			'no-multi-spaces': 'error',
			'no-multiple-empty-lines': [
				'error',
				{
					'max': 2,
					'maxEOF': 1,
					'maxBOF': 0,
				},
			],
			'no-shadow': 'off',
			'no-trailing-spaces': [
				'error',
			],
			'no-var': 'error',
			'object-curly-spacing': [
				'error',
				'always',
			],
			'prefer-const': 'error',
			'quotes': [
				'error',
				'single',
			],
			'semi': [
				'error',
				'always',
			],
			'no-mixed-spaces-and-tabs': 'off',
			'space-before-blocks': 'error',
			'space-before-function-paren': [
				'error',
				{
					'anonymous': 'never',
					'named': 'never',
					'asyncArrow': 'always',
				},
			],
			'space-in-parens': 'error',
			'space-infix-ops': 'error',
			'space-unary-ops': 'error',
			'spaced-comment': 'error',
			'yoda': 'error',
			'@typescript-eslint/no-shadow': [
				'error',
			],
		},
	},
);