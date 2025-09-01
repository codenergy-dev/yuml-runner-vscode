import * as fs from "fs"
import * as os from "os"
import * as path from "path"
import * as vscode from "vscode"

export async function getYumlParserAssetName() {
  const platform = os.platform()
  const arch = os.arch()
  let assetName: string

  switch (platform) {
    case "win32":
      assetName = "yuml-parser-windows.exe"
      break
    case "darwin":
      if (arch === "arm64") {
        assetName = "yuml-parser-macos" // Apple Silicon
      } else if (arch === "x64") {
        assetName = "yuml-parser-macos-intel" // Intel
      } else {
        vscode.window.showErrorMessage(`Unsupported macOS architecture: ${arch}.`)
        return
      }
      break
    case "linux":
      assetName = "yuml-parser-linux"
      break
    default:
      vscode.window.showErrorMessage(`Platform '${platform}' is not supported.`)
      return
  }

  return assetName
}

export async function downloadYumlParser(root: string) {
  const assetName = await getYumlParserAssetName()
  if (!assetName) return

  const url = `https://github.com/codenergy-dev/yuml-parser/releases/latest/download/${assetName}`
  const response = await fetch(url)

  if (!response.ok) {
    vscode.window.showErrorMessage(`Unable to download yUML parser '${assetName}'.`)
    return
  }

  const fileBuffer = Buffer.from(await response.arrayBuffer())
  const filePath = path.join(root, ".yuml", assetName)
  fs.writeFileSync(filePath, fileBuffer, { mode: 0o755 })
  
  return filePath
}

export async function runYumlParser(yumlFilePath: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) return

  const root = workspaceFolders[0].uri.fsPath
  const yumlDir = path.join(root, ".yuml")
  const yumlParserFile = await getYumlParserAssetName()
  if (!yumlParserFile) return
  
  const yumlParserPath = path.join(yumlDir, yumlParserFile)
  const { spawn } = require("child_process")
  const proc = spawn(yumlParserPath, [yumlFilePath], { cwd: root })

  proc.stdout.on("data", (data: Buffer) => {
    vscode.window.showInformationMessage(data.toString())
  })

  proc.stderr.on("data", (data: Buffer) => {
    vscode.window.showErrorMessage(data.toString())
  })
}
