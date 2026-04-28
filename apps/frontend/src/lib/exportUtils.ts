/**
 * Export utilities for PromptForge
 * Handles structured and compact export modes for generated prompts
 *
 * RTL Handling Note:
 * Arabic text and RTL markers are preserved exactly as-is during transformation.
 * No characters, diacritics, or RTL markers are altered in any way.
 */

import type { PromptSectionMap, Language, PromptType } from '../types';

export type ExportMode = 'STRUCTURED' | 'COMPACT';

/**
 * Represents a structured prompt with section labels and content
 * This interface mirrors the sections from GeneratedPrompt
 */
export interface StructuredPrompt {
  sections: PromptSectionMap;
  generatedPrompt: string;
  detectedLanguage: Language;
  promptType: PromptType;
  rtlRequired: boolean;
}

/**
 * Removal configuration for section label prefixes
 * Maps common section label prefixes to their regex patterns
 */
// Section label patterns - use word boundaries and handle both bracket and colon formats
// The patterns need to work across newlines, so we use a global multiline approach
const SECTION_LABEL_PATTERNS = {
  en: [
    /(\n\n)?\[ROLE\]\s*/gi,
    /(\n\n)?\[OBJECTIVE\]\s*/gi,
    /(\n\n)?\[CONTEXT\]\s*/gi,
    /(\n\n)?\[TASK\]\s*/gi,
    /(\n\n)?\[DELIVERABLE\]\s*/gi,
    /(\n\n)?\[OUTPUT FORMAT\]\s*/gi,
    /(\n\n)?\[TONE & STYLE\]\s*/gi,
    /(\n\n)?\[DECISION RULES\]\s*/gi,
    /(\n\n)?\[SUCCESS CRITERIA\]\s*/gi,
    /(\n\n)?\[VALIDATION CHECKLIST\]\s*/gi,
    /(\n\n)?\[ASSUMPTION POLICY\]\s*/gi,
    /(\n\n)?\[SOURCE POLICY\]\s*/gi,
    /(\n\n)?\[VERIFICATION STEPS\]\s*/gi,
    /(\n\n)?\[ACCEPTANCE TESTS\]\s*/gi,
    /(\n\n)?\[CONSTRAINTS\]\s*/gi,
    /(\n\n)?\[FAILURE MODES TO AVOID\]\s*/gi,
    /(\n\n)?\[EXAMPLES\]\s*/gi,
    /(\n\n)?\[EXECUTION APPROACH\]\s*/gi,
    /(\n\n)?ROLE:\s*/gi,
    /(\n\n)?OBJECTIVE:\s*/gi,
    /(\n\n)?CONTEXT:\s*/gi,
    /(\n\n)?TASK:\s*/gi,
    /(\n\n)?DELIVERABLE:\s*/gi,
    /(\n\n)?OUTPUT FORMAT:\s*/gi,
    /(\n\n)?TONE & STYLE:\s*/gi,
    /(\n\n)?DECISION RULES:\s*/gi,
    /(\n\n)?SUCCESS CRITERIA:\s*/gi,
    /(\n\n)?VALIDATION CHECKLIST:\s*/gi,
    /(\n\n)?ASSUMPTION POLICY:\s*/gi,
    /(\n\n)?SOURCE POLICY:\s*/gi,
    /(\n\n)?VERIFICATION STEPS:\s*/gi,
    /(\n\n)?ACCEPTANCE TESTS:\s*/gi,
    /(\n\n)?CONSTRAINTS:\s*/gi,
    /(\n\n)?FAILURE MODES TO AVOID:\s*/gi,
    /(\n\n)?EXAMPLES:\s*/gi,
    /(\n\n)?EXECUTION APPROACH:\s*/gi,
  ],
  ar: [
    /(\n\n)?\[الدور\]\s*/gi,
    /(\n\n)?\[الهدف\]\s*/gi,
    /(\n\n)?\[السياق\]\s*/gi,
    /(\n\n)?\[المهمة\]\s*/gi,
    /(\n\n)?\[المخرج المطلوب\]\s*/gi,
    /(\n\n)?\[صيغة الإخراج\]\s*/gi,
    /(\n\n)?\[النبرة والأسلوب\]\s*/gi,
    /(\n\n)?\[قواعد اتخاذ القرار\]\s*/gi,
    /(\n\n)?\[معايير النجاح\]\s*/gi,
    /(\n\n)?\[قائمة التحقق\]\s*/gi,
    /(\n\n)?\[سياسة الافتراضات\]\s*/gi,
    /(\n\n)?\[سياسة المصادر\]\s*/gi,
    /(\n\n)?\[خطوات التحقق\]\s*/gi,
    /(\n\n)?\[معايير القبول\]\s*/gi,
    /(\n\n)?\[القيود\]\s*/gi,
    /(\n\n)?\[ما يجب تجنبه\]\s*/gi,
    /(\n\n)?\[أمثلة\]\s*/gi,
    /(\n\n)?\[منهج التنفيذ\]\s*/gi,
    /(\n\n)?الدور:\s*/gi,
    /(\n\n)?الهدف:\s*/gi,
    /(\n\n)?السياق:\s*/gi,
    /(\n\n)?المهمة:\s*/gi,
    /(\n\n)?المخرج المطلوب:\s*/gi,
    /(\n\n)?صيغة الإخراج:\s*/gi,
    /(\n\n)?النبرة والأسلوب:\s*/gi,
    /(\n\n)?قواعد اتخاذ القرار:\s*/gi,
    /(\n\n)?معايير النجاح:\s*/gi,
    /(\n\n)?قائمة التحقق:\s*/gi,
    /(\n\n)?سياسة الافتراضات:\s*/gi,
    /(\n\n)?سياسة المصادر:\s*/gi,
    /(\n\n)?خطوات التحقق:\s*/gi,
    /(\n\n)?معايير القبول:\s*/gi,
    /(\n\n)?القيود:\s*/gi,
    /(\n\n)?ما يجب تجنبه:\s*/gi,
    /(\n\n)?أمثلة:\s*/gi,
    /(\n\n)?منهج التنفيذ:\s*/gi,
  ],
};

/**
 * Removes markdown heading characters from a string
 * @param text - Input text potentially containing markdown headings
 * @returns Text with markdown headings stripped
 */
const stripMarkdownHeadings = (text: string): string => {
  // Remove #, ##, ### at the start of lines
  return text.replace(/^#{1,6}\s*/gm, '');
};

/**
 * Removes section label prefixes from the beginning of strings
 * @param text - Input text potentially containing section labels
 * @param language - Language of the prompt (en or ar)
 * @returns Text with section labels removed
 */
const stripSectionLabels = (text: string, language: 'en' | 'ar'): string => {
  const patterns = SECTION_LABEL_PATTERNS[language];
  let result = text;

  for (const pattern of patterns) {
    // Replace the pattern, but also clean up any captured newlines
    result = result.replace(pattern, (match, newlines) => {
      // If we captured newlines before the label, keep one newline
      // Otherwise return empty string
      return newlines ? '\n\n' : '';
    });
  }

  return result;
};

/**
 * Collapses multiple consecutive newlines to exactly 2
 * @param text - Input text with potentially excessive newlines
 * @returns Text with normalized newlines
 */
const normalizeNewlines = (text: string): string => {
  // First, replace 3+ newlines with exactly 2
  return text.replace(/\n{3,}/g, '\n\n');
};

/**
 * Generates a safe filename from task type and language
 * @param taskType - The task type (e.g., CODE_GENERATION, CREATIVE_WRITING)
 * @param language - The language code (en or ar)
 * @returns Safe filename without special characters
 */
export const generateSafeFilename = (taskType: string, language: string): string => {
  // Map task types to safe, readable names
  const taskTypeMap: Record<string, string> = {
    CREATIVE_WRITING: 'creative',
    CODE_GENERATION: 'code',
    DATA_ANALYSIS: 'analysis',
    IMAGE_GENERATION: 'image',
    TRANSLATION: 'translation',
    SUMMARIZATION: 'summary',
    QA: 'qa',
    ROLEPLAY: 'roleplay',
    RESEARCH: 'research',
    BUSINESS: 'business',
    GENERAL: 'general',
  };

  const languageMap: Record<string, string> = {
    en: 'en',
    ar: 'ar',
  };

  const safeTaskType = taskTypeMap[taskType] || taskType.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const safeLanguage = languageMap[language] || language.toLowerCase().replace(/[^a-z0-9]/g, '_');

  return `${safeTaskType}-${safeLanguage}-prompt.txt`;
};

/**
 * Converts a structured prompt to compact format
 * @param prompt - The structured prompt to convert
 * @returns Compact plain text version of the prompt
 *
 * Transformation steps:
 * 1. Strip all markdown heading characters (#, ##, ###)
 * 2. Remove section label prefixes (e.g., "ROLE:", "[OBJECTIVE]")
 * 3. Collapse 3+ consecutive newlines to exactly 2
 * 4. Trim leading/trailing whitespace from the whole output
 * 5. Join sections with single blank line separator
 *
 * RTL Handling: Arabic characters, diacritics, and RTL markers are preserved exactly.
 */
export const compactExport = (prompt: StructuredPrompt): string => {
  const { generatedPrompt, detectedLanguage } = prompt;

  // Start with the full generated prompt (which already has all sections concatenated)
  let result = generatedPrompt;

  // Step 1: Strip markdown heading characters
  result = stripMarkdownHeadings(result);

  // Step 2: Remove section label prefixes (preserve Arabic/RTL content)
  result = stripSectionLabels(result, detectedLanguage);

  // Step 3: Collapse multiple newlines
  result = normalizeNewlines(result);

  // Step 4: Trim leading/trailing whitespace
  result = result.trim();

  return result;
};

/**
 * Alternative compact export that works section-by-section
 * This handles cases where sections need individual processing
 */
export const compactExportFromSections = (prompt: StructuredPrompt): string => {
  const { sections, detectedLanguage } = prompt;

  const processedSections: string[] = [];

  for (const [key, value] of Object.entries(sections)) {
    // Skip undefined or non-string values, or empty strings
    if (typeof value !== 'string' || value.trim().length === 0) {
      continue;
    }

    // Step 1: Strip markdown headings from section content
    let sectionContent = stripMarkdownHeadings(value);

    // Step 2: Remove section label from content (if present in the value itself)
    sectionContent = stripSectionLabels(sectionContent, detectedLanguage);

    // Trim whitespace from this section
    sectionContent = sectionContent.trim();

    // Skip empty sections
    if (sectionContent.length > 0) {
      processedSections.push(sectionContent);
    }
  }

  // Join sections with exactly 2 newlines (single blank line)
  let result = processedSections.join('\n\n');

  // Normalize any remaining excessive newlines
  result = normalizeNewlines(result);

  // Final trim
  result = result.trim();

  return result;
};
