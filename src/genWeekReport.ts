import dayjs from "dayjs";

import path from "node:path";
import * as vscode from "vscode";


function shouldIncludeCommit(
  commit: Record<any, any>,
  authorName: string,
  startDate: number,
  endDate: number
) {
  const commitTime = dayjs.unix(commit.timestamp);

  if (authorName && commit.authorName !== authorName) {
    return false;
  }

  if (startDate && commitTime.isBefore(dayjs.unix(startDate))) {
    return false;
  }
  if (endDate && commitTime.isAfter(dayjs.unix(endDate))) {
    return false;
  }

  return true;
}
function formatMessage(message: string, commitTypes: string[], index: number) {
  commitTypes.forEach((type) => {
    const prefix = `${type}:`;
    if (message.toLowerCase().startsWith(prefix)) {
      message = message.slice(prefix.length).trim();
    }
  });

  return `${index}:${message}`;
}
export async function genWeekReport(
  data: any,
  authorName = "",
  commitTypes = [],
  startDate = dayjs().startOf("week").unix(),
  endDate = dayjs().endOf("week").unix()
) {
  const regex =
    /^(\w+)\s+(\w+)\s+([^\s]+)\s+<([^>]+)>\s+(\d+)\s+([\+\-]\d{4})\s+(.*)$/gm;
  const commits = [];
  const filePath = path.join(process.cwd(), ".git", "logs", "HEAD");
  let resTypes = [
    "feat",
    "fix",
    "refactor",
    "style",
    "docs",
    "perf",
    "test",
    "chore",
    "revert",
    "merge",
  ];
  if (commitTypes && commitTypes.length > 0) {
    resTypes = resTypes.concat(commitTypes);
  }
  try {
    let match;
    while ((match = regex.exec(data)) !== null) {
      // 避免无限循环
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      const message = match[7].replace(/^commit:\s*/, "").trim();
      const commit = {
        commitHash: match[1],
        parentCommitHash: match[2],
        authorName: match[3],
        authorEmail: match[4],
        timestamp: parseInt(match[5], 10),
        timezone: match[6],
        message: message,
      };

      // 提前过滤不符合条件的提交记录
      if (shouldIncludeCommit(commit, authorName, startDate, endDate)) {
        commits.push(commit);
      }
    }
    return commits
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((item, index) => formatMessage(item.message, resTypes, index + 1))
      .join("");
  } catch (error) {
    console.error("An error occurred,idiot:" + error);
    throw error;
  }
}

export async function printLog(context: vscode.ExtensionContext) {

  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]; // 获取第一个工作区
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder found");
    return;
  }
  const filePath = path.join(
    workspaceFolder.uri.fsPath,
    ".git",
    "logs",
    "HEAD"
  ); // 构建文件路径
  try {
    const fileUri = vscode.Uri.file(filePath);
    const data = await vscode.workspace.fs.readFile(fileUri);
    const logs = new TextDecoder().decode(data);
    const formatLogs = await genWeekReport(logs);
    await vscode.env.clipboard.writeText(formatLogs);
    vscode.window.showInformationMessage(formatLogs);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to read git log file: ${error}`);
  }
}