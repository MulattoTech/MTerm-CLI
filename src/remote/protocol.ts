// SPDX-License-Identifier: MIT
// AI-Change: 2026-11-02-remote-agent (OpenAI / GPT-6 Astra Pro; self-reported)
// Modified: 2026-11-09-poll-capacity; additive bounded agent delivery admission.
// Versioned, runtime-independent broker/device contract. No filesystem logic belongs here.
export const WIRE_VERSION = 1 as const;
export const MAX_RESULT_BYTES = 262144;
export const MAX_FRAME_BYTES = 300000;
export const JOB_TIMEOUT_MS = 20000;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pathname = { type: 'string', minLength: 1, maxLength: 4096 };
const integer = (minimum: number, maximum: number, defaultValue?: number) => ({
  type: 'integer',
  minimum,
  maximum,
  ...(defaultValue === undefined ? {} : { default: defaultValue }),
});
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const schema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object' as const,
  properties,
  required,
  additionalProperties: false,
});
const searchProperties = {
  path: { ...pathname, default: '.' },
  query: { type: 'string', minLength: 1, maxLength: 256 },
  maxResults: integer(1, 200, 50),
  maxDepth: integer(0, 16, 8),
  maxVisited: integer(1, 10000, 2000),
  timeoutMs: integer(1, 5000, 2000),
};
export const READ_TOOLS = [
  {
    name: 'mterm_read_file',
    description: 'Read bounded UTF-8 text from the explicitly paired computer and trusted root.',
    inputSchema: schema({ path: pathname, offset: integer(0, 1000000, 0), length: integer(1, 1000000) }, [
      'path',
    ]),
    annotations,
  },
  {
    name: 'mterm_file_info',
    description: 'Read file or directory metadata within the paired computer’s trusted root.',
    inputSchema: schema({ path: pathname }, ['path']),
    annotations,
  },
  {
    name: 'mterm_list_directory',
    description: 'List bounded directory entries; credential metadata paths remain protected.',
    inputSchema: schema({ path: { ...pathname, default: '.' }, limit: integer(1, 500, 100) }),
    annotations,
  },
  {
    name: 'mterm_search_files',
    description: 'Search literal filenames with bounded depth, visits, results and time.',
    inputSchema: schema(searchProperties, ['query']),
    annotations,
  },
  {
    name: 'mterm_search_content',
    description: 'Search bounded UTF-8 file content; private paths, links and build trees are excluded.',
    inputSchema: schema(searchProperties, ['query']),
    annotations,
  },
] as const;
export type ReadToolName = (typeof READ_TOOLS)[number]['name'];
export interface ToolRequest {
  version: typeof WIRE_VERSION;
  requestId: string;
  deviceId: string;
  tool: string;
  arguments: Record<string, unknown>;
  /** Unix milliseconds, chosen by the broker and independently bounded by the agent. */
  deadline: number;
}
export interface McpToolResult {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: Record<string, unknown>;
  isError: boolean;
}
export interface ToolResult {
  version: typeof WIRE_VERSION;
  requestId: string;
  deviceId: string;
  result: McpToolResult;
}
export interface AgentPoll {
  requests: ToolRequest[];
  cancelled: string[];
  pollAfterMs: number;
}
export interface AgentPollRequest {
  version: typeof WIRE_VERSION;
  deviceId: string;
  /** Integer 0..4; includes cleanup/result-delivery occupancy. Omitted by legacy agents. */
  availableSlots?: number;
}
