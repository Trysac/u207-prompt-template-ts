# Typed prompt templates with template literal type inference

Status: accepted (generated, pending human review)

## Context

Prompt templates built with string interpolation fail silently: a renamed variable leaves undefined in the prompt, a number arrives as a string, or user text containing braces gets interpreted as another placeholder. TypeScript can catch most of this at compile time if variables are derived from the template itself.

## Decision

Implement a `template()` function that uses TypeScript's template literal parsing to infer a typed variable object from the template string. Runtime parsing enforces a strict grammar (identifier + optional type, no whitespace) and validates that provided values match the inferred types. Rendering is non‑recursive and inserts values verbatim, preventing injection of placeholders.

## Consequences

Users get compile‑time checks for missing or wrongly typed variables, and runtime validation catches dynamic inputs. The library remains dependency‑free and suitable for prompt construction. The syntax is intentionally simple; conditionals and loops are out of scope and left to dedicated template engines.
