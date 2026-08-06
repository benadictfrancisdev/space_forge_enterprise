# Engineering Standards

## Folder conventions

```
apps/<domain>/{api,application,domain,infrastructure,tests}
config/settings/{base,local,production,test}.py
workers/
docs/
tests/
```

## Naming

- Models: singular PascalCase (`Organization`)
- Tables: plural snake_case (`organizations`)
- Services: `<Domain>Service`
- Permissions: `<resource>:<action>` (`org:update`)

## Imports

- Prefer absolute imports (`apps.*`)
- API layer must not import other domains' API modules

## Testing

- Real DB tests (SQLite in CI/dev unit runs)
- No placeholder assertions
- Cover auth, tenant isolation, permissions, org/workspace APIs

## Documentation

- Architecture docs updated when cross-cutting contracts change
- OpenAPI via drf-spectacular at `/api/schema/`
