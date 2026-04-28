import { promptBuilder } from "../../src/services/promptBuilder.js";

describe("promptBuilder", () => {
  it("builds structured sections for a short English request", () => {
    const result = promptBuilder.build({
      rawInput: "Write a blog post about coffee for startup founders"
    });

    expect(result.sections.context).toContain("real objective");
    expect(result.sections.objective).toContain("creative deliverable");
    expect(result.sections.task).toContain("Produce the requested creative deliverable");
    expect(result.sections.task).not.toContain("Transform the idea");
    expect(result.generatedPrompt).toContain("[ROLE]");
    expect(result.generatedPrompt).toContain("[OBJECTIVE]");
    expect(result.generatedPrompt).toContain("[CONTEXT]");
    expect(result.generatedPrompt).toContain("[TASK]");
    expect(result.generatedPrompt).toContain("[DELIVERABLE]");
    expect(result.generatedPrompt).toContain("[OUTPUT FORMAT]");
    expect(result.generatedPrompt).toContain("[DECISION RULES]");
    expect(result.generatedPrompt).toContain("[RESPONSE BUDGET]");
    expect(result.generatedPrompt).toContain("[SUCCESS CRITERIA]");
    expect(result.generatedPrompt).toContain("[VALIDATION CHECKLIST]");
    expect(result.generatedPrompt).toContain("[ASSUMPTION POLICY]");
    expect(result.generatedPrompt).toContain("[FAILURE MODES TO AVOID]");
    expect(result.generatedPrompt).toContain("[EXECUTION APPROACH]");
    expect(result.promptType).toBe("CREATIVE_WRITING");
  });

  it("builds Arabic output when the input is Arabic", () => {
    const result = promptBuilder.build({
      rawInput: "اكتب وصفاً احترافياً لخدمة استشارية في التسويق الرقمي"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.domain).toBe("التسويق");
    expect(result.rtlRequired).toBe(true);
    expect(result.generatedPrompt).toContain("[الدور]");
    expect(result.generatedPrompt).toContain("[الهدف]");
    expect(result.sections.context).toContain("طلب تنفيذ مباشر");
    expect(result.sections.objective).toContain("تعليمات");
    expect(result.sections.task).not.toContain("حوّل الفكرة");
    expect(result.sections.toneAndStyle).toContain("العربية الفصحى الحديثة");
    expect(result.sections.constraints).toContain("ابدأ بالمخرج المطلوب مباشرةً");
    expect(result.sections.executionApproach).toContain("معايير النجاح");
  });

  it("classifies Arabic professional service briefs as business prompts", () => {
    const result = promptBuilder.build({
      rawInput: "اكتب وصفاً احترافياً لخدمة استشارية في التسويق الرقمي"
    });

    expect(result.promptType).toBe("BUSINESS");
    expect(result.domain).toBe("التسويق");
    expect(result.sections.role).toContain("استراتيجي أعمال");
    expect(result.sections.objective).toContain("تجارية");
    expect(result.sections.deliverable).toContain("موجزاً تجارياً");
  });

  it("classifies Arabic research prompts correctly instead of routing them to product-build output", () => {
    const result = promptBuilder.build({
      rawInput: "ابحث أفضل نموذج تسعير لمنتج تحليلات SaaS موجه للشركات"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.promptType).toBe("RESEARCH");
    expect(result.domain).toBe("المالية");
    expect(result.sections.role).toContain("باحث استراتيجي");
    expect(result.sections.objective).toContain("موجز بحث");
    expect(result.sections.task).toContain("ابحث الموضوع بشكل منهجي");
    expect(result.sections.sourcePolicy).toContain("أدلة");
    expect(result.sections.validationChecklist).toContain("معيار الأدلة");
    expect(result.sections.context).not.toContain("طلب منتج حقيقي");
  });

  it("classifies Arabic creative requests correctly for ChatGPT-targeted output", () => {
    const result = promptBuilder.build({
      rawInput: "اكتب قصة إطلاق لعلامة قهوة تستهدف مؤسسي الشركات الناشئة",
      targetAI: "CHATGPT"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.promptType).toBe("CREATIVE_WRITING");
    expect(result.domain).toBe("التسويق");
    expect(result.generatedPrompt).toContain("[SYSTEM MESSAGE]");
    expect(result.sections.role).toContain("مدير إبداعي");
    expect(result.sections.task).toContain("المخرج الإبداعي");
  });

  it("builds a direct product-build prompt for short English app ideas", () => {
    const result = promptBuilder.build({
      rawInput: "build an application for kids to teach words"
    });

    expect(result.promptType).toBe("CODE_GENERATION");
    expect(result.domain).toBe("education technology");
    expect(result.tone).toBe("professional, implementation-ready, and audience-aware");
    expect(result.sections.role).toContain("educational product designer");
    expect(result.sections.role).toContain("product specifications and build instructions");
    expect(result.sections.role).not.toContain("build prompts");
    expect(result.sections.objective).toContain("production-grade product specification");
    expect(result.sections.context).toContain("real product request");
    expect(result.sections.context).toContain("execution-ready instructions");
    expect(result.sections.context).not.toContain("build-ready prompt");
    expect(result.sections.context).not.toContain("framework");
    expect(result.sections.task).toContain("children's vocabulary-learning application");
    expect(result.sections.task).toContain("representative API endpoints and example data objects");
    expect(result.sections.task).toContain("offline or graceful-degradation expectations");
    expect(result.sections.task).toContain("localization and right-to-left requirements");
    expect(result.sections.task).toContain("future enhancements");
    expect(result.sections.task).not.toContain("Transform the idea");
    expect(result.sections.deliverable).toContain("implementation brief");
    expect(result.sections.deliverable).toContain("representative API endpoints");
    expect(result.outputFormat).toContain("Product Goal");
    expect(result.outputFormat).toContain("Learning Experience");
    expect(result.sections.decisionRules).toContain("child safety");
    expect(result.sections.decisionRules).toContain("complete section coverage");
    expect(result.sections.responseBudget).toContain("3 to 5 bullets");
    expect(result.sections.responseBudget).toContain("If the response budget feels tight");
    expect(result.sections.successCriteria).toContain("implementation immediately");
    expect(result.sections.successCriteria).toContain("future enhancements");
    expect(result.sections.successCriteria).toContain("offline behavior");
    expect(result.sections.successCriteria).toContain("fits in one complete response");
    expect(result.sections.validationChecklist).toContain("age range");
    expect(result.sections.validationChecklist).toContain("example data objects");
    expect(result.sections.validationChecklist).toContain("future enhancements");
    expect(result.sections.validationChecklist).toContain("output format appears once");
    expect(result.sections.assumptionPolicy).toContain("at most three");
    expect(result.sections.verificationSteps).toContain("feature maps");
    expect(result.sections.verificationSteps).toContain("offline or localization requirement");
    expect(result.sections.acceptanceTests).toContain("scope v1");
    expect(result.sections.acceptanceTests).toContain("example payloads");
    expect(result.sections.acceptanceTests).toContain("future roadmap");
    expect(result.sections.constraints).toContain("Do not include internal framework names");
    expect(result.sections.constraints).not.toContain("turning the idea into a prompt");
    expect(result.sections.failureModes).toContain("generic edtech advice");
    expect(result.sections.failureModes).toContain("placeholder APIs");
    expect(result.sections.failureModes).toContain("Future Enhancements");
    expect(result.generatedPrompt).toContain("[VALIDATION CHECKLIST]");
    expect(result.generatedPrompt).toContain("[ASSUMPTION POLICY]");
    expect(result.generatedPrompt).toContain("[VERIFICATION STEPS]");
    expect(result.generatedPrompt).toContain("[ACCEPTANCE TESTS]");
    expect(result.generatedPrompt).toContain("[EXECUTION APPROACH]");
    expect(result.generatedPrompt).toContain("[SUCCESS CRITERIA]");
    expect(result.generatedPrompt.startsWith("Apply the")).toBe(false);
  });

  it("prefers detected input language over the user preference fallback", () => {
    const result = promptBuilder.build({
      rawInput: "خطة محتوى لمتجر قهوة مختصة في دبي",
      preferredLanguage: "en"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.rtlRequired).toBe(true);
    expect(result.generatedPrompt).toContain("[الدور]");
  });

  it("builds a direct Arabic product-build prompt for child learning concepts", () => {
    const result = promptBuilder.build({
      rawInput: "ابنِ تطبيقاً للأطفال لتعليم الكلمات",
      preferredLanguage: "en"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.promptType).toBe("CODE_GENERATION");
    expect(result.domain).toBe("تقنية التعليم");
    expect(result.sections.role).toContain("تجربة الاستخدام الآمنة للأطفال");
    expect(result.sections.role).toContain("مواصفات منتج");
    expect(result.sections.role).not.toContain("برومبتات بناء");
    expect(result.sections.objective).toContain("مواصفة منتج");
    expect(result.sections.context).toContain("هدف المستخدم الحقيقي");
    expect(result.sections.context).toContain("تعليمات تنفيذ مباشرة");
    expect(result.sections.context).not.toContain("إطار");
    expect(result.sections.context).not.toContain("برومبت بناء");
    expect(result.sections.task).toContain("صمّم تطبيقاً جاهزاً للإنتاج لتعليم الأطفال المفردات");
    expect(result.sections.task).toContain("أمثلة ممثلة للواجهات البرمجية وكائنات البيانات");
    expect(result.sections.task).toContain("العمل دون اتصال");
    expect(result.sections.task).toContain("دعم الاتجاه من اليمين إلى اليسار");
    expect(result.sections.task).toContain("التحسينات المستقبلية");
    expect(result.sections.task).not.toContain("حوّل الفكرة");
    expect(result.sections.deliverable).toContain("موجز تنفيذ");
    expect(result.sections.deliverable).toContain("أمثلة هياكل بيانات");
    expect(result.outputFormat).toContain("الهدف من المنتج");
    expect(result.outputFormat).toContain("تجربة التعلّم");
    expect(result.sections.decisionRules).toContain("سلامة الأطفال");
    expect(result.sections.decisionRules).toContain("تغطية كاملة");
    expect(result.sections.responseBudget).toContain("3 إلى 5 نقاط");
    expect(result.sections.responseBudget).toContain("إذا شعرت بضيق ميزانية الاستجابة");
    expect(result.sections.successCriteria).toContain("البدء بالتنفيذ فوراً");
    expect(result.sections.successCriteria).toContain("التحسينات المستقبلية");
    expect(result.sections.successCriteria).toContain("العمل دون اتصال");
    expect(result.sections.successCriteria).toContain("استجابة واحدة");
    expect(result.sections.validationChecklist).toContain("الفئة العمرية");
    expect(result.sections.validationChecklist).toContain("أمثلة ممثلة للواجهات البرمجية");
    expect(result.sections.validationChecklist).toContain("التحسينات المستقبلية");
    expect(result.sections.validationChecklist).toContain("كل قسم مذكور");
    expect(result.sections.assumptionPolicy).toContain("ثلاثة افتراضات");
    expect(result.sections.verificationSteps).toContain("كل ميزة رئيسية");
    expect(result.sections.verificationSteps).toContain("دون اتصال");
    expect(result.sections.acceptanceTests).toContain("تحديد نطاق النسخة الأولى");
    expect(result.sections.acceptanceTests).toContain("حمولات نموذجية");
    expect(result.sections.acceptanceTests).toContain("خارطة طريق مستقبلية");
    expect(result.sections.constraints).toContain("لا تتضمن أسماء الأطر الداخلية");
    expect(result.sections.constraints).not.toContain("برومبت");
    expect(result.sections.failureModes).toContain("تقنية التعليم العامة");
    expect(result.sections.failureModes).toContain("التحسينات المستقبلية");
    expect(result.sections.failureModes).toContain("هياكل بيانات ضبابية");
    expect(result.generatedPrompt).toContain("[قائمة التحقق]");
    expect(result.generatedPrompt).toContain("[سياسة الافتراضات]");
    expect(result.generatedPrompt).toContain("[خطوات التحقق]");
    expect(result.generatedPrompt).toContain("[معايير القبول]");
    expect(result.generatedPrompt).toContain("[منهج التنفيذ]");
    expect(result.generatedPrompt).toContain("[معايير النجاح]");
    expect(result.generatedPrompt.startsWith("طبّق إطار")).toBe(false);
  });

  it("treats concise English product concepts as real build requests", () => {
    const result = promptBuilder.build({
      rawInput: "kids word app"
    });

    expect(result.promptType).toBe("CODE_GENERATION");
    expect(result.domain).toBe("education technology");
    expect(result.sections.context).toContain("real product request");
    expect(result.sections.task).toContain("children's vocabulary-learning application");
    expect(result.outputFormat).toContain("Product Goal");
  });

  it("classifies concise pricing phrases as business prompts instead of generic output", () => {
    const result = promptBuilder.build({
      rawInput: "SaaS pricing"
    });

    expect(result.promptType).toBe("BUSINESS");
    expect(result.domain).toBe("finance");
    expect(result.sections.objective).toContain("business-ready instruction set");
    expect(result.sections.task).toContain("decision criteria");
    expect(result.sections.deliverable).toContain("business-ready brief");
  });

  it("localizes selected tone values for Arabic prompts instead of leaking English labels", () => {
    const result = promptBuilder.build({
      rawInput: "إتاحة React",
      tone: "Technical"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.tone).toBe("تقنية ودقيقة");
    expect(result.sections.toneAndStyle).toContain("استخدم نبرة تقنية ودقيقة");
    expect(result.sections.toneAndStyle).not.toContain("Technical");
  });

  it("detects code generation and keeps all required sections", () => {
    const result = promptBuilder.build({
      rawInput: "Build a TypeScript Express endpoint to validate JWTs"
    });

    expect(result.promptType).toBe("CODE_GENERATION");
    expect(result.generatedPrompt.startsWith("[ROLE]")).toBe(true);
    expect(result.generatedPrompt).toContain("[ROLE]");
    expect(result.generatedPrompt).toContain("[OBJECTIVE]");
    expect(result.generatedPrompt).toContain("[VALIDATION CHECKLIST]");
    expect(result.generatedPrompt).toContain("[ASSUMPTION POLICY]");
    expect(result.generatedPrompt).toContain("[VERIFICATION STEPS]");
    expect(result.generatedPrompt).toContain("[ACCEPTANCE TESTS]");
    expect(result.generatedPrompt).toContain("[RESPONSE BUDGET]");
    expect(result.generatedPrompt).toContain("[EXAMPLES]");
    expect(result.generatedPrompt).toContain("[EXECUTION APPROACH]");
  });

  it("does not treat code refactor requests as greenfield product builds", () => {
    const result = promptBuilder.build({
      rawInput: "create a prompt to refactor a React dashboard for accessibility and performance"
    });

    expect(result.promptType).toBe("CODE_GENERATION");
    expect(result.sections.context).toContain("real objective");
    expect(result.sections.context).not.toContain("real product concept");
    expect(result.sections.objective).toContain("production-ready solution");
    expect(result.outputFormat).toContain("implementation notes");
    expect(result.generatedPrompt.startsWith("[ROLE]")).toBe(true);
  });

  it("detects rough Arabic engineering requests as code generation and starts directly with sections", () => {
    const result = promptBuilder.build({
      rawInput: "راجع لوحة تحكم React وحسّن الأداء وإمكانية الوصول"
    });

    expect(result.detectedLanguage).toBe("ar");
    expect(result.promptType).toBe("CODE_GENERATION");
    expect(result.generatedPrompt.startsWith("[الدور]")).toBe(true);
  });

  it("wraps ChatGPT-targeted prompts as a direct execution brief instead of framework meta instructions", () => {
    const result = promptBuilder.build({
      rawInput: "Write a launch email for a B2B SaaS product",
      targetAI: "CHATGPT"
    });

    expect(result.sections.context).toContain("real objective");
    expect(result.sections.context).not.toContain("real product concept");
    expect(result.generatedPrompt).toContain("[SYSTEM MESSAGE]");
    expect(result.generatedPrompt).toContain("Treat the instruction set below as a direct execution brief");
    expect(result.generatedPrompt).not.toContain("Use the Role, Task, Format framework");
    expect(result.generatedPrompt).not.toContain("prompt-engineering commentary");
    expect(result.generatedPrompt).toContain("[OBJECTIVE]");
  });

  it("keeps image prompts free of internal framework references", () => {
    const result = promptBuilder.build({
      rawInput: "create a cinematic poster prompt for a robotics conference in Dubai",
      targetAI: "MIDJOURNEY"
    });

    expect(result.promptType).toBe("IMAGE_GENERATION");
    expect(result.generatedPrompt).toContain("[VISUAL PROMPT]");
    expect(result.generatedPrompt).not.toContain("Role, Task, Format");
    expect(result.generatedPrompt).not.toContain("Task, Role, Audience, Create, Execute");
  });

  it("formats detected image prompts visually even when target AI stays general", () => {
    const result = promptBuilder.build({
      rawInput: "robotics poster"
    });

    expect(result.promptType).toBe("IMAGE_GENERATION");
    expect(result.framework).toBe("TRACE");
    expect(result.generatedPrompt).toContain("[VISUAL PROMPT]");
    expect(result.generatedPrompt).toContain("[STYLE]");
    expect(result.generatedPrompt).toContain("[NEGATIVE PROMPT]");
  });
});
