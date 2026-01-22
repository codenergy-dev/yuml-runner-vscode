import * as vscode from "vscode"
import { workflows } from "../workflows"
import { YumlFunctionCompletionProvider } from "../providers/yuml-function-completion-provider"
import { YumlImportCompletionProvider } from "../providers/yuml-import-completion-provider"

export interface ExtensionContext {
  context: vscode.ExtensionContext
}

export function activate({ context }: ExtensionContext) {
  workflows.events.on('watch', (pipeline) => {
    if (pipeline.workflow == 'yuml') {
      context.subscriptions.push(YumlImportCompletionProvider)
      context.subscriptions.push(YumlFunctionCompletionProvider)
    }
  })
  return true
}