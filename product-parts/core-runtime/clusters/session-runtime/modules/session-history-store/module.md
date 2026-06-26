# Session History Store Module

## Responsibility

Own append-only JSONL session history files.

## Public Facade

`SessionHistoryStoreFacade`

## Inputs

- Session event records.
- Session id.

## Outputs

- Appended JSONL history.
- Read-back session event stream.

## Owned Paths

- `module.md`
- `src/**`
