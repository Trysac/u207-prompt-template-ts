# Project record: prompt-template-ts

## Objective

Typed prompt templates for TypeScript: variable names and types inferred from the template string at compile time, strict runtime checks and non-recursive rendering

State the measurable outcome this utility must deliver and who it is for.

## Scope

In scope:

- The public API documented in the README.

Out of scope:

- List what this utility deliberately does not do.

## Timeline

| Date | Milestone |
|---|---|
| 2026 | Repository created from the factory utility template. |

## Effort metrics

Measured values only. Leave "pending measurement" until a real figure is recorded; never estimate here.

| Metric | Value | Source |
|---|---|---|
| Tokens (input / output) | 1106465 / 71891 | factory ledger |
| Hours (human) | pending measurement | time log |
| Cost (USD) | 0.0803 | factory ledger |

## Factory run u207 (measured from API usage)

| Phase | Model | Batch | Input | Output | Cache write | Cache read | Cost (USD) |
|---|---|---|---|---|---|---|---|
| generation | deepseek-v4-pro | yes | 3532 | 16227 | 0 | 1280 | 0.0345 |
| fix-1 | deepseek-flash | no | 24030 | 19470 | 0 | 514816 | 0.0168 |
| fix-2 | deepseek-flash | no | 12512 | 4537 | 0 | 114816 | 0.0049 |
| audit | deepseek-flash | no | 19796 | 28719 | 0 | 363264 | 0.0213 |
| fix-3 | deepseek-flash | no | 5955 | 2938 | 0 | 46464 | 0.0028 |

Total: $0.0803. Prices: deepseek line, as measured by its adapter.
