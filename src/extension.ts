import * as vscode from 'vscode';
import { parseManifestPermissions, checkPermissionUsage } from './permissionCheck';
import { recordHit } from './reviewPrompt';

let diagnostics: vscode.DiagnosticCollection;

function lineOfPermission(manifestText: string, permission: string): number {
  const lines = manifestText.split('\n');
  const index = lines.findIndex((line) => line.includes(permission));
  return index === -1 ? 0 : index;
}

async function refreshWorkspace(context: vscode.ExtensionContext): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) return;

  const manifests = await vscode.workspace.findFiles('**/AndroidManifest.xml', '**/{build,node_modules}/**', 5);
  const manifestUri = manifests[0];
  diagnostics.clear();
  if (!manifestUri) return;

  let manifestText: string;
  try {
    manifestText = Buffer.from(await vscode.workspace.fs.readFile(manifestUri)).toString('utf8');
  } catch {
    return;
  }

  const permissions = parseManifestPermissions(manifestText);
  if (permissions.length === 0) return;

  const sourceFiles = await vscode.workspace.findFiles('**/*.{kt,java}', '**/{build,node_modules,.gradle}/**', 10000);
  const sourceTexts: string[] = [];
  for (const uri of sourceFiles) {
    try {
      sourceTexts.push(Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8'));
    } catch {
      // unreadable -- skip
    }
  }

  const results = checkPermissionUsage(permissions, sourceTexts);
  const unused = results.filter((r) => r.status === 'unused');
  if (unused.length === 0) return;

  const diags = unused.map((result) => {
    const line = lineOfPermission(manifestText, result.permission);
    const range = new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER);
    const diagnostic = new vscode.Diagnostic(
      range,
      `"${result.permission}" is declared but no known API for it appears anywhere in your Kotlin/Java source -- possibly unused.`,
      vscode.DiagnosticSeverity.Information,
    );
    diagnostic.source = 'Android Unused Permission Companion';
    recordHit(context, `${manifestUri.toString()}:${line}`);
    return diagnostic;
  });
  diagnostics.set(manifestUri, diags);
}

export function activate(context: vscode.ExtensionContext): void {
  diagnostics = vscode.languages.createDiagnosticCollection('androidUnusedPermissionCompanion');
  context.subscriptions.push(diagnostics);

  void refreshWorkspace(context);

  const watcher = vscode.workspace.createFileSystemWatcher('**/{AndroidManifest.xml,*.kt,*.java}');
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(() => void refreshWorkspace(context)),
    watcher.onDidCreate(() => void refreshWorkspace(context)),
    watcher.onDidDelete(() => void refreshWorkspace(context)),
    vscode.commands.registerCommand('androidUnusedPermissionCompanion.rescan', () => void refreshWorkspace(context)),
  );
}

export function deactivate(): void {
  diagnostics?.dispose();
}
