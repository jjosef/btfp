import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import type { SearchResultSummary } from './search-history.service.js';

const CLASSIFICATIONS = [
  'veterinary_clinic',
  'animal_hospital',
  'university_or_research',
  'government_or_public_health',
  'other_organization',
  'likely_personal_or_unclear',
] as const;

export interface DomainClassification {
  classification: (typeof CLASSIFICATIONS)[number];
  reasoning: string;
}

export interface DomainEvidence {
  homepageText?: string | null;
  searchResults?: SearchResultSummary[] | null;
}

const MODEL_ID = process.env.BEDROCK_INFERENCE_PROFILE_ID ?? 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

function buildPrompt(domain: string, evidence?: DomainEvidence): string {
  const parts = [
    `Assess the email domain "${domain}" for someone claiming to be a veterinarian or scientist ` +
      'contributing to a pet-safety database. Classify what kind of organization it likely is, and ' +
      "in your reasoning say whether the evidence below actually supports it being a real, " +
      'established organization — or whether there\'s no independent trace of it existing.',
  ];

  parts.push(
    evidence?.homepageText
      ? `Homepage text (fetched live from the domain):\n${evidence.homepageText}`
      : "The domain's homepage couldn't be fetched (site down, blocks bots, or resolves privately).",
  );

  parts.push(
    evidence?.searchResults?.length
      ? `Independent web search results for "${domain}":\n${evidence.searchResults
          .map((r, i) => `${i + 1}. ${r.title} — ${r.snippet} (${r.link})`)
          .join('\n')}`
      : 'No independent web search results were found for this domain.',
  );

  return parts.join('\n\n');
}

/**
 * A signal for the human reviewer, not a gate — grounded in real evidence
 * (the domain's own homepage, independent search results) when available,
 * but still just an LLM's read of that evidence, not proof. If Bedrock or
 * either evidence source is unavailable, verification still proceeds
 * without that signal.
 */
@Injectable()
export class BedrockClassifierService {
  private readonly logger = new Logger(BedrockClassifierService.name);
  private readonly client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  async classifyDomain(domain: string, evidence?: DomainEvidence): Promise<DomainClassification | null> {
    try {
      const response = await this.client.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          messages: [
            {
              role: 'user',
              content: [{ text: buildPrompt(domain, evidence) }],
            },
          ],
          toolConfig: {
            tools: [
              {
                toolSpec: {
                  name: 'classify_domain',
                  description: 'Classify what kind of organization an email domain likely belongs to.',
                  inputSchema: {
                    json: {
                      type: 'object',
                      properties: {
                        classification: { type: 'string', enum: [...CLASSIFICATIONS] },
                        reasoning: {
                          type: 'string',
                          description:
                            'One or two sentences explaining the guess, referencing the homepage/search ' +
                            'evidence when it was provided, or noting its absence.',
                        },
                      },
                      required: ['classification', 'reasoning'],
                    },
                  },
                },
              },
            ],
            toolChoice: { tool: { name: 'classify_domain' } },
          },
        }),
      );

      const toolUse = response.output?.message?.content?.find((block) => block.toolUse)?.toolUse;
      const input = toolUse?.input as { classification?: string; reasoning?: string } | undefined;
      if (!input?.classification || !input.reasoning) return null;

      return {
        classification: input.classification as DomainClassification['classification'],
        reasoning: input.reasoning,
      };
    } catch (err) {
      this.logger.warn(
        `Bedrock domain classification failed for ${domain}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
