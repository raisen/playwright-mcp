/**
 * Test script for remote Playwright MCP server
 * Tests connection, tool listing, and basic browser automation
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { ProxyAgent } from 'undici';

const MCP_URL = process.argv[2] || 'https://playwright-mcp-pgjk.onrender.com/mcp';

// Setup proxy if needed
const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;
let fetchImpl;
if (proxyUrl) {
  console.log('Using proxy for connections');
  const dispatcher = new ProxyAgent(proxyUrl);
  fetchImpl = (url, opts = {}) => fetch(url, { ...opts, dispatcher });
}

async function createClient(url) {
  const client = new Client({ name: 'test-remote', version: '1.0.0' });

  // Try StreamableHTTP first, fall back to SSE
  try {
    console.log(`Connecting via StreamableHTTP to ${url}...`);
    const transportOpts = { url: new URL(url) };
    if (fetchImpl) transportOpts.fetch = fetchImpl;
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      fetch: fetchImpl,
    });
    await client.connect(transport);
    console.log('Connected via StreamableHTTP');
    return client;
  } catch (e) {
    console.log(`StreamableHTTP failed: ${e.message}`);
    console.log('Trying SSE transport...');
    const sseUrl = url.replace('/mcp', '/sse');
    const transport = new SSEClientTransport(new URL(sseUrl), {
      fetch: fetchImpl,
    });
    await client.connect(transport);
    console.log('Connected via SSE');
    return client;
  }
}

async function main() {
  console.log('=== Playwright MCP Remote Server Test ===\n');

  // Step 1: Connect
  const client = await createClient(MCP_URL);

  // Step 2: Ping
  console.log('\n--- Ping ---');
  await client.ping();
  console.log('Ping: OK');

  // Step 3: List tools
  console.log('\n--- Available Tools ---');
  const { tools } = await client.listTools();
  console.log(`Found ${tools.length} tools:`);
  for (const tool of tools) {
    console.log(`  - ${tool.name}: ${tool.description?.slice(0, 60)}`);
  }

  // Step 4: Test browser_navigate
  console.log('\n--- Test: browser_navigate ---');
  const navResult = await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://example.com' }
  });
  console.log('Navigate result:');
  console.log(navResult.content[0].text.slice(0, 500));

  // Step 5: Test browser_snapshot
  console.log('\n--- Test: browser_snapshot ---');
  const snapResult = await client.callTool({
    name: 'browser_snapshot',
    arguments: {}
  });
  console.log('Snapshot result:');
  console.log(snapResult.content[0].text.slice(0, 500));

  // Step 6: Test browser_tabs (list)
  console.log('\n--- Test: browser_tabs ---');
  const tabsResult = await client.callTool({
    name: 'browser_tabs',
    arguments: { action: 'list' }
  });
  console.log('Tabs result:');
  console.log(tabsResult.content[0].text.slice(0, 500));

  // Step 7: Test browser_click
  console.log('\n--- Test: browser_click ---');
  const clickResult = await client.callTool({
    name: 'browser_click',
    arguments: { element: 'Learn more', ref: 'e6' }
  });
  console.log('Click result:');
  console.log(clickResult.content[0].text.slice(0, 500));

  // Step 8: Test browser_navigate_back
  console.log('\n--- Test: browser_navigate_back ---');
  const backResult = await client.callTool({
    name: 'browser_navigate_back',
    arguments: {}
  });
  console.log('Back result:');
  console.log(backResult.content[0].text.slice(0, 500));

  // Step 9: Test browser_evaluate
  console.log('\n--- Test: browser_evaluate ---');
  const evalResult = await client.callTool({
    name: 'browser_evaluate',
    arguments: { function: 'document.title' }
  });
  console.log('Evaluate result:');
  console.log(evalResult.content[0].text.slice(0, 500));

  // Step 10: Close
  console.log('\n--- Closing ---');
  await client.close();
  console.log('Client closed successfully');

  console.log('\n=== All tests passed! ===');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
