import type {
  BuildInput,
  BuiltPrompt,
  PromptFramework,
  PromptSections,
  PromptTypeValue,
  SupportedLanguage,
  TargetAIValue
} from "../types/index.js";

import { countWords, estimateTokens } from "./tokenCounter.js";
import { langService } from "./langService.js";

interface KeywordClassifier<TValue extends string> {
  value: TValue;
  keywords: string[];
}

const PROMPT_TYPE_RULES: KeywordClassifier<PromptTypeValue>[] = [
  {
    value: "CODE_GENERATION",
    keywords: [
      "code",
      "app",
      "function",
      "api",
      "bug",
      "script",
      "refactor",
      "build",
      "debug",
      "تطبيق",
      "موقع",
      "منصة",
      "react",
      "كود",
      "شفرة",
      "راجع",
      "يراجع",
      "مراجعة",
      "حسن",
      "حسّن",
      "يحسن",
      "يحسّن",
      "إصلاح",
      "اصلاح",
      "برمج",
      "طوّر",
      "طور"
    ]
  },
  {
    value: "DATA_ANALYSIS",
    keywords: ["data", "analysis", "dashboard", "sql", "metrics", "spreadsheet", "csv"]
  },
  {
    value: "IMAGE_GENERATION",
    keywords: [
      "image",
      "poster",
      "logo",
      "illustration",
      "midjourney",
      "dall-e",
      "render",
      "صورة",
      "بوستر",
      "ملصق",
      "شعار",
      "رسم",
      "تصميم بصري",
      "تصميم مرئي"
    ]
  },
  {
    value: "TRANSLATION",
    keywords: ["translate", "translation", "ترجم", "ترجمة"]
  },
  {
    value: "SUMMARIZATION",
    keywords: ["summarize", "summary", "تلخيص", "summarise"]
  },
  {
    value: "QA",
    keywords: ["question", "answer", "faq", "qa", "explain", "وضح"]
  },
  {
    value: "ROLEPLAY",
    keywords: ["roleplay", "act as", "pretend", "simulate", "قم بدور"]
  },
  {
    value: "RESEARCH",
    keywords: [
      "research",
      "study",
      "literature",
      "investigate",
      "analyze trends",
      "ابحث",
      "بحث",
      "دراسة",
      "ادرس",
      "أدرس",
      "تحقيق",
      "حقق",
      "حقّق",
      "قيّم",
      "قيم",
      "تقييم"
    ]
  },
  {
    value: "BUSINESS",
    keywords: [
      "business",
      "marketing",
      "strategy",
      "pricing",
      "pricing model",
      "positioning",
      "offer",
      "go-to-market",
      "proposal",
      "sales",
      "pitch",
      "email",
      "consulting",
      "service description",
      "landing page",
      "marketing plan",
      "digital marketing",
      "تسعير",
      "نموذج تسعير",
      "تموضع",
      "عرض قيمة",
      "عرض",
      "رسائل",
      "تسويق",
      "التسويق",
      "خطة تسويقية",
      "خدمة استشارية",
      "استشارية",
      "استشاري",
      "وصفاً احترافياً",
      "وصف احترافي",
      "عرض خدمات",
      "مبيعات",
      "مقترح"
    ]
  },
  {
    value: "CREATIVE_WRITING",
    keywords: [
      "story",
      "blog",
      "poem",
      "creative",
      "novel",
      "article",
      "write a post",
      "قصة",
      "قصيدة",
      "رواية",
      "مقال",
      "مقالة",
      "مدونة",
      "منشور",
      "اكتب قصة",
      "اكتب مقالا",
      "اكتب مقالاً"
    ]
  }
];

const DOMAIN_RULES: KeywordClassifier<string>[] = [
  {
    value: "technology",
    keywords: ["software", "code", "app", "api", "saas", "cloud", "ai", "تقنية", "برمج", "كود", "شفرة", "تطبيق"]
  },
  {
    value: "marketing",
    keywords: [
      "marketing",
      "campaign",
      "seo",
      "brand",
      "audience",
      "launch",
      "positioning",
      "تسويق",
      "التسويق",
      "حملة",
      "علامة تجارية",
      "علامة",
      "جمهور",
      "إطلاق",
      "اطلاق",
      "تموضع"
    ]
  },
  {
    value: "education",
    keywords: ["course", "student", "lesson", "education", "curriculum", "تعليم", "طالب", "طلاب", "درس", "منهج"]
  },
  {
    value: "business",
    keywords: ["business", "strategy", "startup", "sales", "revenue", "أعمال", "اعمال", "استراتيجية", "مبيعات", "شركة"]
  },
  {
    value: "healthcare",
    keywords: ["health", "medical", "doctor", "patient", "medicine", "صحة", "طبي", "طبيب", "مريض", "طب"]
  },
  {
    value: "finance",
    keywords: ["finance", "investment", "budget", "bank", "pricing", "مالية", "استثمار", "ميزانية", "بنك", "تسعير"]
  },
  {
    value: "design",
    keywords: ["design", "visual", "branding", "ux", "ui", "logo", "تصميم", "مرئي", "هوية", "واجهة", "شعار"]
  }
];

const TARGET_AI_RULES: KeywordClassifier<TargetAIValue>[] = [
  { value: "MIDJOURNEY", keywords: ["midjourney"] },
  { value: "DALL_E", keywords: ["dall-e", "dall e"] },
  { value: "STABLE_DIFFUSION", keywords: ["stable diffusion"] },
  { value: "CHATGPT", keywords: ["chatgpt"] },
  { value: "CLAUDE", keywords: ["claude"] },
  { value: "GEMINI", keywords: ["gemini"] },
  { value: "COPILOT", keywords: ["copilot", "github copilot"] }
];

const IMAGE_TARGETS: TargetAIValue[] = ["MIDJOURNEY", "DALL_E", "STABLE_DIFFUSION"];

const OUTPUT_FORMAT_RULES: KeywordClassifier<string>[] = [
  { value: "a markdown table", keywords: ["table", "comparison table"] },
  { value: "a structured JSON object", keywords: ["json", "schema"] },
  { value: "bullet points", keywords: ["bullet", "list", "steps"] },
  { value: "a concise email", keywords: ["email", "reply", "outreach"] },
  { value: "production-ready code", keywords: ["code", "function", "component", "api"] },
  { value: "a polished article", keywords: ["article", "blog", "post", "essay"] },
  { value: "an image-generation prompt", keywords: ["image", "poster", "illustration", "logo"] }
];

const PRODUCT_BUILD_KEYWORDS = [
  "app",
  "application",
  "mobile app",
  "web app",
  "website",
  "platform",
  "dashboard",
  "tool",
  "system",
  "portal",
  "marketplace",
  "saas",
  "تطبيق",
  "منصة",
  "موقع",
  "نظام",
  "لوحة تحكم",
  "بوابة"
];

const PRODUCT_BUILD_INTENT_KEYWORDS = [
  "build",
  "create",
  "design",
  "develop",
  "ship",
  "scaffold",
  "architect",
  "implement",
  "construct",
  "make",
  "ابن",
  "ابني",
  "أنشئ",
  "انشئ",
  "صمم",
  "صمّم",
  "طوّر",
  "طور",
  "بناء",
  "إنشاء",
  "انشاء",
  "تطوير"
];

const EXISTING_CODE_WORK_KEYWORDS = [
  "refactor",
  "debug",
  "fix",
  "optimize",
  "optimise",
  "review",
  "maintain",
  "rewrite",
  "extend",
  "component",
  "endpoint",
  "bug",
  "test",
  "tests",
  "performance",
  "accessibility",
  "react",
  "typescript",
  "javascript",
  "api",
  "sdk",
  "كود",
  "شفرة",
  "راجع",
  "يراجع",
  "مراجعة",
  "حسن",
  "حسّن",
  "يحسن",
  "يحسّن",
  "الأداء",
  "اداء",
  "إمكانية الوصول",
  "امكانية الوصول",
  "مكون",
  "مكوّن",
  "واجهة",
  "اختبار",
  "اختبارات",
  "تصحيح",
  "إصلاح",
  "اصلاح"
];

const CHILD_LEARNING_KEYWORDS = [
  "kid",
  "kids",
  "child",
  "children",
  "teach",
  "teaching",
  "learn",
  "learning",
  "lesson",
  "lessons",
  "school",
  "student",
  "students",
  "word",
  "words",
  "vocabulary",
  "phonics",
  "flashcard",
  "flashcards",
  "game",
  "games",
  "طفل",
  "أطفال",
  "اطفال",
  "صغار",
  "تعليم",
  "تعلم",
  "تعلّم",
  "كلمات",
  "كلمة",
  "مفردات",
  "مدرسة",
  "طلاب",
  "طالب"
];

const FINANCE_INTENT_KEYWORDS = [
  "pricing",
  "price",
  "pricing model",
  "monetization",
  "revenue model",
  "budget",
  "cost",
  "finance",
  "financial",
  "تسعير",
  "نموذج تسعير",
  "سعر",
  "سعري",
  "أسعار",
  "اسعار",
  "إيرادات",
  "ايرادات",
  "تكلفة",
  "مالية"
];

const SECTION_LABELS: Record<SupportedLanguage, Record<keyof PromptSections, string>> = {
  en: {
    role: "ROLE",
    objective: "OBJECTIVE",
    context: "CONTEXT",
    task: "TASK",
    deliverable: "DELIVERABLE",
    outputFormat: "OUTPUT FORMAT",
    toneAndStyle: "TONE & STYLE",
    decisionRules: "DECISION RULES",
    responseBudget: "RESPONSE BUDGET",
    successCriteria: "SUCCESS CRITERIA",
    validationChecklist: "VALIDATION CHECKLIST",
    assumptionPolicy: "ASSUMPTION POLICY",
    sourcePolicy: "SOURCE POLICY",
    verificationSteps: "VERIFICATION STEPS",
    acceptanceTests: "ACCEPTANCE TESTS",
    constraints: "CONSTRAINTS",
    failureModes: "FAILURE MODES TO AVOID",
    examples: "EXAMPLES",
    executionApproach: "EXECUTION APPROACH"
  },
  ar: {
    role: "الدور",
    objective: "الهدف",
    context: "السياق",
    task: "المهمة",
    deliverable: "المخرج المطلوب",
    outputFormat: "صيغة الإخراج",
    toneAndStyle: "النبرة والأسلوب",
    decisionRules: "قواعد اتخاذ القرار",
    responseBudget: "ميزانية الاستجابة",
    successCriteria: "معايير النجاح",
    validationChecklist: "قائمة التحقق",
    assumptionPolicy: "سياسة الافتراضات",
    sourcePolicy: "سياسة المصادر",
    verificationSteps: "خطوات التحقق",
    acceptanceTests: "معايير القبول",
    constraints: "القيود",
    failureModes: "ما يجب تجنبه",
    examples: "أمثلة",
    executionApproach: "منهج التنفيذ"
  }
};

const normalize = (value: string): string => value.toLowerCase();

const matchByKeywords = <TValue extends string>(
  input: string,
  rules: KeywordClassifier<TValue>[]
): TValue | null => {
  const normalized = normalize(input);
  const match = rules.find((rule) =>
    rule.keywords.some((keyword) => normalized.includes(keyword))
  );

  return match?.value ?? null;
};

const toSentenceCase = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export class PromptBuilder {
  public build(input: BuildInput): BuiltPrompt {
    const detectedLanguage = langService.detectLanguage(
      input.rawInput,
      input.preferredLanguage ?? "en"
    );
    const targetAI = input.targetAI ?? this.detectTargetAI(input.rawInput);
    const promptType = input.promptType ?? this.detectPromptType(input.rawInput, targetAI);
    const isProductBuild = this.isProductBuildRequest(input.rawInput, promptType);
    const tone = input.tone
      ? this.resolveToneSelection(input.tone, input.rawInput, promptType, detectedLanguage)
      : this.detectTone(input.rawInput, promptType, detectedLanguage);
    const domain = this.detectDomain(input.rawInput, promptType, detectedLanguage);
    const outputFormat = this.detectOutputFormat(input.rawInput, promptType, targetAI, detectedLanguage);
    const framework = this.selectFramework({
      rawInput: input.rawInput,
      promptType,
      targetAI,
      includeExamples: input.includeExamples ?? false,
      includeChainOfThought: input.includeChainOfThought ?? false
    });
    const tags = this.buildTags(promptType, domain, tone, targetAI, detectedLanguage);
    const rtlRequired = detectedLanguage === "ar";
    const sections = this.buildSections({
      rawInput: input.rawInput,
      detectedLanguage,
      promptType,
      targetAI,
      tone,
      domain,
      outputFormat,
      framework,
      includeExamples: input.includeExamples ?? false,
      includeChainOfThought: input.includeChainOfThought ?? false
    });
    const generatedPrompt = this.formatPrompt(
      sections,
      detectedLanguage,
      targetAI,
      promptType,
      framework,
      isProductBuild
    );
    const improvementTips = this.buildImprovementTips(detectedLanguage, promptType, targetAI);

    return {
      generatedPrompt,
      framework,
      promptType,
      targetAI,
      tone,
      domain,
      tags,
      wordCount: countWords(generatedPrompt),
      estimatedTokens: estimateTokens(generatedPrompt),
      rtlRequired,
      targetAISuggestion: targetAI,
      improvementTips,
      sections,
      detectedLanguage,
      outputFormat
    };
  }

  private detectTargetAI(rawInput: string): TargetAIValue {
    return matchByKeywords(rawInput, TARGET_AI_RULES) ?? "GENERAL";
  }

  private detectPromptType(rawInput: string, targetAI: TargetAIValue): PromptTypeValue {
    if (IMAGE_TARGETS.includes(targetAI)) {
      return "IMAGE_GENERATION";
    }

    return matchByKeywords(rawInput, PROMPT_TYPE_RULES) ?? "GENERAL";
  }

  private detectDomain(
    rawInput: string,
    promptType: PromptTypeValue,
    language: SupportedLanguage
  ): string {
    if (this.isChildLearningRequest(rawInput)) {
      return language === "ar" ? "تقنية التعليم" : "education technology";
    }

    if (
      ["BUSINESS", "RESEARCH", "GENERAL"].includes(promptType) &&
      FINANCE_INTENT_KEYWORDS.some((keyword) => normalize(rawInput).includes(keyword))
    ) {
      return this.localizeDomain("finance", language);
    }

    const domain = matchByKeywords(rawInput, DOMAIN_RULES);

    if (domain) {
      return this.localizeDomain(domain, language);
    }

    if (promptType === "CODE_GENERATION") {
      return language === "ar" ? "التقنية" : "technology";
    }

    if (promptType === "BUSINESS") {
      return language === "ar" ? "الأعمال" : "business";
    }

    if (promptType === "IMAGE_GENERATION") {
      return language === "ar" ? "التصميم المرئي" : "visual design";
    }

    return language === "ar" ? "عام" : "general";
  }

  private localizeDomain(domain: string, language: SupportedLanguage): string {
    if (language !== "ar") {
      return domain;
    }

    const arabicDomains: Record<string, string> = {
      technology: "التقنية",
      marketing: "التسويق",
      education: "التعليم",
      business: "الأعمال",
      healthcare: "الرعاية الصحية",
      finance: "المالية",
      design: "التصميم"
    };

    return arabicDomains[domain] ?? domain;
  }

  private detectTone(
    rawInput: string,
    promptType: PromptTypeValue,
    language: SupportedLanguage
  ): string {
    const normalized = normalize(rawInput);

    if (normalized.includes("formal") || normalized.includes("professional")) {
      return language === "ar" ? "مهنية ورسمية" : "professional and precise";
    }

    if (normalized.includes("fun") || normalized.includes("casual")) {
      return language === "ar" ? "ودودة وخفيفة" : "casual and approachable";
    }

    if (this.isProductBuildRequest(rawInput, promptType)) {
      return language === "ar"
        ? "احترافية وعملية ومناسبة للفئة المستهدفة"
        : "professional, implementation-ready, and audience-aware";
    }

    if (promptType === "CODE_GENERATION" || promptType === "DATA_ANALYSIS") {
      return language === "ar" ? "تقنية ودقيقة" : "technical and exact";
    }

    if (promptType === "CREATIVE_WRITING") {
      return language === "ar" ? "إبداعية وحيوية" : "creative and vivid";
    }

    if (promptType === "BUSINESS") {
      return language === "ar" ? "احترافية ومقنعة" : "persuasive and executive";
    }

    return language === "ar" ? "واضحة ومتوازنة" : "clear and balanced";
  }

  private resolveToneSelection(
    selectedTone: string,
    rawInput: string,
    promptType: PromptTypeValue,
    language: SupportedLanguage
  ): string {
    const normalized = normalize(selectedTone);

    if (normalized === "professional") {
      if (this.isProductBuildRequest(rawInput, promptType)) {
        return language === "ar"
          ? "احترافية وعملية ومناسبة للفئة المستهدفة"
          : "professional, implementation-ready, and audience-aware";
      }

      return language === "ar" ? "مهنية ورسمية" : "professional and precise";
    }

    if (normalized === "casual") {
      return language === "ar" ? "ودودة وخفيفة" : "casual and approachable";
    }

    if (normalized === "academic") {
      return language === "ar" ? "أكاديمية ومنهجية" : "academic and rigorous";
    }

    if (normalized === "creative") {
      return language === "ar" ? "إبداعية وحيوية" : "creative and vivid";
    }

    if (normalized === "persuasive") {
      return language === "ar" ? "احترافية ومقنعة" : "persuasive and executive";
    }

    if (normalized === "technical") {
      return language === "ar" ? "تقنية ودقيقة" : "technical and exact";
    }

    return selectedTone;
  }

  private detectOutputFormat(
    rawInput: string,
    promptType: PromptTypeValue,
    targetAI: TargetAIValue,
    language: SupportedLanguage
  ): string {
    if (IMAGE_TARGETS.includes(targetAI) || promptType === "IMAGE_GENERATION") {
      return language === "ar"
        ? "وصف بصري منظم يتضمن الموضوع والأسلوب والإضاءة والتكوين والنسبة السِّينمائية"
        : "a structured visual prompt with subject, style, lighting, composition, and aspect ratio";
    }

    if (this.isProductBuildRequest(rawInput, promptType)) {
      if (this.isChildLearningRequest(rawInput)) {
        return language === "ar"
          ? "استجابة منظمة بهذه الأقسام: الهدف من المنتج، المستخدمون المستهدفون، الافتراضات، الميزات الأساسية، تجربة التعلّم، السلامة وإمكانية الوصول والخصوصية، هيكل الشاشات وتجربة الاستخدام، التقنية المقترحة، معمارية النظام، نموذج البيانات، تصميم الواجهات البرمجية، خطة تسليم النسخة الأولى، التحسينات المستقبلية، ومقاييس النجاح"
          : "a structured implementation brief with these exact sections: Product Goal, Target Users, Assumptions, Core Features, Learning Experience, Safety, Accessibility, and Privacy, UX and Screen Structure, Recommended Tech Stack, System Architecture, Data Model, API Design, MVP Delivery Plan, Future Enhancements, Success Metrics";
      }

      return language === "ar"
        ? "استجابة منظمة بهذه الأقسام: الهدف من المنتج، المستخدمون المستهدفون، الافتراضات، الميزات الأساسية، مسارات المستخدم، هيكل الشاشات وتجربة الاستخدام، الأمان والخصوصية، التقنية المقترحة، معمارية النظام، نموذج البيانات، تصميم الواجهات البرمجية، خطة تسليم النسخة الأولى، التحسينات المستقبلية، ومقاييس النجاح"
        : "a structured implementation brief with these exact sections: Product Goal, Target Users, Assumptions, Core Features, User Journeys, UX and Screen Structure, Security and Privacy, Recommended Tech Stack, System Architecture, Data Model, API Design, MVP Delivery Plan, Future Enhancements, Success Metrics";
    }

    const detected = matchByKeywords(rawInput, OUTPUT_FORMAT_RULES);

    if (detected) {
      return detected;
    }

    if (promptType === "CODE_GENERATION") {
      return language === "ar"
        ? "حل منظم يتضمن كوداً مشروحاً وخطوات تنفيذ واختبارات"
        : "a complete solution with code, implementation notes, and verification steps";
    }

    if (promptType === "BUSINESS") {
      return language === "ar"
        ? "مخرجات منظمة بعناوين واضحة وخطوات عملية"
        : "a business-ready deliverable with clear headings and action steps";
    }

    return language === "ar"
      ? "استجابة منظمة بعناوين فرعية ونقاط واضحة"
      : "a structured response with clear sections and concise bullets";
  }

  private selectFramework(input: {
    rawInput: string;
    promptType: PromptTypeValue;
    targetAI: TargetAIValue;
    includeExamples: boolean;
    includeChainOfThought: boolean;
  }): PromptFramework {
    if (input.includeExamples) {
      return "FEW_SHOT";
    }

    if (input.includeChainOfThought || input.promptType === "DATA_ANALYSIS" || input.promptType === "RESEARCH") {
      return "CHAIN_OF_THOUGHT";
    }

    if (
      IMAGE_TARGETS.includes(input.targetAI) ||
      input.promptType === "IMAGE_GENERATION" ||
      input.promptType === "CREATIVE_WRITING"
    ) {
      return "TRACE";
    }

    if (input.promptType === "BUSINESS") {
      return "CARE";
    }

    if (
      countWords(input.rawInput) > 15 ||
      normalize(input.rawInput).includes("step by step") ||
      normalize(input.rawInput).includes("workflow")
    ) {
      return "RISEN";
    }

    if (input.promptType === "CODE_GENERATION") {
      return "COAST";
    }

    return "RTF";
  }

  private buildTags(
    promptType: PromptTypeValue,
    domain: string,
    tone: string,
    targetAI: TargetAIValue,
    language: SupportedLanguage
  ): string[] {
    return Array.from(
      new Set([
        promptType.toLowerCase(),
        domain.toLowerCase().replace(/\s+/gu, "-"),
        tone.toLowerCase().replace(/\s+/gu, "-"),
        targetAI.toLowerCase(),
        language === "ar" ? "rtl" : "ltr"
      ])
    );
  }

  private buildSections(input: {
    rawInput: string;
    detectedLanguage: SupportedLanguage;
    promptType: PromptTypeValue;
    targetAI: TargetAIValue;
    tone: string;
    domain: string;
    outputFormat: string;
    framework: PromptFramework;
    includeExamples: boolean;
    includeChainOfThought: boolean;
  }): PromptSections {
    const isArabic = input.detectedLanguage === "ar";
    const isProductBuild = this.isProductBuildRequest(input.rawInput, input.promptType);
    const isChildLearning = this.isChildLearningRequest(input.rawInput);
    const role = isProductBuild
      ? isArabic
        ? this.buildArabicProductRole(isChildLearning)
        : this.buildEnglishProductRole(isChildLearning)
      : isArabic
        ? this.buildArabicRole(input.promptType, input.domain)
        : this.buildEnglishRole(input.promptType, input.domain);
    const objective = isProductBuild
      ? isArabic
        ? this.buildArabicProductObjective(isChildLearning)
        : this.buildEnglishProductObjective(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionObjective(input.promptType, input.domain)
        : this.buildEnglishExecutionObjective(input.promptType, input.domain);
    const context = isProductBuild
      ? isArabic
        ? `هدف المستخدم الحقيقي هو: "${input.rawInput}". تعامل معه كطلب منتج حقيقي يجب توسيعه إلى تعليمات تنفيذ مباشرة وجاهزة للاستخدام لفريق برمجي أو نظام بناء ذكاء اصطناعي متقدم. عالج التفاصيل الناقصة بحذر، وضع افتراضات عملية عند الحاجة، وأبقِ النتيجة محددة وقابلة للتنفيذ وفورية الاستخدام.`
        : `The user's real objective is: "${input.rawInput}". Treat this as a real product request that must be expanded into direct, execution-ready instructions for a software team or advanced AI build system. Resolve missing detail conservatively, make practical assumptions where needed, and keep the result specific, implementation-ready, and immediately usable.`
      : isArabic
        ? this.buildArabicExecutionContext(input.rawInput)
        : this.buildEnglishExecutionContext(input.rawInput);
    const task = isProductBuild
      ? isArabic
        ? this.buildArabicProductTask(isChildLearning)
        : this.buildEnglishProductTask(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionTask(input.promptType, input.domain)
        : this.buildEnglishExecutionTask(input.promptType, input.domain);
    const deliverable = isProductBuild
      ? isArabic
        ? this.buildArabicProductDeliverable(isChildLearning)
        : this.buildEnglishProductDeliverable(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionDeliverable(input.promptType)
        : this.buildEnglishExecutionDeliverable(input.promptType);
    const toneAndStyle = isProductBuild
      ? isArabic
        ? `استخدم نبرة ${input.tone}. اكتب كما لو كنت قائد منتج وهندسة أول يسلّم موجزاً قابلاً للتنفيذ فوراً. فضّل القرارات العملية والمتطلبات المحددة على النصائح العامة، وحافظ على العربية الفصحى الحديثة في السياقات المهنية، مع إبقاء المصطلحات التقنية وأسماء المنتجات كما هي عند الحاجة.`
        : `Use a ${input.tone} tone. Write like a senior product and engineering lead handing off work that can be acted on immediately. Favor concrete requirements, practical defaults, and implementation-ready decisions over generic advice.`
      : isArabic
        ? `استخدم نبرة ${input.tone}. اكتب كما لو كنت خبيراً أول في مجال ${input.domain} يسلّم نتيجة يمكن استخدامها فوراً. التزم بالعربية الفصحى الحديثة في السياقات المهنية، وحافظ على الصياغة السليمة، والقواعد العربية، وعلامات الترقيم المناسبة، وتجنب العربيزي والترجمة الحرفية، وأبقِ المصطلحات التقنية وأسماء المنتجات كما هي عند الحاجة.`
        : `Use a ${input.tone} tone. Write like a senior ${input.domain} specialist delivering a result another professional can use immediately. Keep the wording polished, specific, and free of filler. Prefer concrete decisions and direct instructions over abstract advice.`;
    const decisionRules = isProductBuild
      ? isArabic
        ? this.buildArabicProductDecisionRules(isChildLearning)
        : this.buildEnglishProductDecisionRules(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionDecisionRules(input.promptType)
        : this.buildEnglishExecutionDecisionRules(input.promptType);
    const responseBudget = isProductBuild
      ? isArabic
        ? this.buildArabicProductResponseBudget(isChildLearning, input.targetAI)
        : this.buildEnglishProductResponseBudget(isChildLearning, input.targetAI)
      : isArabic
        ? this.buildArabicExecutionResponseBudget(input.promptType, input.targetAI)
        : this.buildEnglishExecutionResponseBudget(input.promptType, input.targetAI);
    const successCriteria = isProductBuild
      ? isArabic
        ? this.buildArabicProductSuccessCriteria(isChildLearning)
        : this.buildEnglishProductSuccessCriteria(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionSuccessCriteria(input.promptType)
        : this.buildEnglishExecutionSuccessCriteria(input.promptType);
    const validationChecklist = isProductBuild
      ? isArabic
        ? this.buildArabicProductValidationChecklist(isChildLearning)
        : this.buildEnglishProductValidationChecklist(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionValidationChecklist(input.promptType)
        : this.buildEnglishExecutionValidationChecklist(input.promptType);
    const assumptionPolicy = isProductBuild
      ? isArabic
        ? this.buildArabicProductAssumptionPolicy(isChildLearning)
        : this.buildEnglishProductAssumptionPolicy(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionAssumptionPolicy(input.promptType)
        : this.buildEnglishExecutionAssumptionPolicy(input.promptType);
    const sourcePolicy = isProductBuild
      ? ""
      : isArabic
        ? this.buildArabicExecutionSourcePolicy(input.promptType)
        : this.buildEnglishExecutionSourcePolicy(input.promptType);
    const verificationSteps = isProductBuild
      ? isArabic
        ? this.buildArabicProductVerificationSteps(isChildLearning)
        : this.buildEnglishProductVerificationSteps(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionVerificationSteps(input.promptType)
        : this.buildEnglishExecutionVerificationSteps(input.promptType);
    const acceptanceTests = isProductBuild
      ? isArabic
        ? this.buildArabicProductAcceptanceTests(isChildLearning)
        : this.buildEnglishProductAcceptanceTests(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionAcceptanceTests(input.promptType)
        : this.buildEnglishExecutionAcceptanceTests(input.promptType);
    const constraints = isProductBuild
      ? isArabic
        ? "لا تتضمن أسماء الأطر الداخلية، أو ملاحظات المنهجية، أو شروحاً ميتا. استبدل العبارات الضبابية بمعايير أو حدود واضحة متى أمكن. إذا ظهرت تعليمات متداخلة فحوّلها إلى قاعدة قرار صريحة بدلاً من تركها متناقضة. اجعل النتيجة محددة وقابلة للتنفيذ وشفافة في افتراضاتها. إذا كان الجمهور أطفالاً فاحرص على سلامة التجربة، وملاءمتها العمريّة، وخصوصيتها، وإمكانية الوصول، ولا تضف عناصر اجتماعية أو سلوكية محفوفة بالمخاطر ما لم تُطلب صراحةً."
        : "Do not include internal framework names, methodology notes, or meta explanations. Replace blurry wording with explicit criteria or thresholds whenever possible. If instructions could conflict, resolve them with a clear decision rule instead of leaving ambiguity. Keep the result specific, implementation-ready, and transparent about assumptions. If the audience is children, keep the experience safe, age-appropriate, privacy-conscious, and accessible."
      : isArabic
        ? `ابدأ بالمخرج المطلوب مباشرةً من دون ملاحظات ذاتية أو شروح منهجية. تجنّب العموميات، والحقائق المختلقة، والحشو منخفض القيمة. استبدل الأوصاف الفضفاضة بمعايير أو حدود قابلة للفهم كلما أمكن. اذكر الافتراضات فقط عندما تؤثر مادياً في النتيجة. إذا كان الطلب تقنياً فحافظ على أسماء الدوال والواجهات البرمجية والمصطلحات القياسية دون تشويه. وإذا كان الطلب بصرياً فضمّن الأسلوب والإضاءة والتكوين والنسبة.`
        : `Start with the requested deliverable directly and avoid self-referential notes or methodology commentary. Avoid vague language, fabricated facts, and low-signal filler. Replace subjective wording with explicit criteria whenever possible. State assumptions only when they materially affect the result. If the task is technical, preserve exact terminology, APIs, and code identifiers. If the task is visual, include style, lighting, composition, and aspect ratio.`;
    const failureModes = isProductBuild
      ? isArabic
        ? this.buildArabicProductFailureModes(isChildLearning)
        : this.buildEnglishProductFailureModes(isChildLearning)
      : isArabic
        ? this.buildArabicExecutionFailureModes(input.promptType)
        : this.buildEnglishExecutionFailureModes(input.promptType);
    const examples = input.includeExamples
      ? isArabic
        ? "استخدم من مثال واحد إلى ثلاثة أمثلة فقط إذا كانت ستزيل الغموض فعلاً أو سترفع ثبات الصيغة. اجعلها مطابقة قدر الإمكان للحالة الحقيقية، ومتسقة في التنسيق، ولا تضف أمثلة تخلق أنماطاً جانبية غير مقصودة."
        : "Use one to three examples only if they materially reduce ambiguity or improve format consistency. Keep them tightly matched to the real task, consistent in structure, and free of patterns that could distract from the main instructions."
      : isArabic
        ? "ابدأ بتعليمات صفرية اللقطات ما لم تكن أمثلة قليلة مطلوبة فعلاً لضبط الصيغة أو إزالة الغموض. إذا أضفت مثالاً فليكن قريباً جداً من المهمة الحقيقية ولا يتعارض مع التعليمات."
        : "Prefer zero-shot instructions first. Add examples only if they materially improve format fidelity or remove ambiguity, and keep them tightly matched to the real task.";
    const executionApproach = input.includeChainOfThought || input.framework === "CHAIN_OF_THOUGHT"
      ? isArabic
        ? "نفّذ الاستدلال داخلياً، وراجِع النتيجة مقابل الهدف والقيود ومعايير النجاح قبل الرد، ثم اعرض النتيجة النهائية المصقولة فقط ما لم يُطلب شرح الاستدلال صراحةً."
        : "Reason privately, check the result against the objective, constraints, and success criteria before responding, and return only the polished final answer unless reasoning is explicitly requested."
      : isArabic
        ? "نظّم الاستجابة بترتيب منطقي، واذكر الافتراضات عند الحاجة فقط، وتحقق من توافق النتيجة مع الهدف والقيود ومعايير النجاح قبل الإخراج."
        : "Keep the response logically ordered, make assumptions explicit only when needed, and verify the final result against the objective, constraints, and success criteria before responding.";

    return {
      role,
      objective,
      context,
      task,
      deliverable,
      outputFormat: input.outputFormat,
      toneAndStyle,
      decisionRules,
      responseBudget,
      successCriteria,
      validationChecklist,
      assumptionPolicy,
      ...(sourcePolicy ? { sourcePolicy } : {}),
      ...(verificationSteps ? { verificationSteps } : {}),
      ...(acceptanceTests ? { acceptanceTests } : {}),
      constraints,
      failureModes,
      examples,
      executionApproach
    };
  }

  private isProductBuildRequest(rawInput: string, promptType: PromptTypeValue): boolean {
    if (!["CODE_GENERATION", "GENERAL", "BUSINESS"].includes(promptType)) {
      return false;
    }

    const normalized = normalize(rawInput);
    const hasProductKeyword = PRODUCT_BUILD_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const hasBuildIntent = PRODUCT_BUILD_INTENT_KEYWORDS.some((keyword) =>
      normalized.includes(keyword)
    );

    if (!hasProductKeyword) {
      return false;
    }

    if (promptType === "BUSINESS" && !hasBuildIntent) {
      return false;
    }

    const isExistingCodeWork = EXISTING_CODE_WORK_KEYWORDS.some((keyword) =>
      normalized.includes(keyword)
    );

    if (isExistingCodeWork) {
      return false;
    }

    if (!hasBuildIntent && this.isConciseProductConcept(rawInput)) {
      return true;
    }

    return true;
  }

  private isChildLearningRequest(rawInput: string): boolean {
    const normalized = normalize(rawInput);
    return CHILD_LEARNING_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  private isConciseProductConcept(rawInput: string): boolean {
    const normalized = normalize(rawInput);
    const wordCount = countWords(rawInput);
    const hasProductKeyword = PRODUCT_BUILD_KEYWORDS.some((keyword) => normalized.includes(keyword));
    const isExistingCodeWork = EXISTING_CODE_WORK_KEYWORDS.some((keyword) =>
      normalized.includes(keyword)
    );

    return hasProductKeyword && !isExistingCodeWork && wordCount >= 2 && wordCount <= 8;
  }

  private buildEnglishProductRole(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "You are a senior full-stack product engineer, educational product designer, and child-safety UX specialist delivering implementation-ready product specifications and build instructions.";
    }

    return "You are a senior full-stack product engineer, systems designer, and UX strategist delivering implementation-ready product specifications and build instructions.";
  }

  private buildArabicProductRole(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "أنت مهندس منتجات وبرمجيات أول، ومصمم منتجات تعليمية، ومتخصص في تجربة الاستخدام الآمنة للأطفال، وتقدّم مواصفات منتج وتعليمات بناء جاهزة للتنفيذ.";
    }

    return "أنت مهندس منتجات وبرمجيات أول، ومصمم أنظمة، واستراتيجي تجربة استخدام، وتقدّم مواصفات منتج وتعليمات بناء جاهزة للتنفيذ.";
  }

  private buildEnglishProductTask(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Design a production-ready children's vocabulary-learning application based on the brief. Define the target age range, learning outcomes, primary users, parent or teacher roles if helpful, vocabulary content structure, audio and visual practice loops, rewards, revision logic, safety and privacy rules, accessibility requirements, UX flows, screen map, recommended tech stack, system architecture, data model, representative API endpoints and example data objects, offline or graceful-degradation expectations, localization and right-to-left requirements where relevant, MVP scope, delivery phases, future enhancements, and success metrics. Make strong, explicit assumptions when details are missing and continue without asking unnecessary questions.";
    }

    return "Design a production-ready application based on the brief. Define the product goal, intended users, key use cases, MVP scope, core workflows, UX requirements, security and privacy expectations, recommended tech stack, system architecture, data model, representative API endpoints and example data objects, offline or graceful-degradation expectations where relevant, localization requirements where relevant, delivery phases, future enhancements, and success metrics. Make strong, explicit assumptions when details are missing and continue without asking unnecessary questions.";
  }

  private buildArabicProductTask(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "صمّم تطبيقاً جاهزاً للإنتاج لتعليم الأطفال المفردات بناءً على هذا الموجز. حدّد الفئة العمرية المستهدفة، ومخرجات التعلّم، والمستخدمين الأساسيين، ودور الوالدين أو المعلمين عند الحاجة، وهيكل المحتوى اللغوي، وحلقات التعلّم السمعية والبصرية، والمكافآت، ومنطق المراجعة، وقواعد السلامة والخصوصية، ومتطلبات إمكانية الوصول، ومسارات الاستخدام، وخريطة الشاشات، والتقنية المقترحة، ومعمارية النظام، ونموذج البيانات، وأمثلة ممثلة للواجهات البرمجية وكائنات البيانات، وتوقعات العمل دون اتصال أو التدهور المقبول، ومتطلبات التوطين ودعم الاتجاه من اليمين إلى اليسار عند الحاجة، ونطاق النسخة الأولى، ومراحل التسليم، والتحسينات المستقبلية، ومقاييس النجاح. ضع افتراضات عملية وواضحة عندما تنقص التفاصيل، وواصل دون طرح أسئلة غير ضرورية.";
    }

    return "صمّم تطبيقاً جاهزاً للإنتاج بناءً على هذا الموجز. حدّد هدف المنتج، والمستخدمين المستهدفين، وحالات الاستخدام الرئيسية، ونطاق النسخة الأولى، ومسارات الاستخدام الأساسية، ومتطلبات تجربة الاستخدام، وتوقعات الأمان والخصوصية، والتقنية المقترحة، ومعمارية النظام، ونموذج البيانات، وأمثلة ممثلة للواجهات البرمجية وكائنات البيانات، وتوقعات العمل دون اتصال أو التدهور المقبول عند الحاجة، ومتطلبات التوطين عند الحاجة، ومراحل التسليم، والتحسينات المستقبلية، ومقاييس النجاح. ضع افتراضات عملية وواضحة عندما تنقص التفاصيل، وواصل دون طرح أسئلة غير ضرورية.";
  }

  private buildEnglishProductObjective(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Turn the brief into a production-grade product specification and build brief for a safe, engaging children's vocabulary-learning application.";
    }

    return "Turn the brief into a production-grade product specification and build brief that a software team can act on immediately.";
  }

  private buildArabicProductObjective(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "حوّل الموجز إلى مواصفة منتج وخطة بناء على مستوى الإنتاج لتطبيق مفردات آمن وجذاب للأطفال.";
    }

    return "حوّل الموجز إلى مواصفة منتج وخطة بناء على مستوى الإنتاج يمكن لفريق برمجي البدء بتنفيذها فوراً.";
  }

  private buildEnglishProductDeliverable(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Return a structured implementation brief that product, design, engineering, and learning-content teams can use immediately to scope, design, and build the application, including representative API endpoints, example data shapes, and explicit notes on offline and localization behavior where relevant.";
    }

    return "Return a structured implementation brief that product, design, and engineering teams can use immediately to scope and build the product, including representative API endpoints, example data shapes, and explicit notes on offline and localization behavior where relevant.";
  }

  private buildArabicProductDeliverable(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "أعد موجز تنفيذ منظم يمكن لفرق المنتج والتصميم والهندسة والمحتوى التعليمي استخدامه فوراً لتخطيط التطبيق وتصميمه وبنائه، مع تضمين واجهات برمجية ممثلة، وأمثلة هياكل بيانات، وملاحظات صريحة حول العمل دون اتصال والتوطين عند الحاجة.";
    }

    return "أعد موجز تنفيذ منظم يمكن لفرق المنتج والتصميم والهندسة استخدامه فوراً لتحديد النطاق وبناء المنتج، مع تضمين واجهات برمجية ممثلة، وأمثلة هياكل بيانات، وملاحظات صريحة حول العمل دون اتصال والتوطين عند الحاجة.";
  }

  private buildEnglishProductDecisionRules(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Prefer MVP clarity over feature sprawl. Prefer child safety, privacy, and accessibility over engagement gimmicks. Prefer buildable learning loops over speculative features. Prefer explicit assumptions over open questions. Prefer complete section coverage with concise, high-signal bullets over over-explaining early sections and starving later ones.";
    }

    return "Prefer practical scope over speculative breadth. Prefer buildable architecture over unnecessary complexity. Prefer explicit assumptions over unresolved ambiguity. Prefer decisions that help a team ship an MVP with confidence. Prefer complete section coverage with concise, high-signal bullets over over-explaining early sections and starving later ones.";
  }

  private buildArabicProductDecisionRules(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "قدّم وضوح النسخة الأولى على تضخم الميزات. قدّم سلامة الأطفال وخصوصيتهم وإمكانية الوصول على حيل التفاعل. قدّم حلقات تعلم قابلة للبناء على الميزات الافتراضية. قدّم الافتراضات الصريحة على الأسئلة المفتوحة. قدّم تغطية كاملة لكل الأقسام مع نقاط موجزة عالية الإشارة على الإطناب في الأقسام الأولى على حساب الأقسام اللاحقة.";
    }

    return "قدّم النطاق العملي على الاتساع النظري. قدّم معمارية قابلة للبناء على التعقيد غير الضروري. قدّم الافتراضات الصريحة على الغموض غير المحسوم. قدّم القرارات التي تساعد الفريق على شحن نسخة أولى بثقة. قدّم تغطية كاملة لكل الأقسام مع نقاط موجزة عالية الإشارة على الإطناب في الأقسام الأولى على حساب الأقسام اللاحقة.";
  }

  private buildEnglishProductResponseBudget(
    isChildLearning: boolean,
    targetAI: TargetAIValue
  ): string {
    const base = isChildLearning
      ? "Fit the entire brief in one complete response. Keep introductory framing minimal, then use concise, high-signal bullets. Aim for 3 to 5 bullets in most sections, and spend the deepest detail on Core Features, Learning Experience, System Architecture, Data Model, API Design, and MVP Delivery Plan."
      : "Fit the entire brief in one complete response. Keep framing minimal, use concise, high-signal bullets, and spend the deepest detail on Core Features, Architecture, Data Model, API Design, and MVP Delivery Plan.";

    switch (targetAI) {
      case "CHATGPT":
        return `${base} Keep section openings short, avoid long prose paragraphs, and compress examples unless they remove ambiguity.`;
      case "CLAUDE":
        return `${base} Use tidy section structure and balanced detail, but compress any repeated rationale instead of dropping later required sections.`;
      case "GEMINI":
        return `${base} Prefer clean bullets and explicit headings over narrative elaboration so every required section is fully covered.`;
      case "COPILOT":
        return `${base} Keep non-code context compact and shift detail toward implementation structure, representative payloads, and verification-relevant specifics.`;
      default:
        return `${base} If the response budget feels tight, shorten wording and merge overlapping bullets instead of omitting required sections.`;
    }
  }

  private buildArabicProductResponseBudget(
    isChildLearning: boolean,
    targetAI: TargetAIValue
  ): string {
    const base = isChildLearning
      ? "أكمِل الموجز كاملاً في استجابة واحدة. اجعل التمهيد قصيراً جداً، ثم استخدم نقاطاً موجزة عالية الإشارة. استهدف من 3 إلى 5 نقاط في معظم الأقسام، وامنح أكبر قدر من التفصيل للأقسام: الميزات الأساسية، وتجربة التعلّم، ومعمارية النظام، ونموذج البيانات، وتصميم الواجهات البرمجية، وخطة تسليم النسخة الأولى."
      : "أكمِل الموجز كاملاً في استجابة واحدة. اجعل التمهيد قصيراً، واستخدم نقاطاً موجزة عالية الإشارة، وامنح أكبر قدر من التفصيل للأقسام: الميزات الأساسية، والمعمارية، ونموذج البيانات، وتصميم الواجهات البرمجية، وخطة تسليم النسخة الأولى.";

    switch (targetAI) {
      case "CHATGPT":
        return `${base} اجعل افتتاح كل قسم قصيراً، وتجنب الفقرات المطولة، واختصر الأمثلة ما لم تكن ضرورية لإزالة الغموض.`;
      case "CLAUDE":
        return `${base} حافظ على بنية مرتبة وتفصيل متوازن، واضغط أي تبرير مكرر بدلاً من إسقاط الأقسام المطلوبة في آخر الاستجابة.`;
      case "GEMINI":
        return `${base} فضّل العناوين الواضحة والنقاط الصريحة على السرد المطول حتى تُغطى كل الأقسام المطلوبة بالكامل.`;
      case "COPILOT":
        return `${base} اجعل السياق غير البرمجي مضغوطاً، ووجّه التفاصيل نحو بنية التنفيذ، والحمولات التمثيلية، والنقاط المفيدة للتحقق.`;
      default:
        return `${base} إذا شعرت بضيق ميزانية الاستجابة فاختصر الصياغة وادمج النقاط المتداخلة بدلاً من حذف أي قسم مطلوب.`;
    }
  }

  private buildEnglishProductSuccessCriteria(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "The result must be specific enough that real product, design, engineering, and content teams could begin implementation immediately. It must be age-appropriate, technically plausible, privacy-conscious, explicit about assumptions and tradeoffs, and complete enough that no required section is omitted, especially API design, future enhancements, offline behavior, localization expectations, and representative data shapes. Keep the sections concise enough that the full brief fits in one complete response.";
    }

    return "The result must be specific enough that real product, design, and engineering teams could begin implementation immediately. It must be technically plausible, coherent, explicit about assumptions and tradeoffs, and complete enough that no required section is omitted, especially API design, future enhancements, offline behavior, localization expectations, and representative data shapes. Keep the sections concise enough that the full brief fits in one complete response.";
  }

  private buildArabicProductSuccessCriteria(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "يجب أن تكون النتيجة محددة بما يكفي لكي تتمكن فرق المنتج والتصميم والهندسة والمحتوى من البدء بالتنفيذ فوراً. ويجب أن تكون مناسبة للعمر، وقابلة للتنفيذ تقنياً، ومراعية للخصوصية، وواضحة في افتراضاتها ومفاضلاتها، وكاملة بحيث لا تُحذف أي فقرة مطلوبة، وخصوصاً تصميم الواجهات البرمجية، والتحسينات المستقبلية، وسلوك العمل دون اتصال، ومتطلبات التوطين، وأمثلة هياكل البيانات. حافظ على إيجاز الأقسام بما يسمح بإكمال الموجز كاملاً في استجابة واحدة.";
    }

    return "يجب أن تكون النتيجة محددة بما يكفي لكي تتمكن فرق المنتج والتصميم والهندسة من البدء بالتنفيذ فوراً. ويجب أن تكون قابلة للتنفيذ تقنياً، ومتماسكة، وواضحة في افتراضاتها ومفاضلاتها، وكاملة بحيث لا تُحذف أي فقرة مطلوبة، وخصوصاً تصميم الواجهات البرمجية، والتحسينات المستقبلية، وسلوك العمل دون اتصال، ومتطلبات التوطين، وأمثلة هياكل البيانات. حافظ على إيجاز الأقسام بما يسمح بإكمال الموجز كاملاً في استجابة واحدة.";
  }

  private buildEnglishProductValidationChecklist(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Before returning, confirm the brief defines the age range, learning outcomes, child and adult roles, vocabulary content structure, safe engagement loops, accessibility expectations, key screens, architecture, data model, representative APIs, example data objects, offline or graceful-degradation expectations, localization or right-to-left requirements where relevant, MVP scope, future enhancements, and measurable success metrics. Confirm that every section listed in the output format appears once and is substantively filled.";
    }

    return "Before returning, confirm the brief defines the target users, product goal, core flows, architecture, data model, representative APIs, example data objects, offline or graceful-degradation expectations where relevant, localization requirements where relevant, MVP scope, delivery phases, future enhancements, and measurable success metrics. Confirm that every section listed in the output format appears once and is substantively filled.";
  }

  private buildArabicProductValidationChecklist(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "قبل الرد، تأكد من أن الموجز يحدد الفئة العمرية، ومخرجات التعلّم، وأدوار الطفل والبالغ، وبنية المحتوى، وحلقات التفاعل الآمنة، ومتطلبات الوصول، والشاشات الأساسية، والمعمارية، ونموذج البيانات، وأمثلة ممثلة للواجهات البرمجية وكائنات البيانات، وتوقعات العمل دون اتصال أو التدهور المقبول، ومتطلبات التوطين أو دعم الاتجاه من اليمين إلى اليسار عند الحاجة، ونطاق النسخة الأولى، والتحسينات المستقبلية، ومقاييس النجاح القابلة للقياس. وتأكد من ظهور كل قسم مذكور في صيغة المخرجات مرة واحدة مع محتوى حقيقي غير شكلي.";
    }

    return "قبل الرد، تأكد من أن الموجز يحدد المستخدمين المستهدفين، وهدف المنتج، والتدفّقات الأساسية، والمعمارية، ونموذج البيانات، وأمثلة ممثلة للواجهات البرمجية وكائنات البيانات، وتوقعات العمل دون اتصال أو التدهور المقبول عند الحاجة، ومتطلبات التوطين عند الحاجة، ونطاق النسخة الأولى، ومراحل التسليم، والتحسينات المستقبلية، ومقاييس النجاح القابلة للقياس. وتأكد من ظهور كل قسم مذكور في صيغة المخرجات مرة واحدة مع محتوى حقيقي غير شكلي.";
  }

  private buildEnglishProductAssumptionPolicy(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Make at most three high-impact assumptions. State only the assumptions that materially affect age appropriateness, safety, architecture, content design, or rollout. Prefer conservative child-safe defaults over speculative engagement features.";
    }

    return "Make at most three high-impact assumptions. State only the assumptions that materially affect scope, architecture, delivery, or risk. Prefer common production defaults over speculative product complexity.";
  }

  private buildArabicProductAssumptionPolicy(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "ضع ما لا يزيد على ثلاثة افتراضات عالية الأثر. اذكر فقط الافتراضات التي تغيّر ملاءمة العمر، أو السلامة، أو المعمارية، أو تصميم المحتوى، أو خطة الإطلاق. وقدّم افتراضات محافظة وآمنة للأطفال على ميزات تفاعل افتراضية.";
    }

    return "ضع ما لا يزيد على ثلاثة افتراضات عالية الأثر. اذكر فقط الافتراضات التي تغيّر النطاق أو المعمارية أو التسليم أو المخاطر. وقدّم افتراضات إنتاجية شائعة على التعقيد المنتجّي غير الضروري.";
  }

  private buildEnglishProductVerificationSteps(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Check that every major feature maps to a child or adult user role, every critical flow maps to a screen, every safety or privacy requirement maps to a concrete control, every learning claim maps to content, data, or feedback logic, every representative API maps to a user or system need, every core entity shape supports the stated flows, and any offline or localization requirement maps to UI, storage, and operational behavior.";
    }

    return "Check that every major feature maps to a user role, every critical flow maps to a screen, every system claim maps to architecture, data, or API details, every representative API maps to a user or system need, every core entity shape supports the stated flows, and every delivery phase preserves a shippable MVP.";
  }

  private buildArabicProductVerificationSteps(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "تحقق من أن كل ميزة رئيسية مرتبطة بدور طفل أو بالغ، وأن كل تدفّق حرج مرتبط بشاشة واضحة، وأن كل متطلب سلامة أو خصوصية مرتبط بضابط عملي، وأن كل ادعاء تعلّمي مرتبط بالمحتوى أو البيانات أو منطق التغذية الراجعة، وأن كل واجهة برمجية ممثلة مرتبطة بحاجة فعلية للمستخدم أو النظام، وأن كل شكل بيانات أساسي يدعم التدفقات المذكورة، وأن أي متطلب للعمل دون اتصال أو للتوطين مرتبط بسلوك الواجهة والتخزين والتشغيل.";
    }

    return "تحقق من أن كل ميزة رئيسية مرتبطة بدور مستخدم، وأن كل تدفّق حرج مرتبط بشاشة واضحة، وأن كل ادعاء نظامي مرتبط بتفاصيل معمارية أو بيانات أو واجهات برمجية، وأن كل واجهة برمجية ممثلة مرتبطة بحاجة فعلية للمستخدم أو النظام، وأن كل شكل بيانات أساسي يدعم التدفقات المذكورة، وأن كل مرحلة تسليم تحافظ على نسخة أولى قابلة للشحن.";
  }

  private buildEnglishProductAcceptanceTests(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "A strong result lets a real team answer yes to: can we scope v1, design the core child journey, define adult oversight, model the data, specify representative endpoints and example payloads, account for offline and localization behavior where relevant, preserve a clear future roadmap, and begin implementation without major clarification or safety gaps?";
    }

    return "A strong result lets a real team answer yes to: can we scope v1, define the core flows, model the data, specify representative endpoints and example payloads, account for offline and localization behavior where relevant, preserve a clear future roadmap, and start implementation without major clarification?";
  }

  private buildArabicProductAcceptanceTests(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "تُعد النتيجة قوية إذا استطاع فريق حقيقي الإجابة بنعم على الأسئلة التالية: هل يمكن تحديد نطاق النسخة الأولى، وتصميم رحلة الطفل الأساسية، وتحديد إشراف البالغ، ونمذجة البيانات، وتحديد واجهات برمجية ممثلة وحمولات نموذجية، ومراعاة سلوك العمل دون اتصال والتوطين عند الحاجة، والحفاظ على خارطة طريق مستقبلية واضحة، والبدء بالتنفيذ من دون ثغرات سلامة أو غموض جوهري؟";
    }

    return "تُعد النتيجة قوية إذا استطاع فريق حقيقي الإجابة بنعم على الأسئلة التالية: هل يمكن تحديد نطاق النسخة الأولى، وتعريف التدفقات الأساسية، ونمذجة البيانات، وتحديد واجهات برمجية ممثلة وحمولات نموذجية، ومراعاة سلوك العمل دون اتصال والتوطين عند الحاجة، والحفاظ على خارطة طريق مستقبلية واضحة، والبدء بالتنفيذ من دون حاجة إلى توضيحات جوهرية؟";
  }

  private buildEnglishProductFailureModes(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "Avoid generic edtech advice, unsafe child engagement mechanics, feature dumping without prioritization, placeholder APIs or vague data shapes, omitted Future Enhancements, and missing definitions for offline behavior, localization, architecture, data, or success metrics.";
    }

    return "Avoid generic product advice, feature dumping without prioritization, vague architecture, placeholder APIs or vague data shapes, omitted Future Enhancements, and missing definitions for offline behavior, localization, data, delivery scope, or success metrics.";
  }

  private buildArabicProductFailureModes(isChildLearning: boolean): string {
    if (isChildLearning) {
      return "تجنب نصائح تقنية التعليم العامة، وآليات التفاعل غير الآمنة للأطفال، وسرد الميزات بلا أولوية، وواجهات برمجية شكلية أو هياكل بيانات ضبابية، وإغفال فقرة التحسينات المستقبلية، وغياب تعريفات واضحة للعمل دون اتصال أو التوطين أو المعمارية أو البيانات أو مقاييس النجاح.";
    }

    return "تجنب نصائح المنتجات العامة، وسرد الميزات بلا أولوية، والمعمارية الضبابية، وواجهات برمجية شكلية أو هياكل بيانات ضبابية، وإغفال فقرة التحسينات المستقبلية، وغياب تعريفات واضحة للعمل دون اتصال أو التوطين أو البيانات أو نطاق التسليم أو مقاييس النجاح.";
  }

  private buildEnglishExecutionContext(rawInput: string): string {
    return `The user's real objective is: "${rawInput}". Treat it as a direct execution request for an advanced AI system. Resolve missing detail conservatively, preserve domain accuracy, and make the instruction set immediately usable with strong control over quality, scope, and output shape.`;
  }

  private buildArabicExecutionContext(rawInput: string): string {
    return `هدف المستخدم الحقيقي هو: "${rawInput}". تعامل معه كطلب تنفيذ مباشر موجّه إلى نظام ذكاء اصطناعي متقدم. استكمل التفاصيل الناقصة بحذر، وحافظ على دقة المجال، وصغ التعليمات بحيث تكون جاهزة للاستخدام فوراً مع تحكم واضح في الجودة والنطاق وشكل المخرج.`;
  }

  private buildEnglishExecutionObjective(promptType: PromptTypeValue, domain: string): string {
    const objectiveMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "Produce the strongest possible instruction set for the requested creative deliverable so a downstream AI can generate polished, audience-fit work without further clarification.",
      CODE_GENERATION:
        `Produce a technically precise instruction set that drives a downstream AI or engineer toward a correct, production-ready solution in the ${domain} domain.`,
      DATA_ANALYSIS:
        "Produce an analysis brief that drives rigorous, decision-useful analysis rather than generic commentary.",
      IMAGE_GENERATION:
        "Produce a visually precise generation prompt that controls subject, style, lighting, composition, and aspect ratio.",
      TRANSLATION:
        "Produce a localization-ready instruction set that preserves meaning, tone, terminology, and audience fit.",
      SUMMARIZATION:
        "Produce a summarization brief that preserves key facts, decisions, risks, and takeaways while removing noise.",
      QA:
        "Produce a direct answer brief that prioritizes accuracy, relevance, and practical usefulness.",
      ROLEPLAY:
        "Produce a scenario-consistent instruction set that preserves the requested persona while still achieving the real objective.",
      RESEARCH:
        "Produce a research brief that drives evidence-based investigation and defensible conclusions.",
      BUSINESS:
        "Produce a business-ready instruction set optimized for decision quality, clarity, and persuasion.",
      GENERAL:
        "Produce a complete, model-agnostic instruction set that helps the downstream system execute the user's real objective with high accuracy."
    };

    return objectiveMap[promptType];
  }

  private buildArabicExecutionObjective(promptType: PromptTypeValue, domain: string): string {
    const objectiveMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "أنشئ مجموعة تعليمات قوية للمخرج الإبداعي المطلوب بحيث يتمكن نموذج لاحق من إنتاج عمل مصقول وملائم للجمهور دون حاجة إلى استيضاحات إضافية.",
      CODE_GENERATION:
        `أنشئ مجموعة تعليمات تقنية دقيقة تدفع نموذجاً لاحقاً أو مهندساً إلى حل صحيح وجاهز للإنتاج ضمن مجال ${domain}.`,
      DATA_ANALYSIS:
        "أنشئ موجز تحليل يدفع إلى تحليل صارم ومفيد للقرار بدلاً من تعليق عام.",
      IMAGE_GENERATION:
        "أنشئ برومبت بصرياً دقيقاً يتحكم في الموضوع والأسلوب والإضاءة والتكوين ونسبة الأبعاد.",
      TRANSLATION:
        "أنشئ مجموعة تعليمات جاهزة للتوطين تحافظ على المعنى والنبرة والمصطلحات وملاءمة الجمهور.",
      SUMMARIZATION:
        "أنشئ موجز تلخيص يحافظ على الحقائق والقرارات والمخاطر والخلاصات الأساسية ويزيل الضجيج.",
      QA:
        "أنشئ موجز إجابة مباشرة يقدّم الدقة والملاءمة والفائدة العملية أولاً.",
      ROLEPLAY:
        "أنشئ مجموعة تعليمات منسجمة مع السيناريو تحافظ على الشخصية المطلوبة مع تحقيق الهدف الحقيقي.",
      RESEARCH:
        "أنشئ موجز بحث يدفع إلى تحقيق قائم على الأدلة واستنتاجات قابلة للدفاع عنها.",
      BUSINESS:
        "أنشئ مجموعة تعليمات تجارية جاهزة للتنفيذ ومحسّنة لجودة القرار والوضوح والإقناع.",
      GENERAL:
        "أنشئ مجموعة تعليمات كاملة ومحايدة تجاه النموذج تساعد النظام اللاحق على تنفيذ هدف المستخدم الحقيقي بدقة عالية."
    };

    return objectiveMap[promptType];
  }

  private buildEnglishExecutionTask(promptType: PromptTypeValue, domain: string): string {
    const taskMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "Produce the requested creative deliverable. Clarify the audience, angle, structure, voice, emotional effect, and quality bar, then write with specificity, momentum, and strong narrative control.",
      CODE_GENERATION:
        `Produce an implementation-ready technical response. Clarify scope, target environment, architecture, constraints, edge cases, verification steps, and acceptance criteria, then execute with production-level precision in the ${domain} domain.`,
      DATA_ANALYSIS:
        "Perform the analysis rigorously. Define the objective, key metrics, assumptions, methodology, and output structure, then deliver defensible conclusions and action-oriented next steps.",
      IMAGE_GENERATION:
        "Create a high-fidelity visual generation prompt. Define the subject, scene, style, lighting, composition, framing, aspect ratio, and negative prompt guidance wherever useful.",
      TRANSLATION:
        "Translate or localize the material accurately. Preserve meaning, tone, terminology, and audience intent while adapting phrasing naturally for the target language and context.",
      SUMMARIZATION:
        "Summarize the material into the requested format. Preserve key facts, decisions, risks, and takeaways while removing repetition and low-signal detail.",
      QA:
        "Answer the request directly and precisely. Surface the most relevant facts first, clarify assumptions only when necessary, and keep the result accurate and easy to act on.",
      ROLEPLAY:
        "Respond in character while still completing the real objective. Keep the persona consistent, respect the scenario, and maintain believable constraints without losing clarity.",
      RESEARCH:
        "Investigate the topic systematically. Define the research objective, scope, evidence standard, evaluation criteria, uncertainty rules, and output structure, then deliver an evidence-oriented result with clear reasoning and explicit assumptions.",
      BUSINESS:
        "Develop the requested business deliverable. Clarify the objective, audience, decision criteria, constraints, and desired outcome, then produce a concise, persuasive, and execution-ready result.",
      GENERAL:
        `Execute the user's real objective directly. Clarify the deliverable, audience, decision criteria, constraints, and success bar, then produce a complete, actionable result within the ${domain} domain.`
    };

    return taskMap[promptType];
  }

  private buildArabicExecutionTask(promptType: PromptTypeValue, domain: string): string {
    const taskMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "أنشئ المخرج الإبداعي المطلوب مباشرةً. حدّد الجمهور، والزّاوية، والبنية، والصوت الأسلوبي، والأثر العاطفي، ومعيار الجودة، ثم اكتب بدقة وحيوية وتحكم سردي واضح.",
      CODE_GENERATION:
        `قدّم استجابة تقنية جاهزة للتنفيذ. حدّد النطاق، وبيئة التشغيل المستهدفة، والمعمارية، والقيود، والحالات الطرفية، وخطوات التحقق، ومعايير القبول، ثم نفّذ بدقة إنتاجية ضمن مجال ${domain}.`,
      DATA_ANALYSIS:
        "نفّذ التحليل بمنهجية صارمة. حدّد الهدف، والمؤشرات الرئيسية، والافتراضات، والمنهجية، وهيكل المخرجات، ثم قدّم استنتاجات قابلة للدفاع عنها وخطوات تالية عملية.",
      IMAGE_GENERATION:
        "أنشئ برومبت بصرياً عالي الجودة. حدّد الموضوع، والمشهد، والأسلوب، والإضاءة، والتكوين، وزاوية التأطير، ونسبة الأبعاد، والعناصر المستبعدة عند الحاجة.",
      TRANSLATION:
        "ترجم أو وطّن المحتوى بدقة. حافظ على المعنى، والنبرة، والمصطلحات، وهدف الجمهور، مع تكييف الصياغة طبيعياً للغة والسياق المستهدفين.",
      SUMMARIZATION:
        "لخّص المادة في الصيغة المطلوبة. حافظ على الحقائق والقرارات والمخاطر والخلاصات الأساسية، واحذف التكرار والتفاصيل منخفضة القيمة.",
      QA:
        "أجب عن الطلب مباشرةً وبدقة. ابدأ بأهم المعلومات، واذكر الافتراضات فقط عند الحاجة، واجعل النتيجة واضحة وسهلة التطبيق.",
      ROLEPLAY:
        "استجب داخل الدور المطلوب مع الاستمرار في تحقيق الهدف الحقيقي. حافظ على اتساق الشخصية واحترام السيناريو دون التضحية بالوضوح.",
      RESEARCH:
        "ابحث الموضوع بشكل منهجي. حدّد هدف البحث، والنطاق، ومعيار الأدلة، ومعايير التقييم، وقواعد عدم اليقين، وهيكل المخرجات، ثم قدّم نتيجة قائمة على الأدلة مع استدلال واضح وافتراضات صريحة.",
      BUSINESS:
        "طوّر المخرج التجاري المطلوب. حدّد الهدف، والجمهور، ومعايير القرار، والقيود، والنتيجة المرغوبة، ثم قدّم نتيجة موجزة ومقنعة وجاهزة للتنفيذ.",
      GENERAL:
        `نفّذ هدف المستخدم الحقيقي مباشرةً. حدّد المخرج المطلوب، والجمهور، ومعايير القرار، والقيود، ومعيار النجاح، ثم قدّم نتيجة مكتملة وعملية ضمن مجال ${domain}.`
    };

    return taskMap[promptType];
  }

  private buildEnglishExecutionDeliverable(promptType: PromptTypeValue): string {
    const deliverableMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "Return the finished creative brief or writing prompt with the audience, angle, structure, and quality bar clearly defined.",
      CODE_GENERATION:
        "Return an implementation-ready technical brief or prompt with scope, target environment, architecture, edge cases, verification steps, and acceptance criteria explicitly defined.",
      DATA_ANALYSIS:
        "Return an analysis brief with objective, metrics, assumptions, methodology, and the exact shape of the final analytical output.",
      IMAGE_GENERATION:
        "Return a paste-ready visual prompt with subject, scene, style, lighting, composition, aspect ratio, and negative guidance where useful.",
      TRANSLATION:
        "Return a translation or localization brief that specifies the target audience, tone, terminology rules, and format expectations.",
      SUMMARIZATION:
        "Return a summarization brief that specifies what must be preserved, what may be compressed, and how the final summary should be structured.",
      QA:
        "Return a direct answer brief that makes the response easy to execute, verify, or use in a decision.",
      ROLEPLAY:
        "Return a role-consistent instruction set with persona boundaries, scenario rules, and the concrete output to produce.",
      RESEARCH:
        "Return a research brief with scope, source or evidence expectations, uncertainty rules, evaluation criteria, and the required final structure.",
      BUSINESS:
        "Return a business-ready brief with audience, decision criteria, constraints, and the exact deliverable structure.",
      GENERAL:
        "Return a complete, paste-ready prompt that another strong AI model can execute immediately."
    };

    return deliverableMap[promptType];
  }

  private buildArabicExecutionDeliverable(promptType: PromptTypeValue): string {
    const deliverableMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "أعد الموجز الإبداعي النهائي أو برومبت الكتابة النهائي مع تحديد الجمهور والزّاوية والبنية ومعيار الجودة بوضوح.",
      CODE_GENERATION:
        "أعد موجزاً أو برومبتاً تقنياً جاهزاً للتنفيذ يحدد النطاق وبيئة التشغيل المستهدفة والمعمارية والحالات الطرفية وخطوات التحقق ومعايير القبول بوضوح.",
      DATA_ANALYSIS:
        "أعد موجز تحليل يحدد الهدف والمؤشرات والافتراضات والمنهجية والشكل النهائي المطلوب للمخرجات التحليلية.",
      IMAGE_GENERATION:
        "أعد برومبتاً بصرياً جاهزاً للاستخدام يتضمن الموضوع والمشهد والأسلوب والإضاءة والتكوين ونسبة الأبعاد والإرشادات السلبية عند الحاجة.",
      TRANSLATION:
        "أعد موجز ترجمة أو توطين يحدد الجمهور المستهدف والنبرة وقواعد المصطلحات وتوقعات الصيغة.",
      SUMMARIZATION:
        "أعد موجز تلخيص يحدد ما يجب الحفاظ عليه وما يمكن ضغطه وكيفية تنظيم الملخص النهائي.",
      QA:
        "أعد موجز إجابة مباشرة يجعل النتيجة سهلة التنفيذ أو التحقق أو الاستخدام في القرار.",
      ROLEPLAY:
        "أعد مجموعة تعليمات متسقة مع الدور تحدد حدود الشخصية وقواعد السيناريو والمخرج المطلوب إنتاجه.",
      RESEARCH:
        "أعد موجز بحث يحدد النطاق وتوقعات المصادر أو الأدلة وقواعد عدم اليقين ومعايير التقييم والبنية النهائية المطلوبة.",
      BUSINESS:
        "أعد موجزاً تجارياً جاهزاً يحدد الجمهور ومعايير القرار والقيود وبنية المخرج المطلوبة بدقة.",
      GENERAL:
        "أعد برومبتاً كاملاً وجاهزاً للّصق يمكن لأي نموذج ذكاء اصطناعي قوي تنفيذه فوراً."
    };

    return deliverableMap[promptType];
  }

  private buildEnglishExecutionDecisionRules(promptType: PromptTypeValue): string {
    const rulesMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "Prefer audience fit over ornament. Prefer clear angle and structure over abstract cleverness. Prefer vivid, concrete details over generic adjectives.",
      CODE_GENERATION:
        "Prefer correctness, maintainability, and verifiability over clever shortcuts. Prefer explicit interfaces and edge cases over implied assumptions. Prefer production-safe defaults over speculative optimizations.",
      DATA_ANALYSIS:
        "Prefer measurable criteria over intuition. Prefer transparent assumptions over hidden judgment. Prefer conclusions that can be defended from the stated method and evidence.",
      IMAGE_GENERATION:
        "Prefer concrete visual control over poetic ambiguity. Prefer explicit composition, lighting, and framing over broad mood words. Add negative guidance when common artifacts are likely.",
      TRANSLATION:
        "Prefer fidelity of meaning over literal wording. Prefer terminology consistency over stylistic variation. Prefer natural target-language phrasing over source-language structure.",
      SUMMARIZATION:
        "Prefer key facts, decisions, risks, and takeaways over background detail. Prefer compression without distortion. Prefer clear information hierarchy over exhaustive coverage.",
      QA:
        "Prefer the most decision-relevant facts first. Prefer explicit uncertainty over false confidence. Prefer actionable clarity over unnecessary exposition.",
      ROLEPLAY:
        "Prefer consistency with the requested persona without losing the real objective. Prefer believable constraints over theatrical excess. Prefer clarity over improvisation that changes the task.",
      RESEARCH:
        "Prefer evidence over assertion. Prefer explicit evaluation criteria over post-hoc justification. Prefer uncertainty labeling where claims cannot be made confidently.",
      BUSINESS:
        "Prefer decision quality over generic persuasion. Prefer business constraints and audience context over slogans. Prefer prioritized recommendations over brainstorming dumps.",
      GENERAL:
        "Prefer explicit decisions over vague suggestions. Prefer domain accuracy over generality. Prefer concise completeness over filler. Prefer objective criteria over subjective adjectives."
    };

    return rulesMap[promptType];
  }

  private buildArabicExecutionDecisionRules(promptType: PromptTypeValue): string {
    const rulesMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "قدّم ملاءمة الجمهور على الزخرفة. قدّم الزاوية الواضحة والبنية المحكمة على الغموض الذكي. قدّم التفاصيل الحسية الملموسة على الصفات العامة.",
      CODE_GENERATION:
        "قدّم الصحة وقابلية الصيانة والتحقق على الاختصارات الذكية. قدّم الواجهات الصريحة والحالات الطرفية على الافتراضات الضمنية. قدّم الافتراضات الآمنة للإنتاج على التحسينات التخيلية.",
      DATA_ANALYSIS:
        "قدّم المعايير القابلة للقياس على الحدس. قدّم الافتراضات الشفافة على الأحكام الخفية. قدّم استنتاجات يمكن الدفاع عنها انطلاقاً من المنهجية والأدلة المذكورة.",
      IMAGE_GENERATION:
        "قدّم التحكم البصري الملموس على الغموض الشعري. قدّم التكوين والإضاءة والتأطير الصريح على كلمات المزاج العامة. أضف إرشادات سلبية عندما تكون العيوب الشائعة محتملة.",
      TRANSLATION:
        "قدّم أمانة المعنى على الحرفية اللفظية. قدّم اتساق المصطلحات على التنويع الأسلوبي. قدّم الصياغة الطبيعية في اللغة الهدف على بنية اللغة المصدر.",
      SUMMARIZATION:
        "قدّم الحقائق والقرارات والمخاطر والخلاصات الأساسية على التفاصيل الخلفية. قدّم الضغط دون تشويه. قدّم هرماً معلوماتياً واضحاً على الشمول المرهق.",
      QA:
        "قدّم أكثر الحقائق صلة بالقرار أولاً. قدّم عدم اليقين الصريح على الثقة الزائفة. قدّم الوضوح العملي على الشرح غير الضروري.",
      ROLEPLAY:
        "قدّم الاتساق مع الشخصية المطلوبة دون فقدان الهدف الحقيقي. قدّم القيود المقنعة على الاستعراض المسرحي. قدّم الوضوح على الارتجال الذي يغيّر المهمة.",
      RESEARCH:
        "قدّم الأدلة على الادعاء. قدّم معايير تقييم صريحة على التبرير اللاحق. قدّم وسم عدم اليقين عندما لا يمكن الجزم بثقة.",
      BUSINESS:
        "قدّم جودة القرار على الإقناع العام. قدّم قيود العمل وسياق الجمهور على الشعارات. قدّم توصيات مرتبة بالأولوية على سكب الأفكار دون تنظيم.",
      GENERAL:
        "قدّم القرارات الصريحة على الاقتراحات الضبابية. قدّم دقة المجال على العمومية. قدّم الاكتمال الموجز على الحشو. قدّم المعايير الموضوعية على الصفات الذاتية."
    };

    return rulesMap[promptType];
  }

  private buildEnglishExecutionResponseBudget(
    promptType: PromptTypeValue,
    targetAI: TargetAIValue
  ): string {
    const generic = "Keep the response compact enough to finish in one pass. Use explicit headings and concise bullets where helpful. Spend detail on the parts that control execution quality, and compress setup or repeated explanation.";

    if (promptType === "CODE_GENERATION") {
      return `${generic} Prioritize scope, environment, constraints, verification, and acceptance criteria over background commentary. ${targetAI === "COPILOT" ? "Keep code-context instructions especially compact so implementation details stay prominent." : ""}`.trim();
    }

    if (promptType === "RESEARCH") {
      return `${generic} Prioritize research objective, evidence standard, evaluation criteria, recommendation shape, and uncertainty handling over broad background context.`;
    }

    if (promptType === "BUSINESS") {
      return `${generic} Prioritize audience, decision criteria, recommendations, and concrete deliverable structure over market-preface commentary.`;
    }

    if (promptType === "IMAGE_GENERATION") {
      return "Keep the prompt visually dense and compact. Spend tokens on subject, style, lighting, composition, aspect ratio, and negatives. Avoid narrative explanation.";
    }

    return generic;
  }

  private buildArabicExecutionResponseBudget(
    promptType: PromptTypeValue,
    targetAI: TargetAIValue
  ): string {
    const generic = "أبقِ الاستجابة موجزة بما يكفي لتكتمل في تمريرة واحدة. استخدم عناوين صريحة ونقاطاً مختصرة عند الحاجة. وجّه التفصيل إلى الأجزاء التي تضبط جودة التنفيذ، واضغط التمهيد أو الشرح المكرر.";

    if (promptType === "CODE_GENERATION") {
      return `${generic} قدّم النطاق، وبيئة التشغيل، والقيود، وخطوات التحقق، ومعايير القبول على الشرح الخلفي. ${targetAI === "COPILOT" ? "واجعل تعليمات سياق الكود مضغوطة بشكل خاص حتى تبقى تفاصيل التنفيذ في الواجهة." : ""}`.trim();
    }

    if (promptType === "RESEARCH") {
      return `${generic} قدّم هدف البحث، ومعيار الأدلة، ومعايير التقييم، وشكل التوصية، ومعالجة عدم اليقين على الخلفية العامة المطولة.`;
    }

    if (promptType === "BUSINESS") {
      return `${generic} قدّم الجمهور، ومعايير القرار، والتوصيات، وبنية المخرج العملية على التعليق التمهيدي عن السوق.`;
    }

    if (promptType === "IMAGE_GENERATION") {
      return "اجعل البرومبت كثيفاً بصرياً ومضغوطاً. أنفق الكلمات على الموضوع، والأسلوب، والإضاءة، والتكوين، ونسبة الأبعاد، والعناصر السلبية، وتجنب الشرح السردي.";
    }

    return generic;
  }

  private buildEnglishExecutionSuccessCriteria(promptType: PromptTypeValue): string {
    const criteriaMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "The result must be polished, audience-specific, coherent, and strong enough to produce a high-quality creative output on the first pass.",
      CODE_GENERATION:
        "The result must be technically correct, bounded, production-ready, and detailed enough that implementation can begin without major clarification.",
      DATA_ANALYSIS:
        "The result must define measurable success, sound methodology, and a final output shape that supports real decisions.",
      IMAGE_GENERATION:
        "The result must produce strong subject fidelity, controlled composition, consistent style, and minimal ambiguity for the target image model.",
      TRANSLATION:
        "The result must preserve meaning, tone, terminology, and audience fit without sounding translated or unnatural.",
      SUMMARIZATION:
        "The result must preserve the highest-value information while remaining concise, accurate, and easy to scan.",
      QA:
        "The result must answer the real question directly, accurately, and in a form the user can act on immediately.",
      ROLEPLAY:
        "The result must stay consistent with the requested persona while still delivering a useful, goal-complete answer.",
      RESEARCH:
        "The result must be evidence-oriented, explicit about assumptions, and organized so conclusions can be defended and acted on.",
      BUSINESS:
        "The result must be commercially credible, decision-useful, and specific enough for a professional stakeholder to act on immediately.",
      GENERAL:
        "The result must be specific, coherent, professionally usable, and strong enough that another advanced AI system can execute it without needing major clarification."
    };

    return criteriaMap[promptType];
  }

  private buildArabicExecutionSuccessCriteria(promptType: PromptTypeValue): string {
    const criteriaMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "يجب أن تكون النتيجة مصقولة، وملائمة للجمهور، ومتماسكة، وقوية بما يكفي لإنتاج مخرج إبداعي عالي الجودة من المحاولة الأولى.",
      CODE_GENERATION:
        "يجب أن تكون النتيجة صحيحة تقنياً، ومحددة النطاق، وجاهزة للإنتاج، ومفصلة بما يكفي لبدء التنفيذ دون حاجة إلى توضيحات جوهرية.",
      DATA_ANALYSIS:
        "يجب أن تحدد النتيجة معيار نجاح قابل للقياس، ومنهجية سليمة، وشكلاً نهائياً للمخرجات يدعم قرارات حقيقية.",
      IMAGE_GENERATION:
        "يجب أن تنتج النتيجة وضوحاً قوياً في الموضوع، وتكويناً مضبوطاً، وأسلوباً متسقاً، وغموضاً محدوداً للنموذج البصري المستهدف.",
      TRANSLATION:
        "يجب أن تحافظ النتيجة على المعنى والنبرة والمصطلحات وملاءمة الجمهور من دون أن تبدو مترجمة حرفياً أو متكلفة.",
      SUMMARIZATION:
        "يجب أن تحافظ النتيجة على أعلى المعلومات قيمة مع البقاء موجزة ودقيقة وسهلة المسح.",
      QA:
        "يجب أن تجيب النتيجة عن السؤال الحقيقي مباشرةً وبدقة وبصيغة يمكن للمستخدم العمل بها فوراً.",
      ROLEPLAY:
        "يجب أن تحافظ النتيجة على اتساق الشخصية المطلوبة مع تقديم إجابة مفيدة وكاملة الهدف.",
      RESEARCH:
        "يجب أن تكون النتيجة معتمدة على الأدلة، وواضحة في افتراضاتها، ومنظمة بحيث يمكن الدفاع عن استنتاجاتها والعمل بها.",
      BUSINESS:
        "يجب أن تكون النتيجة ذات مصداقية تجارية، ومفيدة للقرار، ومحددة بما يكفي ليتصرف عليها صاحب مصلحة مهني فوراً.",
      GENERAL:
        "يجب أن تكون النتيجة محددة ومتماسكة وقابلة للاستخدام المهني وقوية بما يكفي ليتمكن نظام ذكاء اصطناعي متقدم آخر من تنفيذها دون حاجة إلى توضيحات كبيرة."
    };

    return criteriaMap[promptType];
  }

  private buildEnglishExecutionValidationChecklist(promptType: PromptTypeValue): string {
    const checklistMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "Before returning, confirm the prompt defines the audience, angle, structure, voice, emotional effect, and quality bar clearly enough to guide a first-pass creative result.",
      CODE_GENERATION:
        "Before returning, confirm the prompt specifies scope, target environment, architecture, constraints, edge cases, verification steps, and the exact expected output shape.",
      DATA_ANALYSIS:
        "Before returning, confirm the prompt defines the analytical objective, metrics, assumptions, methodology, evidence boundaries, and the final output structure.",
      IMAGE_GENERATION:
        "Before returning, confirm the prompt defines subject, scene, style, lighting, composition, aspect ratio, and negative guidance with minimal ambiguity.",
      TRANSLATION:
        "Before returning, confirm the prompt defines source-target language intent, audience, tone, terminology rules, and format expectations.",
      SUMMARIZATION:
        "Before returning, confirm the prompt defines what must be preserved, what may be compressed, the final structure, and the expected level of concision.",
      QA:
        "Before returning, confirm the prompt defines the real question, the expected answer shape, any uncertainty handling, and the required level of directness.",
      ROLEPLAY:
        "Before returning, confirm the prompt defines the persona boundaries, scenario rules, real objective, and the concrete output to produce.",
      RESEARCH:
        "Before returning, confirm the prompt defines the research objective, scope, evidence standard, evaluation criteria, uncertainty rules, and final reporting structure.",
      BUSINESS:
        "Before returning, confirm the prompt defines the business objective, audience, decision criteria, constraints, priorities, and the final deliverable structure.",
      GENERAL:
        "Before returning, confirm the prompt defines the real objective, deliverable, audience, decision criteria, constraints, and success bar clearly enough for immediate execution."
    };

    return checklistMap[promptType];
  }

  private buildArabicExecutionValidationChecklist(promptType: PromptTypeValue): string {
    const checklistMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "قبل الرد، تأكد من أن البرومبت يحدد الجمهور، والزّاوية، والبنية، والصوت الأسلوبي، والأثر العاطفي، ومعيار الجودة بوضوح يكفي لإنتاج مخرج إبداعي قوي من المحاولة الأولى.",
      CODE_GENERATION:
        "قبل الرد، تأكد من أن البرومبت يحدد النطاق، وبيئة التشغيل المستهدفة، والمعمارية، والقيود، والحالات الطرفية، وخطوات التحقق، وشكل المخرج المتوقع بدقة.",
      DATA_ANALYSIS:
        "قبل الرد، تأكد من أن البرومبت يحدد الهدف التحليلي، والمؤشرات، والافتراضات، والمنهجية، وحدود الأدلة، والبنية النهائية للمخرجات.",
      IMAGE_GENERATION:
        "قبل الرد، تأكد من أن البرومبت يحدد الموضوع، والمشهد، والأسلوب، والإضاءة، والتكوين، ونسبة الأبعاد، والإرشادات السلبية بأقل قدر من الغموض.",
      TRANSLATION:
        "قبل الرد، تأكد من أن البرومبت يحدد اتجاه الترجمة أو التوطين، والجمهور، والنبرة، وقواعد المصطلحات، وتوقعات الصيغة.",
      SUMMARIZATION:
        "قبل الرد، تأكد من أن البرومبت يحدد ما يجب الحفاظ عليه، وما يمكن ضغطه، والبنية النهائية، ومستوى الإيجاز المطلوب.",
      QA:
        "قبل الرد، تأكد من أن البرومبت يحدد السؤال الحقيقي، وشكل الإجابة المتوقع، وكيفية التعامل مع عدم اليقين، ومستوى المباشرة المطلوب.",
      ROLEPLAY:
        "قبل الرد، تأكد من أن البرومبت يحدد حدود الشخصية، وقواعد السيناريو، والهدف الحقيقي، والمخرج المطلوب إنتاجه.",
      RESEARCH:
        "قبل الرد، تأكد من أن البرومبت يحدد هدف البحث، والنطاق، ومعيار الأدلة، ومعايير التقييم، وقواعد عدم اليقين، والبنية النهائية للتقرير.",
      BUSINESS:
        "قبل الرد، تأكد من أن البرومبت يحدد الهدف التجاري، والجمهور، ومعايير القرار، والقيود، والأولويات، وبنية المخرج النهائي.",
      GENERAL:
        "قبل الرد، تأكد من أن البرومبت يحدد الهدف الحقيقي، والمخرج المطلوب، والجمهور، ومعايير القرار، والقيود، ومعيار النجاح بوضوح يكفي للتنفيذ الفوري."
    };

    return checklistMap[promptType];
  }

  private buildEnglishExecutionAssumptionPolicy(promptType: PromptTypeValue): string {
    const genericPolicy = "Make at most three high-impact assumptions. State only the assumptions that materially change scope, output quality, or decision-making. Prefer common production defaults over speculative extras.";

    if (promptType === "RESEARCH" || promptType === "DATA_ANALYSIS") {
      return "Make at most three high-impact assumptions. State only the assumptions that materially affect the evidence base, scope, or interpretation. Label uncertain assumptions explicitly instead of presenting them as facts.";
    }

    if (promptType === "CODE_GENERATION") {
      return "Make at most three high-impact assumptions. State only the assumptions that materially affect environment, architecture, dependencies, security, or runtime behavior. Prefer production-safe defaults over convenience shortcuts.";
    }

    return genericPolicy;
  }

  private buildArabicExecutionAssumptionPolicy(promptType: PromptTypeValue): string {
    const genericPolicy = "ضع ما لا يزيد على ثلاثة افتراضات عالية الأثر. اذكر فقط الافتراضات التي تغيّر النطاق أو جودة المخرج أو القرار بشكل جوهري. وقدّم افتراضات إنتاجية شائعة على الإضافات التخيلية.";

    if (promptType === "RESEARCH" || promptType === "DATA_ANALYSIS") {
      return "ضع ما لا يزيد على ثلاثة افتراضات عالية الأثر. اذكر فقط الافتراضات التي تغيّر قاعدة الأدلة أو النطاق أو التفسير بشكل جوهري. واسم عدم اليقين صراحةً بدلاً من تقديمه كحقيقة.";
    }

    if (promptType === "CODE_GENERATION") {
      return "ضع ما لا يزيد على ثلاثة افتراضات عالية الأثر. اذكر فقط الافتراضات التي تغيّر البيئة أو المعمارية أو التبعيات أو الأمان أو سلوك التشغيل بشكل جوهري. وقدّم افتراضات آمنة للإنتاج على اختصارات الراحة.";
    }

    return genericPolicy;
  }

  private buildEnglishExecutionSourcePolicy(promptType: PromptTypeValue): string {
    switch (promptType) {
      case "RESEARCH":
        return "Use the strongest available evidence standard. Separate observed facts, assumptions, and recommendations clearly. Label uncertainty explicitly whenever a claim cannot be supported confidently.";
      case "DATA_ANALYSIS":
        return "Use only the provided data context or explicitly declared inferred assumptions. Define metrics precisely, keep calculations traceable, and avoid conclusions that outrun the available evidence.";
      case "BUSINESS":
        return "If external evidence is not provided, frame claims as hypotheses or strategic recommendations rather than established facts. Distinguish market assumptions from confirmed constraints.";
      default:
        return "";
    }
  }

  private buildArabicExecutionSourcePolicy(promptType: PromptTypeValue): string {
    switch (promptType) {
      case "RESEARCH":
        return "استخدم أقوى معيار أدلة متاح. افصل بوضوح بين الحقائق المرصودة والافتراضات والتوصيات. واسم عدم اليقين صراحةً كلما تعذّر دعم الادعاء بثقة.";
      case "DATA_ANALYSIS":
        return "استخدم فقط سياق البيانات المتاح أو الافتراضات المستنتجة المعلنة صراحةً. عرّف المؤشرات بدقة، وأبقِ الحسابات قابلة للتتبع، وتجنب استنتاجات تتجاوز الأدلة المتاحة.";
      case "BUSINESS":
        return "إذا لم تُقدَّم أدلة خارجية، فصغ الادعاءات كفرضيات أو توصيات استراتيجية لا كحقائق ثابتة. وافصل بين افتراضات السوق والقيود المؤكدة.";
      default:
        return "";
    }
  }

  private buildEnglishExecutionVerificationSteps(promptType: PromptTypeValue): string {
    switch (promptType) {
      case "CODE_GENERATION":
        return "Before finalizing, verify technical correctness, dependency realism, runtime assumptions, edge cases, security or accessibility concerns where relevant, and whether the requested output can be implemented and tested directly.";
      case "DATA_ANALYSIS":
        return "Before finalizing, verify metric definitions, assumption consistency, methodology fit, evidence traceability, and whether conclusions follow from the stated analysis path.";
      case "RESEARCH":
        return "Before finalizing, verify evidence traceability, uncertainty labeling, evaluation criteria coverage, and whether recommendations follow from the stated evidence and scope.";
      case "BUSINESS":
        return "Before finalizing, verify audience fit, decision logic, prioritization quality, and whether recommendations remain credible under the stated constraints.";
      default:
        return "";
    }
  }

  private buildArabicExecutionVerificationSteps(promptType: PromptTypeValue): string {
    switch (promptType) {
      case "CODE_GENERATION":
        return "قبل الإنهاء، تحقق من الصحة التقنية، وواقعية التبعيات، وافتراضات التشغيل، والحالات الطرفية، ومخاوف الأمان أو الوصول عند الصلة، وإمكانية تنفيذ المخرج المطلوب واختباره مباشرةً.";
      case "DATA_ANALYSIS":
        return "قبل الإنهاء، تحقق من تعريف المؤشرات، واتساق الافتراضات، وملاءمة المنهجية، وقابلية تتبع الأدلة، وأن الاستنتاجات ناتجة فعلاً عن مسار التحليل المذكور.";
      case "RESEARCH":
        return "قبل الإنهاء، تحقق من قابلية تتبع الأدلة، ووسم عدم اليقين، وشمول معايير التقييم، وأن التوصيات ناتجة فعلاً عن الأدلة والنطاق المذكورين.";
      case "BUSINESS":
        return "قبل الإنهاء، تحقق من ملاءمة الجمهور، ومنطق القرار، وجودة ترتيب الأولويات، وأن التوصيات تبقى ذات مصداقية ضمن القيود المذكورة.";
      default:
        return "";
    }
  }

  private buildEnglishExecutionAcceptanceTests(promptType: PromptTypeValue): string {
    switch (promptType) {
      case "CODE_GENERATION":
        return "A strong result lets a capable engineer answer yes to: is the scope explicit, are implementation constraints clear, are verification steps concrete, and can work begin without major technical clarification?";
      case "DATA_ANALYSIS":
        return "A strong result lets an analyst answer yes to: do we know what to measure, how to evaluate it, what assumptions govern interpretation, and what final analytical output to produce?";
      case "RESEARCH":
        return "A strong result lets a researcher answer yes to: is the evidence bar clear, are uncertainty rules explicit, and can the final report be produced without inventing criteria later?";
      case "BUSINESS":
        return "A strong result lets a stakeholder answer yes to: is the audience clear, are decision criteria explicit, are recommendations prioritized, and can action begin without further reframing?";
      default:
        return "";
    }
  }

  private buildArabicExecutionAcceptanceTests(promptType: PromptTypeValue): string {
    switch (promptType) {
      case "CODE_GENERATION":
        return "تُعد النتيجة قوية إذا استطاع مهندس كفء الإجابة بنعم على الأسئلة التالية: هل النطاق صريح؟ وهل قيود التنفيذ واضحة؟ وهل خطوات التحقق عملية؟ وهل يمكن بدء العمل من دون توضيحات تقنية كبيرة؟";
      case "DATA_ANALYSIS":
        return "تُعد النتيجة قوية إذا استطاع محلل الإجابة بنعم على الأسئلة التالية: هل نعرف ما الذي سنقيسه؟ وكيف سنقيّمه؟ وما الافتراضات التي تحكم التفسير؟ وما شكل المخرج التحليلي النهائي؟";
      case "RESEARCH":
        return "تُعد النتيجة قوية إذا استطاع باحث الإجابة بنعم على الأسئلة التالية: هل معيار الأدلة واضح؟ وهل قواعد عدم اليقين صريحة؟ وهل يمكن إنتاج التقرير النهائي من دون اختراع معايير لاحقاً؟";
      case "BUSINESS":
        return "تُعد النتيجة قوية إذا استطاع صاحب مصلحة الإجابة بنعم على الأسئلة التالية: هل الجمهور واضح؟ وهل معايير القرار صريحة؟ وهل التوصيات مرتبة بالأولوية؟ وهل يمكن البدء بالعمل من دون إعادة صياغة إضافية؟";
      default:
        return "";
    }
  }

  private buildEnglishExecutionFailureModes(promptType: PromptTypeValue): string {
    const failureMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "Avoid generic phrasing, weak voice, clichés, and deliverables that fail to define audience, structure, or creative angle.",
      CODE_GENERATION:
        "Avoid pseudo-code without implementation detail, invented APIs, skipped edge cases, undefined runtime assumptions, and missing verification steps.",
      DATA_ANALYSIS:
        "Avoid unsupported conclusions, vague metrics, hidden assumptions, and analysis plans that cannot be reproduced or checked.",
      IMAGE_GENERATION:
        "Avoid mood-only descriptions, conflicting visual instructions, missing aspect ratio, and absent negative guidance when artifacts are likely.",
      TRANSLATION:
        "Avoid literal but unnatural phrasing, terminology drift, register mismatch, and dropped nuances that change meaning.",
      SUMMARIZATION:
        "Avoid leaving out key decisions or risks, introducing new claims, and flattening the information hierarchy into undifferentiated notes.",
      QA:
        "Avoid rambling, answer-shaped summaries that miss the actual question, and confidence that exceeds the available support.",
      ROLEPLAY:
        "Avoid breaking character unnecessarily, ignoring the actual objective, or improvising constraints that were never requested.",
      RESEARCH:
        "Avoid unsupported claims, shallow synthesis, unclear criteria, and recommendations that are not traceable to the evidence.",
      BUSINESS:
        "Avoid generic business clichés, unprioritized recommendation lists, weak audience targeting, and missing decision criteria.",
      GENERAL:
        "Avoid vague language, fabricated facts, shallow summaries, and conflicting instructions that leave key decisions unresolved."
    };

    return failureMap[promptType];
  }

  private buildArabicExecutionFailureModes(promptType: PromptTypeValue): string {
    const failureMap: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING:
        "تجنب الصياغة العامة، والصوت الأسلوبي الضعيف، والكليشيهات، والمخرجات التي لا تحدد الجمهور أو البنية أو الزاوية الإبداعية.",
      CODE_GENERATION:
        "تجنب الشفرة شبهية التنفيذ بلا تفاصيل، والواجهات البرمجية المختلقة، وتجاوز الحالات الطرفية، وافتراضات التشغيل غير المعلنة، وغياب خطوات التحقق.",
      DATA_ANALYSIS:
        "تجنب الاستنتاجات غير المسندة، والمؤشرات الضبابية، والافتراضات الخفية، وخطط التحليل التي لا يمكن إعادة إنتاجها أو التحقق منها.",
      IMAGE_GENERATION:
        "تجنب الأوصاف القائمة على المزاج فقط، والتعليمات البصرية المتضاربة، وغياب نسبة الأبعاد، وترك الإرشادات السلبية عندما تكون العيوب متوقعة.",
      TRANSLATION:
        "تجنب الصياغة الحرفية غير الطبيعية، وانجراف المصطلحات، واختلال المستوى الأسلوبي، وإسقاط الفروق التي تغيّر المعنى.",
      SUMMARIZATION:
        "تجنب إسقاط القرارات أو المخاطر الأساسية، وإدخال ادعاءات جديدة، وتسطيح الهرم المعلوماتي إلى ملاحظات غير مميزة.",
      QA:
        "تجنب الإطالة، والملخصات التي تبدو جواباً لكنها لا تعالج السؤال الحقيقي، والثقة التي تتجاوز ما تسنده المعطيات.",
      ROLEPLAY:
        "تجنب كسر الشخصية بلا داعٍ، أو تجاهل الهدف الحقيقي، أو اختراع قيود لم تُطلب أصلاً.",
      RESEARCH:
        "تجنب الادعاءات غير المسندة، والتركيب السطحي، ومعايير التقييم غير الواضحة، والتوصيات غير القابلة للتتبع إلى الأدلة.",
      BUSINESS:
        "تجنب الكليشيهات التجارية العامة، وقوائم التوصيات غير المرتبة، وضعف استهداف الجمهور، وغياب معايير القرار.",
      GENERAL:
        "تجنب اللغة الضبابية، والحقائق المختلقة، والملخصات السطحية، والتعليمات المتضاربة التي تترك القرارات الجوهرية بلا حسم."
    };

    return failureMap[promptType];
  }

  private buildEnglishRole(promptType: PromptTypeValue, domain: string): string {
    const map: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING: "You are an elite creative director and narrative prompt designer.",
      CODE_GENERATION: "You are a principal software engineer and meticulous code-generation assistant.",
      DATA_ANALYSIS: "You are a senior data analyst who explains findings with rigor and clarity.",
      IMAGE_GENERATION: "You are a visual prompt strategist for high-fidelity generative imagery.",
      TRANSLATION: "You are a professional bilingual translator and localization editor.",
      SUMMARIZATION: "You are an expert editor who distills complex material into concise insight.",
      QA: "You are a domain-savvy subject-matter expert answering with precision.",
      ROLEPLAY: "You are a high-context roleplay facilitator who stays consistent and believable.",
      RESEARCH: "You are a research strategist who structures evidence-driven investigation.",
      BUSINESS: "You are a senior business strategist and persuasive communications specialist.",
      GENERAL: "You are a world-class prompt engineer optimizing outcomes for advanced AI systems."
    };

    return `${map[promptType]} Focus on ${domain}.`;
  }

  private buildArabicRole(promptType: PromptTypeValue, domain: string): string {
    const map: Record<PromptTypeValue, string> = {
      CREATIVE_WRITING: "أنت مدير إبداعي خبير ومهندس برومبتات سردية متقدم.",
      CODE_GENERATION: "أنت مهندس برمجيات رئيسي ومتخصص في توليد حلول برمجية دقيقة.",
      DATA_ANALYSIS: "أنت محلل بيانات أول يقدّم استنتاجات منهجية وواضحة.",
      IMAGE_GENERATION: "أنت مصمم برومبتات بصرية متخصص في إنتاج أوصاف تصويرية عالية الجودة.",
      TRANSLATION: "أنت مترجم محترف وخبير توطين لغوي ثنائي اللغة.",
      SUMMARIZATION: "أنت محرر خبير يحوّل المواد المعقدة إلى خلاصة واضحة ومركزة.",
      QA: "أنت خبير موضوعي يجيب بدقة ووضوح.",
      ROLEPLAY: "أنت ميسّر لعب أدوار يحافظ على الاتساق والسياق طوال التفاعل.",
      RESEARCH: "أنت باحث استراتيجي ينظم التحقيقات المعتمدة على الأدلة.",
      BUSINESS: "أنت استراتيجي أعمال أول ومتخصص في الرسائل المقنعة.",
      GENERAL: "أنت مهندس برومبتات عالمي المستوى يحسن النتائج للأنظمة الذكية المتقدمة."
    };

    return `${map[promptType]} ركّز على مجال ${domain}.`;
  }

  private formatPrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    targetAI: TargetAIValue,
    promptType: PromptTypeValue,
    framework: PromptFramework,
    isProductBuild: boolean
  ): string {
    if (IMAGE_TARGETS.includes(targetAI) || promptType === "IMAGE_GENERATION") {
      return this.formatImagePrompt(sections, language, targetAI, framework);
    }

    if (targetAI === "CHATGPT") {
      return this.formatChatGptPrompt(sections, language, framework, isProductBuild);
    }

    if (targetAI === "CLAUDE") {
      return this.formatClaudePrompt(sections, language, framework, isProductBuild);
    }

    if (targetAI === "GEMINI") {
      return this.formatGeminiPrompt(sections, language, framework, isProductBuild);
    }

    if (targetAI === "COPILOT") {
      return this.formatCopilotPrompt(sections, language, framework, isProductBuild);
    }

    return this.formatGenericPrompt(sections, language, framework, isProductBuild);
  }

  private formatSection(
    key: keyof PromptSections,
    sections: PromptSections,
    language: SupportedLanguage
  ): string {
    return `[${SECTION_LABELS[language][key]}]\n${sections[key] ?? ""}`;
  }

  private formatGenericPrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    _framework: PromptFramework,
    _isProductBuild: boolean
  ): string {
    const orderedKeys: Array<keyof PromptSections> = [
      "role",
      "objective",
      "context",
      "task",
      "deliverable",
      "outputFormat",
      "toneAndStyle",
      "decisionRules",
      "responseBudget",
      "successCriteria",
      "validationChecklist",
      "assumptionPolicy",
      "sourcePolicy",
      "verificationSteps",
      "acceptanceTests",
      "constraints",
      "failureModes",
      "examples",
      "executionApproach"
    ];
    const parts = orderedKeys
      .filter((key) => Boolean(sections[key]?.trim()))
      .map((key) => this.formatSection(key, sections, language));

    return parts.join("\n\n");
  }

  private formatChatGptPrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    framework: PromptFramework,
    isProductBuild: boolean
  ): string {
    return [
      language === "ar" ? "[SYSTEM MESSAGE]" : "[SYSTEM MESSAGE]",
      language === "ar"
        ? "اعتبر مجموعة التعليمات التالية موجز تنفيذ مباشر. نفّذ الهدف الحقيقي، واحتفظ بكل القيود المهمة، وابقِ المخرج في صورة نتيجة نهائية واضحة بدلاً من تحليل العملية أو تلخيصها."
        : "Treat the instruction set below as a direct execution brief. Complete the real objective, preserve all important constraints, and keep the output in final-answer form rather than process notes, shallow summarization, or visible reasoning.",
      "",
      "[USER MESSAGE]",
      this.formatGenericPrompt(sections, language, framework, isProductBuild)
    ].join("\n");
  }

  private formatClaudePrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    _framework: PromptFramework,
    _isProductBuild: boolean
  ): string {
    return [
      `<context>\n${this.formatSection("role", sections, language)}\n\n${this.formatSection("objective", sections, language)}\n\n${this.formatSection("context", sections, language)}\n</context>`,
      `<task>\n${this.formatSection("task", sections, language)}\n\n${this.formatSection("deliverable", sections, language)}\n</task>`,
      `<instructions>\n${
        language === "ar"
          ? "اتبع التعليمات التالية بوصفها موجز تنفيذ مباشر ومفصل، ونفّذ الهدف الحقيقي مع إبقاء المخرج في صيغة نهائية قابلة للاستخدام فوراً:\n\n"
          : "Follow these instructions as a direct, detailed execution brief and complete the real objective while keeping the output in immediate, final-use form:\n\n"
      }${this.formatSection("outputFormat", sections, language)}\n\n${this.formatSection("toneAndStyle", sections, language)}\n\n${this.formatSection("decisionRules", sections, language)}\n\n${this.formatSection("responseBudget", sections, language)}\n\n${this.formatSection("successCriteria", sections, language)}\n\n${this.formatSection("constraints", sections, language)}\n\n${this.formatSection("failureModes", sections, language)}\n\n${this.formatSection("examples", sections, language)}\n\n${this.formatSection("executionApproach", sections, language)}\n</instructions>`
    ].join("\n\n");
  }

  private formatGeminiPrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    framework: PromptFramework,
    isProductBuild: boolean
  ): string {
    return [
      language === "ar"
        ? `[GROUNDING]\nاستند فقط إلى المعلومات المتاحة في هذا الموجز، وصرّح بالافتراضات عند الضرورة.`
        : "[GROUNDING]\nBase the answer on the provided brief and state assumptions only when necessary.",
      this.formatGenericPrompt(sections, language, framework, isProductBuild)
    ].join("\n\n");
  }

  private formatCopilotPrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    framework: PromptFramework,
    isProductBuild: boolean
  ): string {
    return [
      "[CODE CONTEXT]",
      language === "ar"
        ? "افترض أنك تعمل داخل قاعدة كود إنتاجية، واذكر لغة البرمجة والبنية المطلوبة والاختبارات اللازمة."
        : "Assume you are working inside a production codebase. Specify the language, architecture constraints, and the tests that must accompany the change.",
      "",
      this.formatGenericPrompt(sections, language, framework, isProductBuild)
    ].join("\n");
  }

  private formatImagePrompt(
    sections: PromptSections,
    language: SupportedLanguage,
    targetAI: TargetAIValue,
    _framework: PromptFramework
  ): string {
    const imageLabels =
      language === "ar"
        ? {
            prompt: "البرومبت البصري",
            style: "الأسلوب",
            lighting: "الإضاءة",
            composition: "التكوين",
            ratio: "نسبة الأبعاد",
            negative: "العناصر المستبعدة"
          }
        : {
            prompt: "VISUAL PROMPT",
            style: "STYLE",
            lighting: "LIGHTING",
            composition: "COMPOSITION",
            ratio: "ASPECT RATIO",
            negative: "NEGATIVE PROMPT"
          };

    const styleText =
      language === "ar"
        ? "سينمائي، غني بالتفاصيل، عميق بصرياً، مع جودة احترافية."
        : "cinematic, high-detail, layered, production-quality visuals.";
    const lightingText =
      language === "ar"
        ? "إضاءة درامية متوازنة مع إبراز العنصر الأساسي بوضوح."
        : "dramatic balanced lighting that cleanly highlights the primary subject.";
    const compositionText =
      language === "ar"
        ? `استخدم تكويناً واضحاً يحدّد العنصر المحوري والعمق والخلفية، وصغ الوصف ليتوافق مع ${targetAI}.`
        : `Use clear visual framing to define focal subject, depth, and background while optimizing phrasing for ${targetAI}.`;
    const ratioText = targetAI === "MIDJOURNEY" ? "--ar 16:9" : "16:9";
    const negativeText =
      language === "ar"
        ? "تجنّب التشويش، والأطراف المقطوعة، والتشريح غير الصحيح، والنصوص العشوائية، والملمس منخفض الجودة."
        : "Avoid clutter, cropped limbs, malformed anatomy, random text, and low-quality textures.";

    return [
      `[${imageLabels.prompt}]\n${sections.task}`,
      `[${imageLabels.style}]\n${styleText}`,
      `[${imageLabels.lighting}]\n${lightingText}`,
      `[${imageLabels.composition}]\n${compositionText}`,
      `[${imageLabels.ratio}]\n${ratioText}`,
      `[${imageLabels.negative}]\n${negativeText}`,
      this.formatSection("toneAndStyle", sections, language),
      this.formatSection("constraints", sections, language)
    ].join("\n\n");
  }

  private buildImprovementTips(
    language: SupportedLanguage,
    promptType: PromptTypeValue,
    targetAI: TargetAIValue
  ): string[] {
    if (language === "ar") {
      return [
        "أضف معلومات أكثر تحديداً عن الجمهور أو بيئة الاستخدام أو نوع المخرج المطلوب لتحسين دقة النتائج.",
        `حدّد معايير نجاح واضحة إذا كان الهدف مرتبطاً بفئة ${toSentenceCase(promptType.toLowerCase().replaceAll("_", " "))}.`,
        targetAI === "GENERAL"
          ? "إذا كنت تعرف النموذج المستهدف فاذكره للحصول على تحسينات أكثر تخصصاً."
          : `أضف متطلبات خاصة بالنموذج ${targetAI} إذا كنت تريد ناتجاً أكثر دقة.`
      ];
    }

    return [
      "Add one or two concrete constraints about audience, scope, or business context to improve precision.",
      `State what success looks like for this ${promptType.toLowerCase().replaceAll("_", " ")} request so the model can optimize for the right outcome.`,
      targetAI === "GENERAL"
        ? "Specify the target AI model when you know it to unlock model-specific prompt optimization."
        : `Add model-specific requirements for ${targetAI} if you need tighter optimization.`
    ];
  }
}

export const promptBuilder = new PromptBuilder();
