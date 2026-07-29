## Summary

<One or two sentences stating exactly what the PR changes.>

### Problem

<Briefly explain the concrete problem or limitation.>

### Fix

<Explain the implemented solution in direct terms.>

- <Important implementation fact>
- <Important implementation fact>
- <Important implementation fact>

### Automatic migration

<Include only when existing user data or state is migrated automatically.>

1. <Migration step>
2. <Migration step>
3. <Migration step>

<State the compatibility and preservation result.>

### Key compatibility

<Include only when key names, formats, platform restrictions, schemas,
or legacy identifiers materially affect the implementation.>

- Legacy value: `<value>`
- New value: `<value>`

<Explain why both exist or why compatibility handling is required.>

### Unchanged

- <Relevant behavior intentionally unchanged>
- <Relevant behavior intentionally unchanged>
- <Explicitly out-of-scope behavior, when useful>

## Test Plan

- [x] <Test category>
  - `<command or result>`
  - <Important coverage detail>

- [x] <Static verification category>
  - `<command>`
  - `<command>`
