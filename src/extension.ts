import * as fs from "fs"
import * as path from "path"
import * as vscode from "vscode"
import { downloadYumlParser, runYumlParser } from "./yuml-parser"
import { getYumlJson } from "./yuml-json"

export async function activate(context: vscode.ExtensionContext) {
  const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders) return
	
	const root = workspaceFolders[0].uri.fsPath
	const yumlJsonPath = path.join(root, "yuml.json")
	const yumlDir = path.join(root, ".yuml")

	if (fs.existsSync(yumlJsonPath)) {
		if (!fs.existsSync(yumlDir)) {
			fs.mkdirSync(yumlDir)
		}

		const yumlParser = await downloadYumlParser(root)
		if (!yumlParser) return
		
		watchYumlFiles()
	}
}

function watchYumlFiles() {
  const workspaceFolders = vscode.workspace.workspaceFolders
	if (!workspaceFolders) return
	
	const root = workspaceFolders[0].uri.fsPath
	const yumlJson = getYumlJson()
	if (!yumlJson) return

	const workflows = path.join(root, yumlJson.workflows)
	const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workflows, "**/*.yuml")
  )
  watcher.onDidChange(uri => runYumlParser(uri.fsPath))
  watcher.onDidCreate(uri => runYumlParser(uri.fsPath))
}
