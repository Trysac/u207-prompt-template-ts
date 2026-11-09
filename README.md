# @trysac/prompt-template-ts

[![npm version](https://img.shields.io/npm/v/@trysac/prompt-template-ts.svg)](https://www.npmjs.com/package/@trysac/prompt-template-ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Typed prompt templates for TypeScript: variable names and types are inferred from the template string at compile time, with strict runtime checks and non‑recursive rendering. No runtime dependencies.

## Installation

```bash
npm install @trysac/prompt-template-ts
```

## Usage

```ts
import { template } from '@trysac/prompt-template-ts';

const t = template('Hi {{name}}, you have {{count:number}} items');
const output = t.render({ name: 'Ana', count: 3 });
console.log(output); // Hi Ana, you have 3 items
```

Variables are automatically typed. `{{rules:list}}` expects an array of strings and renders one `- item` per line.

## API

### `template<S extends string>(source: S, opts?: { maxOutputChars?: number }): Template<S>`

Creates a template. Throws `TemplateError` with `code: 'syntax'` for invalid placeholders, `'too_large'` if the source exceeds 100,000 characters or the rendered output exceeds `maxOutputChars` (default 1,000,000).

### `Template<S>`

- `readonly source: S` – the original template string.
- `readonly variables: ReadonlyArray<{ name: string; type: 'string' | 'number' | 'list' }>` – unique variables in order of first appearance.
- `render(vars: VarsOf<S>): string` – renders the template. Throws `TemplateError` with `code` `'missing_variable'`, `'unknown_variable'`, `'invalid_type'` or `'too_large'`.

### `VarsOf<S>`

A type derived from the template literal. Placeholders without a type map to `string`, `:number` to `number`, and `:list` to `readonly string[]`. A template with no placeholders expects `{}`.

### `TemplateError`

Extends `Error` and adds a stable `code`: `'syntax' | 'missing_variable' | 'unknown_variable' | 'invalid_type' | 'too_large'`. Messages name the variable but never its value, and are at most 200 characters.

## Grammar

A placeholder is `{{` + identifier `[A-Za-z_][A-Za-z0-9_]{0,63}` + optional `:` + type (`string`, `number`, `list`) + `}}`. No whitespace is allowed inside. Single braces are literal; there is no escape syntax—use a variable to insert `{{`.

## Type Safety with `tsc`

Compile-time checking relies on TypeScript's template literal type inference. Invalid calls produce compile errors:

```ts
const t = template('Hi {{name}}, you have {{count:number}} items');
// @ts-expect-error – missing 'count'
t.render({ name: 'Ana' });
// @ts-expect-error – 'count' must be a number
t.render({ name: 'Ana', count: '3' });
```

## Limits

- Template source length ≤ 100,000 characters.
- Rendered output length ≤ `maxOutputChars` (default 1,000,000).
- At most 100 distinct variables.
- Values are inserted verbatim and are never re‑parsed.

## Why not a template engine?

Zero dependencies, compile‑time variable checking derived from the string itself, and no logic in prompts. If you need conditionals or loops, use a full template engine like Handlebars.

## License

MIT
