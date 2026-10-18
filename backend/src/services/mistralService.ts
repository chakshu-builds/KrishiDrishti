/**
 * DEPRECATED: Mistral AI vision service has been superseded by Google Gemini API (@google/genai).
 * This module proxies all calls to GeminiService to ensure zero breaking changes for existing callers.
 */

import {
  geminiService,
  GeminiService,
  AnalysisInput,
  GeminiCropPathologyOutput,
} from './geminiService.js';

export { geminiService as mistralService, GeminiService as MistralService };
export type { AnalysisInput };
export type MistralCropPathologyOutput = GeminiCropPathologyOutput;
