# Changesets in Flux Engine ⚡

We use [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs across all `@flow.engine/*` packages in this monorepo.

## Adding a Changeset

When submitting a pull request that modifies package functionality:

```bash
bun run changeset
```

1. Select the packages affected by your changes.
2. Choose bump type:
   - `patch`: bug fixes or performance tweaks.
   - `minor`: new features, new systems, non-breaking API additions.
   - `major`: breaking API changes.
3. Provide a clear, human-readable summary of the changes for the changelog.
4. Commit the generated markdown file in `.changeset/` with your PR.
