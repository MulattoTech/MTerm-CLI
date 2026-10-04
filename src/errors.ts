// SPDX-License-Identifier: MIT
// AI-Change: 2026-10-04-local-mcp (OpenAI / GPT-6 Astra Pro; self-reported)
export class ToolError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ToolError';
  }
}
export function fail(code: string, message: string): never {
  throw new ToolError(code, message);
}
export function cancelled(signal?: AbortSignal): void {
  if (signal?.aborted) fail('CANCELLED', 'Operation cancelled.');
}
export function safeError(error: unknown): { code: string; message: string } {
  if (error instanceof ToolError) return { code: error.code, message: error.message };
  const code = (error as NodeJS.ErrnoException)?.code;
  const messages: Record<string, string> = {
    ENOENT: 'Requested path or executable was not found.',
    EACCES: 'Operating-system access was denied.',
    EPERM: 'Operating-system permission denied.',
    EEXIST: 'Destination already exists.',
    ENOTDIR: 'A path component is not a directory.',
    EISDIR: 'Expected a file, not a directory.',
    EPIPE: 'Process input is closed.',
    EXDEV: 'Cross-filesystem operation is not supported.',
  };
  if (code && Object.hasOwn(messages, code)) return { code, message: messages[code]! };
  if (error instanceof Error && error.name === 'ZodError')
    return { code: 'INVALID_ARGUMENT', message: 'Request fields or limits do not match the tool schema.' };
  return {
    code: 'INTERNAL_ERROR',
    message: 'Operation failed. No raw error body or credential material is included.',
  };
}
export function plain(text: string): string {
  return text
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f]/g, '');
}
