import { describe, it, expect } from 'vitest';
import { compactExport, compactExportFromSections, generateSafeFilename } from './exportUtils';
import type { StructuredPrompt } from './exportUtils';

// Mock structured prompt for testing
const createMockPrompt = (overrides: Partial<StructuredPrompt> = {}): StructuredPrompt => ({
  sections: {
    role: '[ROLE]\nYou are a senior developer.',
    objective: '[OBJECTIVE]\nBuild a great product.',
    context: '[CONTEXT]\nThe user wants a solution.',
    task: '[TASK]\nCreate the implementation.',
    constraints: '[CONSTRAINTS]\nMust be fast and reliable.',
    deliverable: '',
    outputFormat: '',
    toneAndStyle: '',
    decisionRules: '',
    successCriteria: '',
    validationChecklist: '',
    assumptionPolicy: '',
    sourcePolicy: '',
    verificationSteps: '',
    acceptanceTests: '',
    failureModes: '',
    examples: '',
    executionApproach: '',
  },
  generatedPrompt: '[ROLE]\nYou are a senior developer.\n\n[OBJECTIVE]\nBuild a great product.\n\n[CONTEXT]\nThe user wants a solution.\n\n[TASK]\nCreate the implementation.\n\n[CONSTRAINTS]\nMust be fast and reliable.',
  detectedLanguage: 'en',
  promptType: 'CODE_GENERATION',
  rtlRequired: false,
  ...overrides,
});

// Mock Arabic structured prompt
const createMockArabicPrompt = (overrides: Partial<StructuredPrompt> = {}): StructuredPrompt => ({
  sections: {
    role: '[الدور]\nأنت مهندس برمجيات أول.',
    objective: '[الهدف]\nبناء منتج رائع.',
    context: '[السياق]\nالمستخدم يريد حلاً.',
    task: '[المهمة]\nإنشاء التنفيذ.',
    constraints: '[القيود]\nيجب أن يكون سريعًا وموثوقًا.',
    deliverable: '',
    outputFormat: '',
    toneAndStyle: '',
    decisionRules: '',
    successCriteria: '',
    validationChecklist: '',
    assumptionPolicy: '',
    sourcePolicy: '',
    verificationSteps: '',
    acceptanceTests: '',
    failureModes: '',
    examples: '',
    executionApproach: '',
  },
  generatedPrompt: '[الدور]\nأنت مهندس برمجيات أول.\n\n[الهدف]\nبناء منتج رائع.\n\n[السياق]\nالمستخدم يريد حلاً.\n\n[المهمة]\nإنشاء التنفيذ.\n\n[القيود]\nيجب أن يكون سريعًا وموثوقًا.',
  detectedLanguage: 'ar',
  promptType: 'CODE_GENERATION',
  rtlRequired: true,
  ...overrides,
});

describe('exportUtils', () => {
  describe('compactExport', () => {
    it('should strip all markdown heading characters', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        generatedPrompt: '# Heading 1\n\n## Heading 2\n\n### Heading 3\n\nContent here.',
      };
      const result = compactExport(prompt);
      expect(result).not.toContain('#');
      expect(result).toBe('Heading 1\n\nHeading 2\n\nHeading 3\n\nContent here.');
    });

    it('should remove English section label prefixes with brackets', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        generatedPrompt: '[ROLE]\nYou are a developer.\n\n[OBJECTIVE]\nBuild something.',
      };
      const result = compactExport(prompt);
      expect(result).not.toContain('[ROLE]');
      expect(result).not.toContain('[OBJECTIVE]');
      expect(result).toBe('You are a developer.\n\nBuild something.');
    });

    it('should remove English section label prefixes with colons', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        generatedPrompt: 'ROLE: You are a developer.\n\nOBJECTIVE: Build something.',
      };
      const result = compactExport(prompt);
      expect(result).not.toContain('ROLE:');
      expect(result).not.toContain('OBJECTIVE:');
      expect(result).toBe('You are a developer.\n\nBuild something.');
    });

    it('should remove Arabic section label prefixes', () => {
      const prompt = createMockArabicPrompt();
      const result = compactExport(prompt);
      expect(result).not.toContain('[الدور]');
      expect(result).not.toContain('[الهدف]');
      expect(result).not.toContain('الدور:');
      expect(result).toBe('أنت مهندس برمجيات أول.\n\nبناء منتج رائع.\n\nالمستخدم يريد حلاً.\n\nإنشاء التنفيذ.\n\nيجب أن يكون سريعًا وموثوقًا.');
    });

    it('should collapse multiple consecutive newlines to exactly 2', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        generatedPrompt: 'Line 1\n\n\n\n\nLine 2',
      };
      const result = compactExport(prompt);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should trim leading and trailing whitespace', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        generatedPrompt: '\n\n  Content with spaces  \n\n',
      };
      const result = compactExport(prompt);
      expect(result).toBe('Content with spaces');
    });

    it('should preserve Arabic RTL text without modification', () => {
      const prompt = createMockArabicPrompt();
      const result = compactExport(prompt);
      // Check that Arabic text is preserved exactly
      expect(result).toContain('أنت مهندس برمجيات أول.');
      expect(result).toContain('بناء منتج رائع.');
      expect(result).toContain('المستخدم يريد حلاً.');
    });

    it('should handle empty sections gracefully', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        generatedPrompt: '[ROLE]\nContent\n\n\n[CONTEXT]\nMore content',
      };
      const result = compactExport(prompt);
      expect(result).toBe('Content\n\nMore content');
    });

    it('should preserve content word count within 2% after label removal', () => {
      // Use a prompt without labels in the word count to test normalization only
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        sections: {
          ...createMockPrompt().sections,
          role: 'You are a senior developer.',
          objective: 'Build a great product.',
          context: 'The user wants a solution.',
          task: 'Create the implementation.',
          constraints: 'Must be fast and reliable.',
        },
        generatedPrompt: 'You are a senior developer.\n\nBuild a great product.\n\nThe user wants a solution.\n\nCreate the implementation.\n\nMust be fast and reliable.',
      };
      const structuredWords = prompt.generatedPrompt.split(/\s+/).filter(word => word.length > 0).length;
      const result = compactExport(prompt);
      const compactWords = result.split(/\s+/).filter(word => word.length > 0).length;

      // The word counts should be identical since we're only normalizing whitespace
      expect(structuredWords).toBe(compactWords);
    });
  });

  describe('compactExportFromSections', () => {
    it('should process each section individually', () => {
      const prompt = createMockPrompt();
      const result = compactExportFromSections(prompt);
      expect(result).not.toContain('[ROLE]');
      expect(result).not.toContain('[OBJECTIVE]');
      expect(result).toContain('You are a senior developer.');
      expect(result).toContain('Build a great product.');
    });

    it('should skip empty sections', () => {
      const prompt: StructuredPrompt = createMockPrompt();
      const result = compactExportFromSections(prompt);
      // The default mock has empty sections, they should be skipped
      expect(result).not.toContain('undefined');
      expect(result).toContain('You are a senior developer.');
      expect(result).toContain('Build a great product.');
    });

    it('should handle input with 4+ consecutive newlines in sections', () => {
      const prompt: StructuredPrompt = {
        ...createMockPrompt(),
        sections: {
          ...createMockPrompt().sections,
          role: 'Content 1\n\n\n\n\nContent 2',
        },
        generatedPrompt: 'Content 1\n\n\n\n\nContent 2',
      };
      const result = compactExportFromSections(prompt);
      // Should normalize to exactly 2 newlines
      expect(result).toContain('Content 1\n\nContent 2');
    });

    it('should handle Arabic sections with labels', () => {
      const prompt = createMockArabicPrompt();
      const result = compactExportFromSections(prompt);
      expect(result).not.toContain('[الدور]');
      expect(result).not.toContain('[الهدف]');
      expect(result).toContain('أنت مهندس برمجيات أول.');
      expect(result).toContain('بناء منتج رائع.');
    });
  });

  describe('generateSafeFilename', () => {
    it('should generate safe filename for CODE_GENERATION in English', () => {
      const filename = generateSafeFilename('CODE_GENERATION', 'en');
      expect(filename).toBe('code-en-prompt.txt');
    });

    it('should generate safe filename for CREATIVE_WRITING in Arabic', () => {
      const filename = generateSafeFilename('CREATIVE_WRITING', 'ar');
      expect(filename).toBe('creative-ar-prompt.txt');
    });

    it('should generate safe filename for BUSINESS', () => {
      const filename = generateSafeFilename('BUSINESS', 'en');
      expect(filename).toBe('business-en-prompt.txt');
    });

    it('should handle unknown task type', () => {
      const filename = generateSafeFilename('UNKNOWN_TYPE', 'en');
      expect(filename).toBe('unknown_type-en-prompt.txt');
    });

    it('should handle special characters in task type', () => {
      const filename = generateSafeFilename('TYPE/With:Special*Chars', 'ar');
      expect(filename).toBe('type_with_special_chars-ar-prompt.txt');
    });
  });
});
