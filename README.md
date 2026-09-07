# Android Unused Permission Companion (VS Code)

Flags a permission declared in `AndroidManifest.xml` that no Kotlin/
Java source actually uses — the inverse of existing permission-adder
extensions. No data leaves your editor.

**v0.1, new niche.** Not a port from the Gap Hunter Labs IntelliJ-
family catalog. Evidence: confirmed — existing extensions (`Android
Permissions Helper`, `Android Manifest Snippets`) only **add**
permissions to `AndroidManifest.xml`; none detects one that's
declared but never actually used.

## What it does

Reads every `<uses-permission>` in `AndroidManifest.xml`, checks a
curated permission→API map (`ACCESS_FINE_LOCATION` →
`FusedLocationProviderClient`/`LocationManager`, `CAMERA` →
`CameraX`/`Camera2`, `RECORD_AUDIO` → `MediaRecorder`/`AudioRecord`,
and 18 more) against every `.kt`/`.java` file in the workspace, and
flags a permission whose signal never appears anywhere.

**v0.1 scope, honestly noted:** name/text-based matching, not real
symbol resolution — an API called through reflection or a third-party
SDK wrapper won't be recognized. A permission not in the curated map
is reported as "can't evaluate" and **never** flagged as unused —
false negatives are the deliberate trade-off, never a false positive
telling you to remove a permission you actually need.

## Privacy

See [PRIVACY.md](PRIVACY.md) — zero network calls, everything runs
against files already in your workspace.

## Development

```bash
npm install
npm run compile   # or: npm run watch
npm test
```

To build an installable package without publishing:

```bash
npx @vscode/vsce package
```

## License

Apache License 2.0 — see [LICENSE](LICENSE).
