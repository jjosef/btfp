import { chromium } from '@playwright/test';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { writeFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_CONTEXT } from './app-context.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_ID = 'us.anthropic.claude-sonnet-4-6';

// Fixed set of static routes — good enough coverage for this app's small
// surface (see docs/e2e-testing.md) without needing a separate LLM call to
// decide what to crawl. /things/:id is skipped since it needs a real id.
const ROUTES = ['/', '/submit', '/moderation'];

function parseArgs(): { prompt: string; name: string } {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const prompt = get('--prompt');
  const name = get('--name');
  if (!prompt || !name) {
    console.error('Usage: pnpm generate --prompt "<flow description>" --name <kebab-case-slug>');
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    console.error('--name must be kebab-case (lowercase letters, digits, hyphens only)');
    process.exit(1);
  }
  return { prompt, name };
}

async function captureSnapshots(baseUrl: string): Promise<string> {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const parts: string[] = [];
  try {
    for (const route of ROUTES) {
      await page.goto(new URL(route, baseUrl).toString());
      const snapshot = await page.locator('body').ariaSnapshot({ mode: 'ai' });
      parts.push(`--- ${route} ---\n${snapshot}`);
    }
  } finally {
    await browser.close();
  }
  return parts.join('\n\n');
}

async function generateSpec(prompt: string, snapshots: string): Promise<string> {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  const response = await client.send(
    new ConverseCommand({
      modelId: MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [
            {
              text:
                `Write a Playwright test (TypeScript, using @playwright/test) for this user flow:\n\n` +
                `"${prompt}"\n\n` +
                `App context:\n${APP_CONTEXT}\n\n` +
                `Live accessibility snapshots of the relevant pages, captured in their current ` +
                `(logged-out, unverified) state:\n\n${snapshots}`,
            },
          ],
        },
      ],
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name: 'write_playwright_spec',
              description: 'Return the generated Playwright test file contents.',
              inputSchema: {
                json: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string',
                      description: 'Full contents of the .spec.ts file. No markdown fences, no prose.',
                    },
                  },
                  required: ['code'],
                },
              },
            },
          },
        ],
        toolChoice: { tool: { name: 'write_playwright_spec' } },
      },
    }),
  );

  const toolUse = response.output?.message?.content?.find((block) => block.toolUse)?.toolUse;
  const input = toolUse?.input as { code?: string } | undefined;
  if (!input?.code) throw new Error('Bedrock did not return generated code');
  return input.code;
}

async function main() {
  const { prompt, name } = parseArgs();
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:5173';

  console.log(`Capturing accessibility snapshots from ${baseUrl}...`);
  const snapshots = await captureSnapshots(baseUrl);

  console.log('Generating Playwright spec via Bedrock...');
  const code = await generateSpec(prompt, snapshots);

  const outDir = path.join(__dirname, '..', 'tests', 'generated');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${name}.spec.ts`);
  await writeFile(outPath, code, 'utf-8');

  console.log(`Wrote ${outPath}`);
  console.log('Review it, then run: pnpm --filter @btfp/e2e test');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
