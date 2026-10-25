# Project workflow

## Version updates

- After completing a task that changes application code, dependencies, or runtime configuration, bump the patch version once with `npm run version:patch` before handing off the work.
- Use `npm run version:minor` or `npm run version:major` instead when the user explicitly requests that release type or a specific version. Do not apply an additional patch bump.
- These commands must update `package.json`, the top-level `package-lock.json` version, and `package-lock.json`'s `packages[""].version` together. Never edit only one version field.
- Do not bump for read-only checks, build/lint/test runs, documentation-only changes, or dependency installation that only restores the existing lockfile. Do not bump again for follow-up validation of the same task.
- Do not create Git commits, tags, or releases as part of a version bump unless explicitly requested.
- Report the resulting version in the final response when a bump is made.

## Verification

- Run build and lint only when the user asks. A version bump does not authorize either command.

## Portal controls

- Use `PortalActionButton` with an icon and a visible text label for application actions. Keep labels visible on desktop and mobile, including while loading.
- Reserve icon-only buttons for compact utility controls such as close, password visibility, and row expansion. Give these controls an accessible name and tooltip where appropriate.
- Use `PortalSearchField` for portal searches. Inputs and filters must have persistent visible labels; placeholders provide examples, not labels.
- Preserve action permissions, handlers, confirmation dialogs, and submit behavior when changing presentation.
