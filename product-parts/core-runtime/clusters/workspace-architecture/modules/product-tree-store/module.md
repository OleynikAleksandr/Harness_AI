# Product Tree Store Module

## Responsibility

Read and write `.harness/product-tree/product-tree.json` and its Markdown projection.

## Public Facade

`ProductTreeStoreFacade`

## Inputs

- Product tree JSON.
- Tree update intents from the orchestrator.

## Outputs

- Validated product tree snapshot.
- Markdown projection.

## Owned Paths

- `module.md`
- `src/**`
