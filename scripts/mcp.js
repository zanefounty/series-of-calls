#!/usr/bin/env node
// Series of Calls SP sandbox as an MCP server: an AI client can inspect and play the optional backbone game.
// It runs locally over stdio and loads the game from this checkout's src/ (scripts/lib/mcp-game.js); nothing is
// hosted, and the game page itself does not change. Register it with a client, for example:
//
//   claude mcp add series-of-calls-sp -- node /path/to/series-of-calls/scripts/mcp.js
//
// Protocol: JSON-RPC 2.0, one message per line on stdin and stdout (MCP stdio transport). stdout carries only
// protocol messages; anything else goes to stderr.
const readline = require('node:readline');
const { createSession, TOOLS } = require('./lib/mcp-game');
const { version } = require('../package.json');

const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const INSTRUCTIONS = `Series of Calls includes an optional cartoon backbone sandbox: POPs in cities, links between them, transit, exchanges, PNIs, and customers. A game is always loaded (a fresh On-call game in Frankfurt until you start or load another).
Read with status, network, city, find, traceroute, peering_check and hot_spots, or raw with state, results and catalog; schema is the typed contract of every action. Change things with act (arguments are checked, outcome says what happened, dryRun prices a move first), or with screen, panel and click, which show the game's own panels and windows as text with numbered buttons. Time moves only with advance. Games are seeded: the same seed and moves give the same game.
To look into a bug report: load_save with the attached save, then status, hot_spots, and advance with timings.`;

const session = createSession();
const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const response = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const validId = (id) => id !== null && (typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id)));
function schemaProblem(schema, value, path = 'arguments') {
  if (schema.enum && !schema.enum.includes(value)) return `${path} must be one of: ${schema.enum.join(', ')}.`;
  if (schema.type === 'object') {
    if (!isObject(value)) return `${path} must be an object.`;
    for (const key of schema.required || []) if (!own(value, key)) return `${path}.${key} is required.`;
    const properties = schema.properties || {};
    if (schema.additionalProperties === false) {
      const extra = Object.keys(value).find((key) => !own(properties, key));
      if (extra !== undefined) return `${path}.${extra} is not allowed.`;
    }
    for (const [key, subSchema] of Object.entries(properties)) if (own(value, key)) {
      const problem = schemaProblem(subSchema, value[key], `${path}.${key}`);
      if (problem) return problem;
    }
  } else if (schema.type === 'string') {
    if (typeof value !== 'string') return `${path} must be a string.`;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return `${path} is too long.`;
    if (schema.minLength !== undefined && value.length < schema.minLength) return `${path} is too short.`;
  } else if (schema.type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return `${path} must be a finite number.`;
    if (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum) return `${path} is outside its allowed range.`;
  } else if (schema.type === 'boolean' && typeof value !== 'boolean') return `${path} must be a boolean.`;
  return null;
}

function handle(msg) {
  if (!isObject(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcError(null, -32600, 'Invalid Request');
  if (Object.keys(msg).some((key) => !['jsonrpc', 'id', 'method', 'params'].includes(key))) return rpcError(validId(msg.id) ? msg.id : null, -32600, 'Invalid Request: unexpected request field');
  const hasId = own(msg, 'id'), id = msg.id;
  if (hasId && !validId(id)) return rpcError(null, -32600, 'Invalid Request: invalid id');
  if (hasId && msg.method.startsWith('notifications/')) return rpcError(id, -32600, 'Notifications must not include an id');
  // JSON-RPC notifications have no response; never run mutating MCP tools without a request id.
  if (!hasId) return undefined;
  if (own(msg, 'params') && !isObject(msg.params)) return rpcError(id, -32600, 'Invalid Request: params must be an object');
  const params = msg.params || {}, method = msg.method;
  switch (method) {
    case 'initialize':
      if (Object.keys(params).some((key) => !['protocolVersion', 'capabilities', 'clientInfo', '_meta'].includes(key)) || typeof params.protocolVersion !== 'string' || params.capabilities !== undefined && !isObject(params.capabilities) || params.clientInfo !== undefined && !isObject(params.clientInfo) || params._meta !== undefined && !isObject(params._meta)) return rpcError(id, -32602, 'Invalid initialize parameters');
      return response(id, {
        protocolVersion: VERSIONS.includes(params.protocolVersion) ? params.protocolVersion : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'series-of-calls-sp', title: 'Series of Calls SP expansion', version },
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      if (Object.keys(params).some((key) => key !== '_meta') || params._meta !== undefined && !isObject(params._meta)) return rpcError(id, -32602, 'Invalid ping parameters');
      return response(id, {});
    case 'tools/list': {
      if (Object.keys(params).some((key) => !['_meta', 'cursor'].includes(key)) || params._meta !== undefined && !isObject(params._meta) || params.cursor !== undefined && typeof params.cursor !== 'string') return rpcError(id, -32602, 'Invalid tools/list parameters');
      return response(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    }
    case 'tools/call': {
      if (Object.keys(params).some((key) => !['name', 'arguments', '_meta'].includes(key)) || typeof params.name !== 'string' || params.arguments !== undefined && !isObject(params.arguments) || params._meta !== undefined && !isObject(params._meta)) return rpcError(id, -32602, 'Invalid tools/call parameters');
      const tool = TOOLS.find((t) => t.name === params.name);
      if (!tool) return rpcError(id, -32602, `Unknown tool: ${params.name}`);
      const problem = schemaProblem(tool.inputSchema, params.arguments || {});
      if (problem) return response(id, { content: [{ type: 'text', text: problem }], isError: true });
      try {
        const out = tool.run(session, params.arguments || {});
        const errs = session.errors();
        return response(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 1) }], ...(errs.length ? { _meta: { pageErrors: errs.slice(-5) } } : {}) });
      } catch (e) {
        return response(id, { content: [{ type: 'text', text: String(e && e.message || e) }], isError: true });
      }
    }
    default:
      if (method && method.startsWith('notifications/')) return undefined;
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

function handleLine(line) {
  try { return handle(JSON.parse(line)); }
  catch { return rpcError(null, -32700, 'Parse error'); }
}

if (require.main === module) {
  // The game page logs nothing to stdout, but a stray console.log anywhere must not break the protocol.
  console.log = console.info = (...a) => console.error(...a);
  const rl = readline.createInterface({ input: process.stdin });
  rl.on('line', (line) => {
    if (!line.trim()) return;
    const msg = handleLine(line);
    if (msg !== undefined) send(msg);
  });
}

module.exports = { handle, handleLine, TOOLS, VERSIONS: VERSIONS.slice() };
