import * as fs from "fs"
import * as path from "path"
import ts from "typescript"
import * as vscode from 'vscode'
import { getYumlJson } from "./yuml-json"

export interface YumlFunctionArgs {
  [functionName: string]: {
    name: string,
    type: string,
  }[]
}

export function getYumlFunctionArgs(filePath: string) {
  const workspaceFolders = vscode.workspace.workspaceFolders
  if (!workspaceFolders) return
  
  const root = workspaceFolders[0].uri.fsPath
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json")
  if (!configPath) return

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root)
  const program = ts.createProgram({
    rootNames: [filePath],
    options: parsed.options,
  })
  const checker = program.getTypeChecker()

  const source = program.getSourceFile(filePath)
  if (!source) return

  const yumlFunctionArgs = {} as YumlFunctionArgs
  ts.forEachChild(source, node => {
    if (ts.isFunctionDeclaration(node) &&
        node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
      const symbol = checker.getSymbolAtLocation(node.name!)
      const functionName = symbol!.getName()
      yumlFunctionArgs[functionName] = []

      const firstParam = node.parameters[0]
      if (!firstParam) return
      
      var paramType = checker.getTypeAtLocation(firstParam)
      if (firstParam.type && ts.isTypeReferenceNode(firstParam.type)) {
        const symbol = checker.getSymbolAtLocation(firstParam.type.typeName)
        if (symbol) {
          paramType = checker.getDeclaredTypeOfSymbol(symbol)
        }
      }
      
      const properties = paramType.getProperties()
      for (const prop of properties) {
        const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!)
        const typeName = checker.typeToString(propType)

        yumlFunctionArgs[functionName].push({
          name: prop.getName(),
          type: typeName,
        })
      }
    }
  })

  return yumlFunctionArgs
}

export function getYumlFunctionArgsFromPipelines(excludeFilePaths: string[] = []): YumlFunctionArgs {
  const json = getYumlJson()
  if (!json) return {}

  const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath
  if (!root) return {}

  const pipelinesPath = path.join(root, json.pipelines)
  if (!fs.existsSync(pipelinesPath)) return {}

  const files = getAllFilesRecursive(pipelinesPath, [".ts", ".js"], excludeFilePaths)
  const result: YumlFunctionArgs = {}

  for (const file of files) {
    const fileName = path
      .relative(pipelinesPath, file)
      .replace(/\\/g, "/")
      .replace(/\.(ts|js)$/, "")

    const yumlFunctionArgs = getYumlFunctionArgs(file)
    if (yumlFunctionArgs) {
      for (const [functionName, args] of Object.entries(yumlFunctionArgs)) {
        result[`${fileName}.${functionName}`] = args
      }
    }
  }

  return result
}

function getAllFilesRecursive(dir: string, exts: string[], excludeFilePaths: string[] = [], result: string[] = []): string[] {
  if (!fs.existsSync(dir)) return result

  for (const entry of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, entry)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      getAllFilesRecursive(fullPath, exts, excludeFilePaths, result)
    } else if (exts.some(ext => fullPath.endsWith(ext)) &&
              !excludeFilePaths.includes(fullPath)) {
      result.push(fullPath)
    }
  }

  return result
}
