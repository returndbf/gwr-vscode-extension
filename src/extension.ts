
import * as vscode from 'vscode';
import { printLog } from './genWeekReport';

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand('gwr', () =>printLog(context));

	context.subscriptions.push(disposable);
}


export function deactivate() {}
