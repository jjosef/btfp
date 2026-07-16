import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { McpService } from './mcp.service.js';
import type { JsonRpcMessage } from './mcp.types.js';

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'badthingsforpets-mcp', version: '1.0.0' };

/**
 * Minimal MCP "Streamable HTTP" server: hand-rolled rather than the official
 * SDK, whose transport pulls in Express/Hono and isn't a fit for a single
 * Lambda endpoint with no server-initiated push (our tools are all plain
 * request/response, so we never need the SSE half of the spec).
 */
@Controller('mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Get()
  streamingNotSupported(@Res() reply: FastifyReply) {
    reply.status(405).send({ error: 'This MCP server has no server-initiated messages; POST only.' });
  }

  @Post()
  async handle(@Body() body: JsonRpcMessage | JsonRpcMessage[], @Res() reply: FastifyReply) {
    const isBatch = Array.isArray(body);
    const messages = isBatch ? body : [body];
    const responses = [];

    for (const message of messages) {
      // A message with no id is a notification (e.g. notifications/initialized) — no response.
      if (message.id === undefined || message.id === null) continue;

      try {
        const result = await this.dispatch(message.method, message.params ?? {});
        responses.push({ jsonrpc: '2.0' as const, id: message.id, result });
      } catch (err) {
        responses.push({
          jsonrpc: '2.0' as const,
          id: message.id,
          error: { code: -32603, message: err instanceof Error ? err.message : 'Internal error' },
        });
      }
    }

    if (responses.length === 0) {
      reply.status(202).send();
      return;
    }

    reply.status(200).send(isBatch ? responses : responses[0]);
  }

  private async dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO };

      case 'tools/list':
        return { tools: this.mcp.listTools() };

      case 'tools/call': {
        const name = params.name;
        if (typeof name !== 'string') throw new Error('tools/call requires a name');
        const args = (params.arguments ?? {}) as Record<string, unknown>;

        try {
          const result = await this.mcp.callTool(name, args);
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (err) {
          return {
            content: [{ type: 'text', text: err instanceof Error ? err.message : 'Tool call failed' }],
            isError: true,
          };
        }
      }

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}
