// Generated from web/src/domain/vacancy.ts; run node scripts/generate-matching-runtime.mjs. DO NOT EDIT.
import { semanticComparisonPending } from "./semanticMatching.js";
import { calculateMatchingScore, MATCHING_SCORE_CONTRACT_VERSION, } from "./matchingScore.js";
export const VACANCY_DEFINITION_VERSION = "1.3.0";
export const VACANCY_MATCHING_VERSION = "vacancy-matching-explainable-5.0.0";
export const VACANCY_ASSISTANT_VERSION = "vacancy-assistant-contextual-1.3.0";
export const OCCUPATION_RESOLUTION_CONTRACT = "occupation-resolution-on-demand-2.0.0";
export const VACANCY_STRUCTURE_CONTRACT = "vacancy-structure-profile-aligned-2.1.0";
export function occupationResolutionMessage(resolution) {
    if (resolution.status === "resolved" && resolution.canonicalLabel)
        return `Referência profissional: ${resolution.canonicalLabel}.`;
    if (resolution.status === "pending_agent")
        return "O Prisma está validando a referência somente nos snapshots oficiais ESCO e O*NET.";
    if (resolution.status === "needs_human_review")
        return "O Prisma não tomou uma decisão segura. Escolha uma referência oficial no explorador ou declare explicitamente que ela não existe.";
    if (resolution.status === "manual_allowed")
        return "A ausência de referência oficial foi registrada. Agora é possível cadastrar um conceito ocupacional interno da empresa.";
    if (resolution.status === "service_unavailable")
        return "A referência profissional está indisponível agora. O rascunho foi preservado para nova tentativa.";
    return "O Prisma não tomou uma decisão segura. Use o explorador de referências oficiais para continuar.";
}
export function emptyVacancyDraft() {
    return {
        id: null,
        title: "",
        area: "",
        location: "",
        workArrangement: null,
        employmentType: "",
        occupancy: "vacant",
        occupantPersonId: null,
        mission: "",
        responsibilities: [],
        expectedOutcomes: [],
        requirements: [],
        contextItems: [],
        sourceKind: "manual",
        sourceVacancyId: null,
        jobRoleId: null,
        referenceConceptId: null,
        saveAsRole: false,
        changeKind: "material",
        structureSource: null,
    };
}
export function sourceKindAfterOccupationReference(draft) {
    if (draft.structureSource)
        return "assisted_description";
    return draft.sourceKind === "manual" ? "knowledge_reference" : draft.sourceKind;
}
export function newVacancyRequirement(label = "", category = inferRequirementCategory(label)) {
    return {
        stableId: createId(),
        label,
        category,
        proposedCategory: category,
        importance: "unclassified",
        origin: "human",
        categoryConfirmed: false,
        importanceConfirmed: false,
        observedTerm: label || null,
        conceptId: null,
        relationMode: "direct",
        relatedSignals: [],
    };
}
export function newManualVacancyRequirement(label = "", category = inferRequirementCategory(label)) {
    return { ...newVacancyRequirement(label, category), importance: "required", importanceConfirmed: true };
}
export function materializeVacancyFromProfessionalReference(draft, reference) {
    const requirements = reference.relations.flatMap((relation) => {
        const category = referenceRelationCategory(relation);
        if (!category || !relation.label.trim())
            return [];
        return [{ ...newVacancyRequirement(relation.label, category), origin: "description", observedTerm: relation.label, conceptId: relation.targetConceptId,
                sourceSuggestionId: relation.id, proposedCategory: category, categoryConfirmed: false, importance: "unclassified", importanceConfirmed: false }];
    });
    const deduplicated = requirements.filter((item, index, all) => all.findIndex((candidate) => candidate.conceptId === item.conceptId || (candidate.category === item.category && normalize(candidate.label) === normalize(item.label))) === index);
    return {
        ...draft,
        title: reference.label,
        mission: reference.description.trim(),
        responsibilities: [],
        expectedOutcomes: [],
        requirements: deduplicated,
        sourceKind: "knowledge_reference",
        referenceConceptId: reference.conceptId,
    };
}
function referenceRelationCategory(relation) {
    if (!/^(requires|uses)$/i.test(relation.relationType))
        return null;
    if (relation.conceptType === "technology" || relation.relationType === "uses")
        return "technology";
    if (relation.conceptType === "knowledge")
        return "knowledge";
    if (relation.conceptType === "skill")
        return "competency";
    if (relation.conceptType === "certification")
        return "certification";
    return null;
}
export const vacancyRequirementCategories = [
    { value: "experience", label: "Experiência" },
    { value: "knowledge", label: "Conhecimentos" },
    { value: "competency", label: "Competências" },
    { value: "technology", label: "Tecnologias e ferramentas" },
    { value: "education", label: "Formação" },
    { value: "certification", label: "Certificações" },
    { value: "language", label: "Idiomas" },
];
export function vacancyRequirementCategoryLabel(category) {
    return vacancyRequirementCategories.find((item) => item.value === category)?.label ?? "Requisitos";
}
export function inferRequirementCategory(label) {
    const value = normalize(label);
    if (/\b(ingles|espanhol|frances|alemao|idioma)\b/.test(value))
        return "language";
    if (/\b(certificacao|certificado|pmp|itil|cpa|cissp)\b/.test(value))
        return "certification";
    if (/\b(graduacao|pos graduacao|mestrado|doutorado|ensino superior|formacao)\b/.test(value))
        return "education";
    if (/\b(sap|salesforce|figma|excel|power bi|tableau|jira|sql|python|java|react|aws|azure|docker)\b/.test(value))
        return "technology";
    if (/\b(experiencia|atuacao|vivencia|anos?)\b/.test(value))
        return "experience";
    return "knowledge";
}
export function validateVacancyDraft(draft) {
    const errors = [];
    if (!draft.title.trim())
        errors.push("Informe o título da Vaga.");
    if (draft.occupancy === "occupied" && !draft.occupantPersonId)
        errors.push("Selecione a Pessoa que ocupa esta posição.");
    if (draft.requirements.some((item) => !item.label.trim()))
        errors.push("Preencha ou remova os requisitos vazios.");
    if (draft.requirements.some((item) => item.label.trim() && item.importance === "unclassified"))
        errors.push("Classifique cada requisito como Obrigatório ou Desejável antes de salvar.");
    return errors;
}
export function validateVacancyReady(draft) {
    return draft.requirements.some((item) => item.label.trim() && item.importance === "unclassified")
        ? ["A descoberta de Pessoas está disponível. Classifique os requisitos pendentes para concluir a avaliação detalhada de aderência."]
        : [];
}
export function matchVacancyCandidate(vacancy, candidate, occupationReference = null, demonstratedEvidence = [], materialDependencies = []) {
    const areaRelation = matchVacancyArea(vacancy, candidate);
    const positionRelation = matchVacancyPosition(vacancy, candidate, occupationReference);
    const professionalEvidence = allProfessionalProfileEvidence(candidate);
    const requirements = vacancy.requirements.map((requirement) => {
        const directLabels = unique([requirement.label, requirement.observedTerm ?? "", requirement.conceptLabel ?? ""]);
        const direct = findExplicitEvidence(professionalEvidence, directLabels);
        const canonical = candidate.knowledge.find((item) => item.state === "resolved"
            && directLabels.some((label) => normalize(item.canonicalLabel ?? "") === normalize(label))
            && !isNegatedEvidence(item.originalTerm, directLabels));
        const explicitEvidence = direct.length ? direct : canonical ? [{
                label: canonical.originalTerm,
                canonicalLabel: canonical.canonicalLabel,
                source: "Knowledge publicada",
                sourceId: canonical.conceptId ?? `knowledge:${normalize(canonical.originalTerm)}`,
                fieldPath: canonical.sourceFieldPath ?? "knowledge",
                dimension: requirement.category,
                ...(canonical.sourceVersion ? { sourceVersion: canonical.sourceVersion } : {}),
            }] : [];
        const demonstrated = findDemonstratedEvidence(requirement, demonstratedEvidence);
        if (demonstrated) {
            const meetsTarget = !requirement.targetLevel || verificationLevelRank(demonstrated.demonstratedLevel) >= verificationLevelRank(requirement.targetLevel);
            const status = meetsTarget && demonstrated.confidenceState !== "reduced" ? "met" : "partially_met";
            return {
                requirement,
                status,
                evidence: [{
                        label: requirement.label,
                        source: "Evidência Demonstrada",
                        sourceId: demonstrated.id,
                        fieldPath: `competencyDemonstratedEvidence.${demonstrated.id}`,
                        dimension: requirement.category,
                        sourceVersion: [demonstrated.verificationDefinitionVersion, demonstrated.evaluationVersion, demonstrated.integrityRuleVersion].join(" · "),
                    }],
                relatedSignal: null,
                explanation: status === "met"
                    ? `${requirement.label} possui Evidência Demonstrada vigente no nível requerido.`
                    : `${requirement.label} possui Evidência Demonstrada relacionada, mas o nível ou a confiança ainda exige revisão humana.`,
            };
        }
        if (explicitEvidence.length) {
            const observed = explicitEvidence[0].label;
            const sources = joinHumanList(unique(explicitEvidence.map((item) => item.source)));
            const canonicalOnly = direct.length === 0 && Boolean(canonical);
            const targetLevelProven = !requirement.targetLevel || explicitEvidence.some((item) => evidenceProvesTargetLevel(item.label, directLabels, requirement.targetLevel));
            return {
                requirement,
                status: targetLevelProven ? "met" : "partially_met",
                evidence: explicitEvidence,
                relatedSignal: null,
                explanation: !targetLevelProven
                    ? `${requirement.label} aparece explicitamente em ${sources}, mas o nível ${targetLevelLabels(requirement.targetLevel)[0]} não está comprovado nessa evidência.`
                    : canonicalOnly
                        ? `${requirement.label} foi identificado em ${sources} a partir de “${observed}”, com equivalência canônica publicada.`
                        : normalize(observed) === normalize(requirement.label)
                            ? `${requirement.label} possui evidência profissional explícita em ${sources}.`
                            : `${requirement.label} foi identificado explicitamente em ${sources} a partir de “${observed}”.`,
            };
        }
        const partial = findPartialEvidence(professionalEvidence, directLabels);
        if (partial.length) {
            const observed = partial[0].label;
            const sources = joinHumanList(unique(partial.map((item) => item.source)));
            return {
                requirement,
                status: "partially_met",
                evidence: partial,
                relatedSignal: null,
                explanation: `${observed} foi encontrado em ${sources} como evidência parcial. O trecho se relaciona a ${requirement.label}, mas não comprova atendimento integral sem revisão humana.`,
            };
        }
        for (const relation of requirement.relatedSignals) {
            const related = findRelatedSignalEvidence(candidate, relation.label);
            if (related.length) {
                const sources = joinHumanList(unique(related.map((item) => item.source)));
                return {
                    requirement,
                    status: "related_signal",
                    evidence: related,
                    relatedSignal: relation.label,
                    explanation: `${relation.label} é uma evidência relacionada encontrada em ${sources}. Não comprova atendimento pleno de ${requirement.label}.`,
                };
            }
        }
        return {
            requirement,
            status: "no_evidence",
            evidence: [],
            relatedSignal: null,
            explanation: `O Prisma não possui evidência suficiente para ${requirement.label} no Perfil atual. Isso não significa que a Pessoa não possua essa experiência ou conhecimento.`,
        };
    });
    const functionAssessment = assessVacancyFunction(vacancy, candidate, areaRelation, positionRelation);
    const trajectoryAssessment = assessVacancyTrajectory(vacancy, candidate, areaRelation, positionRelation, functionAssessment, requirements);
    const directCount = requirements.filter((item) => item.status === "met").length;
    const partialCount = requirements.filter((item) => item.status === "partially_met").length;
    const relatedCount = requirements.filter((item) => item.status === "related_signal").length;
    const missingRequiredCount = requirements.filter((item) => item.status === "no_evidence" && item.requirement.importance === "required").length;
    const unclassifiedRequirementCount = vacancy.requirements.filter((item) => item.importance === "unclassified").length;
    const detailedStatus = !vacancy.requirements.length
        ? "no_requirements"
        : unclassifiedRequirementCount
            ? "pending_classification"
            : "ready";
    const evidenceAssessment = assessVacancyEvidence(areaRelation, positionRelation, requirements);
    const discoveryGroup = trajectoryAssessment.relation === "direct"
        ? "main_area"
        : trajectoryAssessment.relation === "related" || trajectoryAssessment.relation === "entry_potential"
            ? "related_area"
            : "contextual_signals";
    const requirementReasons = requirements.filter((item) => item.status !== "no_evidence").map((item) => item.status === "related_signal"
        ? item.relatedSignal === item.requirement.label ? `${item.requirement.label} aparece somente como sinal contextual` : `${item.relatedSignal} é um sinal relacionado a ${item.requirement.label}`
        : item.status === "partially_met" ? `${item.requirement.label} possui evidência parcial para revisão` : `${item.requirement.label} possui evidência no Perfil`);
    const score = calculateMatchingScore({
        areaApplicable: Boolean(vacancy.area.trim()),
        functionApplicable: Boolean(vacancy.title.trim()),
        areaRelation,
        functionAssessment,
        requirements,
        unclassifiedRequirementCount,
        competitiveEligibility: discoveryGroup === "contextual_signals" ? "contextual_only" : "eligible",
        materialDependencies,
        positionVersion: vacancy.versionId,
        positionVersionNumber: vacancy.version,
        profileVersion: candidate.profileId,
        profileVersionNumber: candidate.profileVersion,
        matchingContractVersion: VACANCY_MATCHING_VERSION,
        scoreContractVersion: MATCHING_SCORE_CONTRACT_VERSION,
    });
    return {
        candidate,
        areaRelation,
        positionRelation,
        functionAssessment,
        trajectoryAssessment,
        discoveryGroup,
        positionDecision: null,
        detailedStatus,
        unclassifiedRequirementCount,
        evidenceAssessment,
        requirements,
        reasons: unique([
            ...(areaRelation.status !== "none" ? [areaRelation.explanation] : []),
            ...(positionRelation.status !== "none" ? [positionRelation.explanation] : []),
            ...requirementReasons,
            ...(areaRelation.status === "none" && positionRelation.status === "none" && !requirementReasons.length ? ["Perfil publicado disponível para análise manual"] : []),
        ]),
        directCount,
        partialCount,
        relatedCount,
        missingRequiredCount,
        score,
    };
}
export function answerVacancyQuestion(question, draft, context) {
    const normalizedQuestion = normalize(question);
    if (!normalizedQuestion) {
        return {
            internal: "Escreva uma pergunta sobre esta Vaga.",
            internalStatus: "insufficient",
            market: "Nenhuma pesquisa externa foi realizada.",
            suggestion: "Você pode perguntar sobre lacunas, exigências, funções semelhantes ou um requisito específico.",
            sources: [],
            webSearched: false,
            allowKnowledgeReview: false,
            suggestedRequirement: null,
        };
    }
    const required = draft.requirements.filter((item) => item.importance === "required" && item.label.trim()).length;
    const missing = [
        !draft.title.trim() ? "título" : null,
        !draft.mission.trim() ? "missão" : null,
        !draft.responsibilities.some((item) => item.trim()) ? "responsabilidades" : null,
        !draft.expectedOutcomes.some((item) => item.trim()) ? "resultados esperados" : null,
        !draft.requirements.some((item) => item.label.trim()) ? "requisitos" : null,
        !draft.contextItems.some((item) => item.trim()) ? "contexto da vaga" : null,
    ].filter((item) => Boolean(item));
    const similarVacancies = context.otherVacancies.filter((item) => isSimilarVacancy(item.title, item.area, draft)).slice(0, 4);
    const similarRoles = context.roles.filter((item) => sharesRelevantWord(item.name, draft.title)).slice(0, 4);
    const explicitAddition = extractExplicitRequirementAddition(question);
    let internal;
    let internalStatus;
    let suggestion;
    if (/figma/.test(normalizedQuestion) && /\bux\b|user experience/.test(normalizedQuestion)) {
        internal = "Figma pode aparecer como evidência relacionada a UX, mas a ferramenta, isoladamente, não comprova experiência em UX. O Prisma só considera atendimento pleno quando encontra evidência direta ou equivalência canônica publicada.";
        internalStatus = "sufficient";
        suggestion = "Se Figma for relevante para a execução, mantenha-o como requisito próprio. Preserve UX como requisito separado e deixe a aderência explicar a evidência encontrada para cada um.";
    }
    else if (/falt|lacuna|complet|revis/.test(normalizedQuestion)) {
        internal = missing.length
            ? `A definição ainda não informa: ${joinHumanList(missing)}.`
            : `Os seis blocos estão preenchidos. A Vaga possui ${required} ${required === 1 ? "requisito obrigatório" : "requisitos obrigatórios"}; isso descreve a definição, não uma nota de qualidade.`;
        internalStatus = missing.length ? "partial" : "sufficient";
        suggestion = missing.includes("contexto da vaga")
            ? "Explique o momento da área, o desafio da posição e o ambiente em que a Pessoa irá atuar, sem repetir requisitos profissionais."
            : "Revise se cada requisito obrigatório é realmente indispensável e se os resultados esperados são observáveis.";
    }
    else if (/compar|semelh|outras? vagas?|fun[cç][oõ]es?/.test(normalizedQuestion)) {
        const references = [...similarVacancies.map((item) => `Vaga ${item.title}`), ...similarRoles.map((item) => `função ${item.name}`)];
        internal = references.length
            ? `Encontrei referências internas semelhantes: ${joinHumanList(references)}.`
            : "Não encontrei outra Vaga ou função interna claramente semelhante pelos dados atualmente disponíveis.";
        internalStatus = references.length ? "sufficient" : "insufficient";
        suggestion = "Use as referências internas para comparar propósito, responsabilidades e requisitos, preservando as diferenças do cenário desta Vaga.";
    }
    else if (/requisit|exig[eê]ncia|demais|muitos|anos?/.test(normalizedQuestion)) {
        internal = `A Vaga possui ${required} ${required === 1 ? "requisito obrigatório" : "requisitos obrigatórios"}. O Prisma não conclui que a exigência é adequada apenas pela quantidade ou pelo tempo informado.`;
        internalStatus = "partial";
        suggestion = required > 6
            ? "Revise quais itens são indispensáveis e mova diferenciais para Desejável. Para tempo de experiência, descreva a evidência prática esperada sempre que isso for mais preciso do que um número de anos."
            : "Confirme se cada item obrigatório é indispensável para esta necessidade e se existe uma forma mais direta de descrever a experiência esperada.";
    }
    else {
        const evidence = advisorInternalEvidence(normalizedQuestion, draft, context);
        internal = evidence.answer;
        internalStatus = evidence.status;
        suggestion = evidence.status === "insufficient"
            ? "Indique o requisito ou bloco da Vaga que deseja avaliar. O Prisma responderá somente com o que estiver representado nas fontes internas autorizadas."
            : "Use esta leitura para revisar a Vaga. Nenhuma resposta altera a definição automaticamente.";
    }
    const marketRelevant = shouldResearchVacancyMarket(question);
    const market = marketRelevant
        ? "Esta pergunta depende de informação atual de mercado. A pesquisa externa ainda não foi concluída."
        : "Esta resposta usou somente o contexto interno disponível. Nenhuma pesquisa externa foi realizada.";
    if (!context.knowledgeLookupAvailable)
        internal += " A consulta complementar à Knowledge não estava disponível; a resposta preserva somente o contexto interno já carregado.";
    internal += ` ${advisorContextMetadata(context)}`;
    return {
        internal,
        internalStatus,
        market,
        suggestion,
        sources: [],
        webSearched: false,
        allowKnowledgeReview: marketRelevant || /knowledge|conceito|compet[eê]ncia|tecnologia|ferramenta/.test(normalizedQuestion),
        suggestedRequirement: explicitAddition,
    };
}
export function shouldResearchVacancyMarket(question) {
    return Boolean(question.trim());
}
export function sortVacancyMatches(matches) {
    const pending = semanticComparisonPending(matches);
    const awaiting = (match) => Boolean(match.semanticAssessment && match.semanticAssessment.status !== "complete");
    const byName = (left, right) => left.candidate.fullName.localeCompare(right.candidate.fullName, "pt-BR") || left.candidate.personId.localeCompare(right.candidate.personId);
    return [...matches]
        .sort((left, right) => awaiting(left) || awaiting(right)
        ? Number(awaiting(right)) - Number(awaiting(left)) || byName(left, right)
        :
            discoveryGroupPriority(right.discoveryGroup) - discoveryGroupPriority(left.discoveryGroup)
                || (pending ? 0 : prismaScoreComparison(left, right))
                || (pending ? 0 : decisionPriority(right.positionDecision) - decisionPriority(left.positionDecision))
                || byName(left, right));
}
export function buildMatchingScoreShadowReport(matches, baselineOrder = matches.map((item) => item.candidate.personId)) {
    const baseline = new Map(baselineOrder.map((personId, index) => [personId, index]));
    return sortVacancyMatches(matches).map((match, index) => {
        const points = new Map(match.score.dimensions.map((dimension) => [dimension.key, dimension.earnedPoints]));
        return {
            personReference: match.candidate.personId,
            discoveryGroup: match.discoveryGroup,
            score: match.score.score,
            coveragePercent: match.score.coveragePercent,
            provisional: match.score.status === "provisional",
            areaPoints: points.get("area") ?? 0,
            functionPoints: points.get("position") ?? 0,
            requiredPoints: points.get("required") ?? 0,
            desiredPoints: points.get("desired") ?? 0,
            humanDecision: match.positionDecision,
            orderDifference: (baseline.get(match.candidate.personId) ?? index) - index,
        };
    });
}
export function isVacancyDiscoveryCandidate(match) {
    return match.positionDecision === "confirmed"
        || match.trajectoryAssessment.relation !== "none";
}
export const VACANCY_PROFILE_MATRIX = [
    { category: "professionalTitle", profileDimension: "professionalTitle", matching: true },
    { category: "experience", profileDimension: "experiences", matching: true }, { category: "competency", profileDimension: "competencies", matching: true },
    { category: "knowledge", profileDimension: "competencies", matching: true }, { category: "technology", profileDimension: "toolsAndTechnologies", matching: true },
    { category: "education", profileDimension: "education", matching: true }, { category: "certification", profileDimension: "certifications", matching: true },
    { category: "language", profileDimension: "languages", matching: true }, { category: "mission", profileDimension: "professionalObjective", matching: false },
    { category: "responsibility", profileDimension: "experiences", matching: false }, { category: "outcome", profileDimension: "keyResults", matching: false }, { category: "context", profileDimension: "professionalContexts", matching: false },
];
export function structureVacancyDescription(description) {
    const text = description.trim();
    if (!text)
        return [];
    const normalized = normalize(text);
    const suggestions = [];
    const add = (label, category, importance, origin, reason, start = text.toLocaleLowerCase("pt-BR").indexOf(label.toLocaleLowerCase("pt-BR")), method = "explicit", end = Math.max(0, start) + Math.max(label.length, 1)) => {
        if (suggestions.some((item) => item.category === category && normalize(item.label) === normalize(label)))
            return;
        suggestions.push({ id: createId(), label, category, importance, origin, reason, selected: origin === "explicit", sourceStart: Math.max(0, start), sourceEnd: end, method });
    };
    const termRules = [
        [/vendas?\s+b2b(?:\s+enterprise)?/, "Vendas B2B enterprise", "experience", "required"],
        [/gest[aã]o\s+(?:de\s+)?pipeline|gerenciar\s+(?:o\s+)?(?:funil|pipeline)/, "Gestão de pipeline", "experience", "required"],
        [/negocia(?:r|ç[aã]o)/, "Negociação", "competency", "required"],
        [/salesforce/, "Salesforce", "technology", /desej[aá]vel|diferencial/.test(normalized) ? "desired" : "required"],
        [/mercado\s+farmac[eê]utico|ind[uú]stria\s+farmac[eê]utica/, "Mercado farmacêutico", "experience", "desired"],
        [/ingl[eê]s\s+avan[cç]ado/, "Inglês avançado", "language", "required"],
        [/figma/, "Figma", "technology", "desired"],
        [/\bux\b|user\s+experience/, "UX", "competency", "required"],
        [/\bnode\.?(?:js)?\b/i, "Node.js", "technology", "required"], [/\btypescript\b/i, "TypeScript", "technology", "required"], [/\bpython\b/i, "Python", "technology", "required"], [/\bjava\b/i, "Java", "technology", "required"], [/\bgo\b|golang/i, "Go", "technology", "required"],
        [/\bpostgresql\b/i, "PostgreSQL", "technology", "required"], [/\bmongodb\b/i, "MongoDB", "technology", "required"], [/\bredis\b/i, "Redis", "technology", "required"], [/\brabbitmq\b/i, "RabbitMQ", "technology", "required"], [/\bkafka\b/i, "Kafka", "technology", "required"], [/\bdocker\b/i, "Docker", "technology", "required"], [/\bkubernetes\b/i, "Kubernetes", "technology", "required"], [/\baws\b|amazon web services/i, "AWS", "technology", "required"], [/\bgoogle cloud\b/i, "Google Cloud", "technology", "required"], [/\bazure\b/i, "Azure", "technology", "required"], [/\bterraform\b/i, "Terraform", "technology", "required"], [/\bgithub actions\b/i, "GitHub Actions", "technology", "required"], [/\bjest\b/i, "Jest", "technology", "required"], [/\bpytest\b/i, "PyTest", "technology", "required"], [/\bjunit\b/i, "JUnit", "technology", "required"],
        [/clean architecture/i, "Clean Architecture", "knowledge", "required"], [/design patterns?/i, "Design Patterns", "knowledge", "required"], [/arquitetura de software/i, "Arquitetura de software", "knowledge", "required"], [/seguran[cç]a/i, "Segurança de aplicações", "knowledge", "required"], [/apis? rest/i, "Desenvolvimento de APIs REST", "knowledge", "required"],
    ];
    for (const [pattern, label, category, importance] of termRules) {
        if (pattern.test(normalized) && !isExplicitlyNegated(text, pattern))
            add(label, category, importance, "explicit", `O termo aparece na descrição fornecida.`);
    }
    if (/liderar|lideran[cç]a/.test(normalized)) {
        const explicit = /lideran[cç]a/.test(normalized);
        add("Liderança de equipes", "competency", "required", explicit ? "explicit" : "derived", explicit
            ? "A competência foi mencionada no texto."
            : "Sugestão derivada do verbo liderar. Precisa de confirmação humana.");
    }
    const sentences = text.split(/(?<=[.!?])\s+/).map((item) => item.trim()).filter(Boolean);
    const responsibilitySentences = sentences.filter((item) => /\b(liderar|gerenciar|desenvolver|executar|identificar|estruturar|negociar|garantir|projetar|documentar|implementar|integrar|colaborar)\b/i.test(item)).slice(0, 5);
    for (const sentence of responsibilitySentences) {
        const responsibility = operationalResponsibility(sentence);
        if (responsibility)
            add(responsibility, "responsibility", "unclassified", "explicit", "Atividade descrita explicitamente.");
    }
    for (const sentence of sentences.filter((item) => /\b(meta|resultado|crescimento|receita|expans[aã]o|previsibilidade|reten[cç][aã]o)\b/i.test(item)).slice(0, 4)) {
        add(stripLead(sentence), "outcome", "required", "explicit", "Resultado ou impacto mencionado no texto.");
    }
    const missionSource = sentences.find((item) => /\b(busca|buscamos|respons[aá]vel|atuar|construir|evoluir|desenvolvedor|analista|gerente)\b/i.test(item));
    if (missionSource) {
        const concise = synthesizeMission(missionSource);
        const sourceStart = text.indexOf(missionSource);
        if (concise && normalize(concise) !== normalize(text))
            add(concise, "mission", "required", "explicit", "Síntese fiel de propósito presente na descrição.", sourceStart, "faithful_synthesis", sourceStart + missionSource.length);
    }
    const contextRules = [
        [/(?:equipe|[aá]rea)\s+(?:est[aá]\s+)?(?:em\s+processo\s+de\s+)?estrutura[cç][aã]o/, "Equipe ou área em processo de estruturação"],
        [/empresa\s+crescendo\s+rapidamente|crescimento\s+acelerado/, "Empresa em crescimento acelerado"],
        [/baixa\s+previsibilidade/, "Área com baixa previsibilidade"],
        [/abrir\s+(?:uma\s+)?nova\s+unidade/, "Posição responsável por abrir uma nova unidade"],
        [/produto\s+(?:em\s+)?fase\s+inicial/, "Produto em fase inicial"],
        [/transforma[cç][aã]o\s+digital/, "Operação passando por transformação digital"],
    ];
    for (const [pattern, label] of contextRules)
        if (pattern.test(normalized))
            add(label, "context", "desired", "explicit", "Contexto mencionado na descrição.");
    return suggestions;
}
export function applyStructureSuggestions(base, suggestions) {
    const selected = suggestions.filter((item) => item.selected);
    const mission = selected.find((item) => item.category === "mission")?.label ?? base.mission;
    const responsibilities = unique([...base.responsibilities, ...selected.filter((item) => item.category === "responsibility").map((item) => item.label)]);
    const expectedOutcomes = unique([...base.expectedOutcomes, ...selected.filter((item) => item.category === "outcome").map((item) => item.label)]);
    const contextItems = unique([...base.contextItems, ...selected.filter((item) => item.category === "context").map((item) => item.label)]);
    const requirementCategories = ["experience", "competency", "knowledge", "technology", "education", "certification", "language"];
    const requirements = selected.flatMap((item) => requirementCategories.includes(item.category)
        ? [{
                ...newVacancyRequirement(item.label, item.category),
                origin: "description",
                sourceSuggestionId: item.id,
                importance: "unclassified",
                importanceConfirmed: false,
            }]
        : []);
    const items = selected.map((item) => ({ suggestionId: item.id, category: item.category, start: item.sourceStart, end: item.sourceEnd, method: item.method }));
    return { ...base, mission, responsibilities, expectedOutcomes, contextItems, requirements: [...base.requirements, ...requirements], sourceKind: "assisted_description", structureSource: base.structureSource ? { ...base.structureSource, items } : null };
}
export function compareVacancyRequirements(current, proposed) {
    const unmatched = new Set(proposed.map((item) => item.stableId));
    const result = [];
    for (const item of current) {
        if (item.origin === "human") {
            result.push({ kind: "maintained", requirement: item, proposed: null });
            continue;
        }
        const candidate = proposed.find((next) => normalize(next.label) === normalize(item.label));
        if (!candidate) {
            result.push({ kind: "not_found", requirement: item, proposed: null });
            continue;
        }
        unmatched.delete(candidate.stableId);
        const changed = item.category !== candidate.category || normalize(item.label) !== normalize(candidate.label);
        result.push({
            kind: changed ? "changed" : "maintained",
            requirement: { ...candidate, ...item, ...(candidate.sourceSuggestionId ?? item.sourceSuggestionId ? { sourceSuggestionId: candidate.sourceSuggestionId ?? item.sourceSuggestionId } : {}) },
            proposed: candidate,
        });
    }
    for (const item of proposed.filter((candidate) => unmatched.has(candidate.stableId)))
        result.push({ kind: "new", requirement: item, proposed: item });
    return result;
}
export function applyVacancyRestructureDelta(current, delta, removedStableIds = []) {
    const removed = new Set(removedStableIds);
    return delta.flatMap((item) => {
        if (removed.has(item.requirement.stableId))
            return [];
        if (item.kind === "new")
            return [item.requirement];
        return [item.requirement];
    });
}
export function applyStructuredDescription(base, description, suggestions) {
    return applyStructureSuggestions({ ...base, structureSource: { originalDescription: description, contractVersion: VACANCY_STRUCTURE_CONTRACT, structuredAt: new Date().toISOString(), items: [] } }, suggestions);
}
function synthesizeMission(sentence) {
    const cleaned = stripLead(sentence).replace(/\bde alto nível\b/gi, "").replace(/\s+/g, " ").trim().replace(/[.]$/, "");
    if (cleaned.length > 220)
        return cleaned.slice(0, 217).replace(/\s+\S*$/, "") + "...";
    return cleaned;
}
function isExplicitlyNegated(text, pattern) {
    return text.split(/(?<=[.!?])\s+/).some((sentence) => /\b(?:n[aã]o|sem|nunca)\s+(?:h[aá]|exige|requer|possui|tem)?/i.test(sentence) && new RegExp(pattern.source, pattern.flags.replace("g", "")).test(sentence));
}
function allProfessionalProfileEvidence(candidate) {
    const profile = candidate.profileData;
    return uniqueEvidence([
        ...(profile.professionalTitle ? [evidence(profile.professionalTitle, "Título profissional", "professionalTitle", "professionalTitle", "professionalTitle")] : []),
        ...profile.areasOfExpertise.map((label, index) => evidence(label, "Áreas de atuação", `area:${index}`, `areasOfExpertise.${index}`, "professionalArea")),
        ...(profile.summary ? [evidence(profile.summary, "Resumo profissional", "summary", "summary", "context")] : []),
        ...(profile.professionalObjective ? [evidence(profile.professionalObjective, "Objetivo profissional", "professionalObjective", "professionalObjective", "context")] : []),
        ...profile.keyResults.map((item) => evidence(item.value, "Principais resultados", `keyResult:${item.id}`, `keyResults.${item.id}.value`, "context")),
        ...profile.experiences.flatMap((item) => [
            item.role ? evidence(item.role, "Cargo em experiência profissional", `experience:${item.id}:role`, `experiences.${item.id}.role`, "experience") : null,
            item.description ? evidence(item.description, "Descrição de experiência profissional", `experience:${item.id}:description`, `experiences.${item.id}.description`, "experience") : null,
            item.evidenceText ? evidence(item.evidenceText, "Evidência de experiência profissional", `experience:${item.id}:evidence`, `experiences.${item.id}.evidenceText`, "experience") : null,
        ].filter((item) => Boolean(item))),
        ...profile.education.flatMap((item) => [item.course, item.level, item.qualification, item.institution, item.description, item.evidenceText]
            .filter((value) => Boolean(value)).map((label, index) => evidence(label, "Formação", `education:${item.id}:${index}`, `education.${item.id}`, "education"))),
        ...profile.certifications.map((label, index) => evidence(label, "Certificações", `certification:${index}`, `certifications.${index}`, "certification")),
        ...profile.languages.map((label, index) => evidence(label, "Idiomas", `language:${index}`, `languages.${index}`, "language")),
        ...profile.competencies.map((label, index) => evidence(label, "Competências e conhecimentos", `competency:${index}`, `competencies.${index}`, "competency")),
        ...(profile.toolsAndTechnologies ?? []).map((label, index) => evidence(label, "Tecnologias e ferramentas", `technology:${index}`, `toolsAndTechnologies.${index}`, "technology")),
        ...(profile.professionalContexts ?? []).map((label, index) => evidence(label, "Contextos profissionais", `context:${index}`, `professionalContexts.${index}`, "context")),
        ...profile.customSections.flatMap((section) => section.items.map((item) => evidence(item.value, section.name, `custom:${section.id}:${item.id}`, `customSections.${section.id}.items.${item.id}.value`, "context"))),
    ]);
}
function evidence(label, source, sourceId, fieldPath, dimension) {
    return { label, source, sourceId, fieldPath, dimension };
}
function findExplicitEvidence(evidenceItems, labels) {
    return uniqueEvidence(evidenceItems.flatMap((item) => {
        const matchedLabel = labels.find((label) => containsBoundedPhrase(item.label, label) && !isNegatedEvidence(item.label, [label]));
        if (!matchedLabel)
            return [];
        return [{ ...item, label: explicitEvidenceExcerpt(item.label, matchedLabel) }];
    })).slice(0, 3);
}
function findPartialEvidence(evidenceItems, labels) {
    return uniqueEvidence(evidenceItems.filter((item) => labels.some((label) => {
        const observed = normalize(item.canonicalLabel ?? item.label);
        const expected = normalize(label);
        if (observed.length < 4 || expected.length < 4 || observed === expected)
            return false;
        return !isNegatedEvidence(item.label, [label]) && (containsBoundedPhrase(observed, expected) || containsBoundedPhrase(expected, observed));
    }))).slice(0, 3);
}
function findRelatedSignalEvidence(candidate, label) {
    return findExplicitEvidence(allProfessionalProfileEvidence(candidate), [label]);
}
function containsBoundedPhrase(value, phrase) {
    const normalizedValue = normalize(value);
    const normalizedPhrase = normalize(phrase);
    if (!normalizedValue || !normalizedPhrase)
        return false;
    return new RegExp(`(?:^| )${escapeRegExp(normalizedPhrase)}(?= |$)`).test(normalizedValue);
}
function isNegatedEvidence(value, labels) {
    const matchingClauses = value.split(/(?<=[.!?;])\s+|\s*[|•\n]\s*|\s+mas\s+/i)
        .filter((clause) => labels.some((label) => containsBoundedPhrase(clause, label)));
    return matchingClauses.length > 0 && matchingClauses.every((clause) => labels
        .filter((label) => containsBoundedPhrase(clause, label))
        .every((label) => isLabelNegatedInClause(clause, label)));
}
function isLabelNegatedInClause(clause, label) {
    const normalizedClause = normalize(clause);
    const normalizedLabel = normalize(label);
    const match = new RegExp(`(?:^| )${escapeRegExp(normalizedLabel)}(?= |$)`).exec(normalizedClause);
    if (!match)
        return false;
    const prefix = normalizedClause.slice(Math.max(0, match.index - 140), match.index).trimEnd();
    return /(?:^| )sem(?: qualquer)?(?:(?: experiencia| conhecimento| vivencia| contato| uso| dominio| atuacao)(?: [a-z0-9+#.]+){0,3})?(?: em| com| de)?$/.test(prefix)
        || /(?:^| )(?:nao|nunca) (?!apenas(?: |$))(?:tenho|possuo|conheco|utilizei|usei|trabalhei|atuei|domino|sei|tive|houve|ha)(?: [a-z0-9+#.]+){0,8}$/.test(prefix);
}
function explicitEvidenceExcerpt(value, label) {
    const clause = value.split(/(?<=[.!?;])\s+|\s*[|•\n]\s*/).find((item) => containsBoundedPhrase(item, label))?.trim() ?? value.trim();
    if (clause.length <= 280)
        return clause;
    const index = clause.toLocaleLowerCase("pt-BR").indexOf(label.toLocaleLowerCase("pt-BR"));
    const start = Math.max(0, index < 0 ? 0 : index - 120);
    const end = Math.min(clause.length, start + 280);
    return `${start ? "…" : ""}${clause.slice(start, end).trim()}${end < clause.length ? "…" : ""}`;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function targetLevelLabels(level) {
    return { basic: ["básico", "basic"], intermediate: ["intermediário", "intermediate"], advanced: ["avançado", "advanced"] }[level];
}
function evidenceProvesTargetLevel(value, requirementLabels, level) {
    const normalizedValue = normalize(value);
    return requirementLabels.filter(Boolean).some((requirementLabel) => targetLevelLabels(level).some((levelLabel) => {
        const requirement = escapeRegExp(normalize(requirementLabel));
        const target = escapeRegExp(normalize(levelLabel));
        if (!requirement || !target)
            return false;
        return new RegExp(`(?:^| )${target}(?: [a-z0-9+#.]+){0,2} ${requirement}(?= |$)|(?:^| )${requirement}(?: [a-z0-9+#.]+){0,2} ${target}(?= |$)`).test(normalizedValue);
    }));
}
function matchVacancyArea(vacancy, candidate) {
    const area = vacancy.area.trim();
    if (!area)
        return { status: "none", explanation: "A Posição não informa uma área profissional para comparação.", evidence: [], coverageState: "not_applicable" };
    const experienceEvidence = candidate.profileData.experiences.flatMap((item, experienceIndex) => {
        const candidates = [
            item.role ? { label: item.role, source: "Cargo em experiência profissional", fieldPath: `experiences.${item.id}.role`, order: 0 } : null,
            item.description ? { label: item.description, source: "Descrição de experiência profissional", fieldPath: `experiences.${item.id}.description`, order: 1 } : null,
            item.evidenceText ? { label: item.evidenceText, source: "Evidência de experiência profissional", fieldPath: `experiences.${item.id}.evidenceText`, order: 2 } : null,
        ].filter((value) => Boolean(value));
        return candidates
            .filter((value) => phrasesOverlap(value.label, area) && (value.order === 0 || supportsProfessionalAreaPractice(value.label, area)))
            .map((value) => {
            const displayLabel = value.order === 0 ? value.label : areaEvidenceExcerpt(value.label, area);
            return {
                ...value,
                label: displayLabel,
                experienceIndex,
                titleCloseness: item.role ? occupationalTitleRelationStrength(vacancy.title, item.role) : 0,
                evidence: evidence(displayLabel, value.source, `experience:${item.id}:${value.order}`, value.fieldPath, "professionalArea"),
            };
        });
    }).sort((left, right) => right.titleCloseness - left.titleCloseness || left.order - right.order || left.experienceIndex - right.experienceIndex);
    const selected = experienceEvidence[0];
    if (selected)
        return {
            status: "experience_area",
            explanation: selected.order === 0
                ? `Cargo na área de ${area} identificado em “${selected.label}”.`
                : `Menção contextual à área de ${area} identificada em uma experiência profissional: “${selected.label}”.`,
            evidence: [selected.evidence],
            coverageState: "evaluated_relation",
        };
    const publishedArea = candidate.profileData.areasOfExpertise
        .map((label, index) => ({ label, index }))
        .find((item) => phrasesOverlap(item.label, area));
    if (publishedArea)
        return {
            status: "profile_area",
            explanation: `Atuação na área de ${area} identificada em “${publishedArea.label}” no Perfil publicado, sem experiência vinculada suficiente para a pontuação máxima da dimensão.`,
            evidence: [evidence(publishedArea.label, "Área de atuação publicada", `areasOfExpertise:${publishedArea.index}`, `areasOfExpertise.${publishedArea.index}`, "professionalArea")],
            coverageState: "evaluated_relation",
        };
    const hasProfessionalAreaEvidence = candidate.profileData.areasOfExpertise.some((item) => item.trim())
        || candidate.profileData.experiences.some((item) => Boolean(item.role?.trim() || item.description?.trim() || item.evidenceText?.trim()));
    return {
        status: "none",
        explanation: hasProfessionalAreaEvidence
            ? `As evidências profissionais publicadas foram avaliadas, mas nenhuma relação com a área de ${area} foi identificada.`
            : `Não há evidência profissional publicada suficiente para avaliar relação com a área de ${area}.`,
        evidence: [],
        coverageState: hasProfessionalAreaEvidence ? "evaluated_no_relation" : "insufficient_evidence",
    };
}
function supportsProfessionalAreaPractice(value, area) {
    const normalized = normalize(value);
    const normalizedArea = normalize(area);
    if (!normalizedArea || !normalized.includes(normalizedArea))
        return false;
    return /\b(atuacao|atuei|atua|atuou|experiencia|trabalhei|trabalhou|responsavel|liderou|lideranca|gestao|gerenciei|coordenei|especialista|profissional)\b/.test(normalized);
}
function phrasesOverlap(left, right) {
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    if (!normalizedLeft || !normalizedRight)
        return false;
    return ` ${normalizedLeft} `.includes(` ${normalizedRight} `) || ` ${normalizedRight} `.includes(` ${normalizedLeft} `);
}
function areaEvidenceExcerpt(value, area) {
    const segment = value.split(/(?<=[.!?;])\s+|\r?\n/).find((item) => phrasesOverlap(item, area))?.trim() ?? value.trim();
    return segment.length <= 180 ? segment : `${segment.slice(0, 177).trimEnd()}…`;
}
function matchVacancyPosition(vacancy, candidate, reference) {
    const titleEvidence = [
        ...(candidate.profileData.professionalTitle ? [evidence(candidate.profileData.professionalTitle, "Título profissional", "professionalTitle", "professionalTitle", "professionalTitle")] : []),
        ...candidate.profileData.experiences.flatMap((item) => item.role
            ? [evidence(item.role, "Experiência profissional", `experience:${item.id}:role`, `experiences.${item.id}.role`, "professionalTitle")]
            : []),
    ];
    const occupationKnowledge = candidate.knowledge.filter((item) => item.state === "resolved" && item.conceptType === "occupation" && item.conceptId);
    const referenceConceptId = reference?.conceptId ?? vacancy.referenceConceptId;
    const sameReference = referenceConceptId ? occupationKnowledge.find((item) => item.conceptId === referenceConceptId) : null;
    if (sameReference)
        return {
            status: "same_reference",
            explanation: `Mesma referência ocupacional identificada a partir de “${sameReference.originalTerm}”.`,
            evidence: [{ label: sameReference.originalTerm, canonicalLabel: sameReference.canonicalLabel, source: "Knowledge publicada", sourceId: sameReference.conceptId, fieldPath: sameReference.sourceFieldPath ?? "knowledge", dimension: "professionalTitle", ...(sameReference.sourceVersion ? { sourceVersion: sameReference.sourceVersion } : {}) }],
        };
    const equivalent = reference?.relations.find((relation) => relation.relationType === "equivalent_to" && occupationKnowledge.some((item) => item.conceptId === relation.conceptId));
    if (equivalent)
        return {
            status: "equivalent_reference",
            explanation: `A Knowledge publicada reconhece ${equivalent.label} como referência ocupacional equivalente.`,
            evidence: occupationKnowledge.filter((item) => item.conceptId === equivalent.conceptId).slice(0, 2).map((item) => ({ label: item.originalTerm, canonicalLabel: item.canonicalLabel, source: "Knowledge publicada", sourceId: item.conceptId, fieldPath: item.sourceFieldPath ?? "knowledge", dimension: "professionalTitle", ...(item.sourceVersion ? { sourceVersion: item.sourceVersion } : {}) })),
        };
    const related = reference?.relations.find((relation) => relation.relationType !== "equivalent_to" && occupationKnowledge.some((item) => item.conceptId === relation.conceptId));
    if (related)
        return {
            status: "related_reference",
            explanation: `A Knowledge publicada relaciona a posição com ${related.label}; isso não comprova equivalência.`,
            evidence: occupationKnowledge.filter((item) => item.conceptId === related.conceptId).slice(0, 2).map((item) => ({ label: item.originalTerm, canonicalLabel: item.canonicalLabel, source: "Knowledge publicada", sourceId: item.conceptId, fieldPath: item.sourceFieldPath ?? "knowledge", dimension: "professionalTitle", ...(item.sourceVersion ? { sourceVersion: item.sourceVersion } : {}) })),
        };
    const referenceLabels = unique([vacancy.title, reference?.canonicalLabel ?? "", ...(reference?.aliases ?? [])]);
    const titleRelation = titleEvidence
        .map((item, index) => ({
        item,
        index,
        strength: Math.max(...referenceLabels.map((label) => occupationalTitleRelationStrength(label, item.label))),
    }))
        .filter((item) => item.strength >= 60)
        .sort((left, right) => right.strength - left.strength || left.index - right.index)[0]?.item;
    if (titleRelation)
        return {
            status: "possible_title_relation",
            explanation: `Possível relação com a posição identificada em “${titleRelation.label}”. Revise antes de confirmar.`,
            evidence: [titleRelation],
        };
    return { status: "none", explanation: "Nenhuma relação ocupacional automática foi identificada; o Perfil permanece disponível para análise manual.", evidence: [] };
}
function occupationalTitleRelationStrength(left, right) {
    const normalizedLeft = normalize(left);
    const normalizedRight = normalize(right);
    if (!normalizedLeft || !normalizedRight)
        return 0;
    if (normalizedLeft === normalizedRight)
        return 100;
    if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
        return 80;
    const leftTokens = occupationalTokens(normalizedLeft);
    const rightTokens = occupationalTokens(normalizedRight);
    const sharedTokens = [...leftTokens].filter((token) => rightTokens.has(token));
    if (sharedTokens.length >= 2)
        return 60 + sharedTokens.length;
    const sharedDomainTokens = sharedTokens.filter((token) => !OCCUPATIONAL_ROLE_MARKERS.has(token));
    if (!sharedDomainTokens.length)
        return 0;
    const bothDescribeRoles = [...leftTokens].some((token) => OCCUPATIONAL_ROLE_MARKERS.has(token))
        && [...rightTokens].some((token) => OCCUPATIONAL_ROLE_MARKERS.has(token));
    return 40 + sharedDomainTokens.length + (bothDescribeRoles ? 10 : 0);
}
function occupationalTokens(value) {
    const stopWords = new Set(["de", "da", "do", "das", "dos", "em", "para", "com", "senior", "pleno", "junior"]);
    const aliases = {
        gerente: "lideranca", gerentes: "lideranca", gestor: "lideranca", gestora: "lideranca", gestores: "lideranca", gestoras: "lideranca", coordenador: "lideranca", coordenadora: "lideranca", coordenadores: "lideranca", coordenadoras: "lideranca", manager: "lideranca", managers: "lideranca", coordinator: "lideranca", coordinators: "lideranca", lider: "lideranca", lideres: "lideranca", head: "lideranca",
        analistas: "analista", assistentes: "assistente", auxiliares: "auxiliar", estagiaria: "estagiario", estagiarias: "estagiario", estagiarios: "estagiario",
        especialistas: "especialista", consultora: "consultor", consultoras: "consultor", consultores: "consultor", engenheira: "engenheiro", engenheiras: "engenheiro", engenheiros: "engenheiro",
        diretora: "diretor", diretoras: "diretor", diretores: "diretor", executiva: "executivo", executivas: "executivo", executivos: "executivo", supervisora: "supervisor", supervisoras: "supervisor", supervisores: "supervisor",
        tecnica: "tecnico", tecnicas: "tecnico", tecnicos: "tecnico", desenvolvedora: "desenvolvedor", desenvolvedoras: "desenvolvedor", desenvolvedores: "desenvolvedor", designers: "designer", vendedora: "vendedor", vendedoras: "vendedor", vendedores: "vendedor", operadora: "operador", operadoras: "operador", operadores: "operador",
        projeto: "projeto", projetos: "projeto", project: "projeto", pm: "projeto", pmo: "projeto",
        ti: "tecnologia", it: "tecnologia", tecnologia: "tecnologia", tecnologias: "tecnologia", informacao: "tecnologia", informatica: "tecnologia",
    };
    return new Set(value.split(" ").filter((token) => token.length > 1 && !stopWords.has(token)).map((token) => aliases[token] ?? token));
}
const OCCUPATIONAL_ROLE_MARKERS = new Set([
    "lideranca", "analista", "assistente", "auxiliar", "estagiario", "especialista", "consultor", "engenheiro",
    "diretor", "executivo", "supervisor", "tecnico", "desenvolvedor", "designer", "vendedor", "operador",
]);
export function assessVacancyEvidence(area, position, requirements) {
    const evidenceItems = uniqueEvidence([...area.evidence, ...position.evidence, ...requirements.flatMap((item) => item.evidence)]);
    const independentSourceCount = new Set(evidenceItems.map((item) => item.sourceId ?? `${item.fieldPath}:${normalize(item.label)}`)).size;
    const professionalContextEvidenceCount = evidenceItems.filter((item) => item.fieldPath === "professionalTitle" || item.fieldPath?.startsWith("experiences.")).length;
    const level = independentSourceCount >= 2 && professionalContextEvidenceCount > 0
        ? "corroborated"
        : professionalContextEvidenceCount > 0 || independentSourceCount >= 2
            ? "supported"
            : "limited";
    return {
        level,
        evidenceCount: evidenceItems.length,
        independentSourceCount,
        professionalContextEvidenceCount,
        contradictionReview: "not_automatically_evaluated",
        reasons: [
            `${evidenceItems.length} evidência${evidenceItems.length === 1 ? "" : "s"} rastreável${evidenceItems.length === 1 ? "" : "is"}.`,
            `${independentSourceCount} fonte${independentSourceCount === 1 ? "" : "s"} independente${independentSourceCount === 1 ? "" : "s"}.`,
            professionalContextEvidenceCount ? `${professionalContextEvidenceCount} evidência${professionalContextEvidenceCount === 1 ? "" : "s"} em título ou experiência profissional.` : "Nenhuma evidência contextual em título ou experiência profissional.",
            "Contradições não são concluídas automaticamente; permanecem para revisão humana.",
        ],
    };
}
function assessVacancyFunction(vacancy, candidate, area, position) {
    const areaRoleEvidence = area.evidence.find((item) => item.source === "Cargo em experiência profissional");
    const fallbackTitleEvidence = candidate.profileData.professionalTitle
        ? evidence(candidate.profileData.professionalTitle, "Título profissional", "professionalTitle", "professionalTitle", "professionalTitle")
        : candidate.profileData.experiences.flatMap((item) => item.role ? [evidence(item.role, "Experiência profissional", `experience:${item.id}:role`, `experiences.${item.id}.role`, "professionalTitle")] : [])[0];
    const selectedEvidence = position.evidence[0] ?? areaRoleEvidence ?? fallbackTitleEvidence;
    const textualStrength = selectedEvidence ? occupationalTitleRelationStrength(vacancy.title, selectedEvidence.label) : 0;
    const directMapping = position.status === "possible_title_relation" && textualStrength === 100
        ? ["same_function", 20]
        : position.status === "possible_title_relation" && textualStrength >= 80
            ? ["equivalent_function", 17]
            : {
                same_reference: ["same_function", 20],
                equivalent_reference: ["equivalent_function", 17],
                related_reference: ["related_function", 12],
                possible_title_relation: ["contextual_relation", 8],
            }[position.status];
    let relation = "no_relation";
    let basePoints = 0;
    let explanation = position.explanation;
    let relationEvidence = position.evidence;
    if (directMapping) {
        [relation, basePoints] = directMapping;
    }
    else if (area.status === "experience_area" && areaRoleEvidence && seniorityRank(vacancy.title) !== null && seniorityRank(areaRoleEvidence.label) !== null) {
        relation = "equivalent_function";
        basePoints = 17;
        relationEvidence = [areaRoleEvidence];
        explanation = `A função observada em “${areaRoleEvidence.label}” pertence à mesma área profissional e possui natureza equivalente para o cálculo; a descoberta continua sustentada pela área.`;
    }
    else if (area.status === "experience_area") {
        relation = "contextual_relation";
        basePoints = 8;
        relationEvidence = area.evidence;
        explanation = "Há contexto profissional da área que permite uma comparação limitada da função, sem equivalência ocupacional estruturada.";
    }
    const seniority = assessSeniority(vacancy.title, selectedEvidence?.label, basePoints);
    return {
        relation,
        basePoints,
        seniorityAdjustment: seniority.adjustment,
        seniorityRelation: seniority.relation,
        coverageState: basePoints > 0 ? "evaluated_relation" : selectedEvidence ? "evaluated_no_relation" : "insufficient_evidence",
        evidence: relationEvidence,
        explanation: `${explanation}${seniority.explanation ? ` ${seniority.explanation}` : ""}`,
    };
}
function assessVacancyTrajectory(vacancy, candidate, area, position, functionAssessment, requirements) {
    const entryLevelVacancy = isEntryLevelVacancy(vacancy.title);
    const professionalHistory = candidate.profileData.experiences.some((item) => Boolean(item.role?.trim() || item.description?.trim() || item.evidenceText?.trim()));
    const directAreaEvidence = area.evidence.filter((item) => item.source === "Cargo em experiência profissional");
    const directFunctionEvidence = professionalHistory && (functionAssessment.relation === "same_function" || functionAssessment.relation === "equivalent_function")
        ? functionAssessment.evidence
        : [];
    const directEvidence = uniqueEvidence([...directAreaEvidence, ...directFunctionEvidence]);
    if (directEvidence.length)
        return {
            relation: "direct",
            entryLevelVacancy,
            evidence: directEvidence,
            explanation: "A trajetória profissional possui experiência direta na área ou em função equivalente à Posição.",
        };
    const relatedEvidence = uniqueEvidence([
        ...(area.status === "profile_area" ? area.evidence : []),
        ...(["related_reference", "possible_title_relation"].includes(position.status) ? position.evidence : []),
    ]);
    if (relatedEvidence.length)
        return {
            relation: "related",
            entryLevelVacancy,
            evidence: relatedEvidence,
            explanation: "A trajetória profissional possui relação adjacente ou transferível com a Posição, sem equivalência direta comprovada.",
        };
    const contextualEvidence = uniqueEvidence([
        ...(area.status !== "none" ? area.evidence : []),
        ...(position.status !== "none" ? position.evidence : []),
        ...requirements.filter((item) => item.status !== "no_evidence").flatMap((item) => item.evidence),
    ]);
    if (entryLevelVacancy && contextualEvidence.length)
        return {
            relation: "entry_potential",
            entryLevelVacancy,
            evidence: contextualEvidence,
            explanation: "A Posição é de entrada; formação, projetos ou conhecimentos publicados sustentam uma descoberta por potencial, mesmo sem experiência profissional relacionada.",
        };
    if (contextualEvidence.length)
        return {
            relation: "contextual_only",
            entryLevelVacancy,
            evidence: contextualEvidence,
            explanation: "Foram encontrados somente sinais contextuais ou requisitos isolados, sem trajetória profissional relacionada suficiente para um Prisma Score comparável.",
        };
    return {
        relation: "none",
        entryLevelVacancy,
        evidence: [],
        explanation: "Não foi encontrada trajetória profissional relacionada nem outro sinal rastreável para esta Posição.",
    };
}
function isEntryLevelVacancy(title) {
    const normalized = normalize(title);
    return /(?:^| )(?:aprendiz|estagiario|trainee|auxiliar|assistente|junior|jr)(?= |$)/.test(normalized);
}
function assessSeniority(targetTitle, observedTitle, basePoints) {
    if (!basePoints || !observedTitle)
        return { adjustment: 0, relation: "not_available", explanation: "A senioridade não foi usada como inferência." };
    const target = seniorityRank(targetTitle);
    const observed = seniorityRank(observedTitle);
    if (target === null || observed === null)
        return { adjustment: 0, relation: "not_available", explanation: "A senioridade não está explicitamente sustentada e não alterou os pontos." };
    const difference = observed - target;
    if (difference === 0)
        return { adjustment: 0, relation: "aligned", explanation: "A senioridade observada está alinhada à prevista." };
    if (Math.abs(difference) === 1)
        return { adjustment: -1, relation: difference > 0 ? "adjacent_above" : "adjacent_below", explanation: `Experiência ${difference > 0 ? "acima" : "abaixo"} em nível adjacente à senioridade prevista para a posição.` };
    return { adjustment: -4, relation: difference > 0 ? "materially_above" : "materially_below", explanation: `Experiência ${difference > 0 ? "acima" : "abaixo"} da senioridade prevista para a posição; somente a dimensão Função recebeu ajuste.` };
}
function seniorityRank(title) {
    const tokens = occupationalTokens(normalize(title));
    const ranks = [
        [5, ["diretor", "executivo"]],
        [4, ["lideranca"]],
        [3, ["supervisor"]],
        [2, ["analista", "especialista", "consultor", "engenheiro", "tecnico", "desenvolvedor", "designer"]],
        [1, ["assistente", "auxiliar", "vendedor", "operador"]],
        [0, ["estagiario"]],
    ];
    return ranks.find(([, labels]) => labels.some((label) => tokens.has(label)))?.[0] ?? null;
}
function findDemonstratedEvidence(requirement, items) {
    const exactKeys = new Set(unique([requirement.label, requirement.observedTerm ?? "", requirement.conceptLabel ?? ""]).map(normalize));
    return items.find((item) => exactKeys.has(normalize(item.competencyKey))
        && item.verificationDefinitionVersion === "m51a-verification-definition-1.0.0"
        && item.evaluationVersion === "m51b-assessment-evaluation-1.0.0"
        && item.integrityRuleVersion === "m51b-integrity-ruleset-1.0.0");
}
function verificationLevelRank(level) {
    return { basic: 1, intermediate: 2, advanced: 3 }[level];
}
function uniqueEvidence(items) {
    const seen = new Set();
    return items.filter((item) => {
        const key = `${item.sourceId ?? item.fieldPath ?? item.source}:${normalize(item.label)}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
function decisionPriority(decision) {
    return decision === "confirmed" ? 1 : decision === "dismissed" ? -1 : 0;
}
function discoveryGroupPriority(group) {
    return { main_area: 2, related_area: 1, contextual_signals: 0 }[group];
}
function prismaScoreComparison(left, right) {
    if (left.score.score === null && right.score.score === null)
        return 0;
    if (left.score.score === null)
        return 1;
    if (right.score.score === null)
        return -1;
    return right.score.score - left.score.score
        || scoreStatusPriority(right.score.status) - scoreStatusPriority(left.score.status);
}
function scoreStatusPriority(status) {
    return status === "definitive" ? 2 : status === "provisional" ? 1 : 0;
}
function advisorInternalEvidence(question, draft, context) {
    const queryWords = new Set(question.split(" ").filter((word) => word.length > 2 && !advisorStopWords.has(word)));
    const questionIncludes = (value) => {
        const normalizedValue = normalize(value);
        return normalizedValue.length > 2 && (question.includes(normalizedValue) || normalizedValue.split(" ").some((word) => queryWords.has(word)));
    };
    const knowledge = context.knowledge
        .map((item) => ({ ...item, relatedLabels: unique(item.relatedLabels ?? []) }))
        .filter((item) => questionIncludes(item.label) || item.relatedLabels.some(questionIncludes));
    const vacancyTerms = [draft.title, draft.mission, ...draft.responsibilities, ...draft.expectedOutcomes, ...draft.contextItems, ...draft.requirements.map((item) => item.label)]
        .filter(Boolean)
        .filter(questionIncludes);
    const roleTerms = context.roles.flatMap((role) => [role.name, ...role.requirements]).filter(questionIncludes);
    const knowledgeLabels = unique(knowledge.map((item) => item.label));
    const related = knowledge.flatMap((item) => item.relatedLabels.map((label) => `${item.label} → ${label}`));
    const statements = [];
    if (vacancyTerms.length)
        statements.push(`Na Vaga atual, ${joinHumanList(unique(vacancyTerms).slice(0, 4))} aparece ${vacancyTerms.length === 1 ? "como informação relacionada" : "como informações relacionadas"}.`);
    if (roleTerms.length)
        statements.push(`Nas funções acessíveis, há referência a ${joinHumanList(unique(roleTerms).slice(0, 4))}.`);
    if (knowledgeLabels.length) {
        const provenance = unique(knowledge.map((item) => item.scope === "organization" ? "Knowledge da empresa" : item.source ? `Knowledge Global (${item.source})` : "Knowledge Global"));
        statements.push(`${joinHumanList(provenance)} reconhece ${joinHumanList(knowledgeLabels)}.`);
    }
    if (related.length)
        statements.push(`As relações publicadas disponíveis conectam ${joinHumanList(unique(related).slice(0, 6))}.`);
    if (!statements.length)
        return { answer: "Não há informação suficiente na empresa para responder com segurança.", status: "insufficient" };
    if (knowledgeLabels.length && related.length && vacancyTerms.length)
        return { answer: statements.join(" "), status: "sufficient" };
    return { answer: statements.join(" "), status: "partial" };
}
function advisorContextMetadata(context) {
    return `Contexto considerado: Vaga atual, ${context.otherVacancies.length} ${context.otherVacancies.length === 1 ? "outra Vaga" : "outras Vagas"} e ${context.roles.length} ${context.roles.length === 1 ? "função acessível" : "funções acessíveis"}.`;
}
const advisorStopWords = new Set([
    "como", "qual", "quais", "porque", "para", "esta", "esse", "isso", "sobre", "entre", "com", "sem", "uma", "uns", "das", "dos", "que", "sao", "são", "tem", "temos", "vaga", "empresa", "prisma", "atual", "relacionam", "relaciona", "relacao", "relação",
]);
function normalize(value) {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9+#.]+/g, " ").trim();
}
function unique(values) {
    const seen = new Set();
    return values.filter((value) => { const key = normalize(value); if (!key || seen.has(key))
        return false; seen.add(key); return true; });
}
function joinHumanList(values) {
    if (values.length < 2)
        return values[0] ?? "nenhuma fonte identificada";
    return `${values.slice(0, -1).join(", ")} e ${values.at(-1)}`;
}
function sharesRelevantWord(left, right) {
    const leftWords = new Set(normalize(left).split(" ").filter((word) => word.length > 3));
    return normalize(right).split(" ").some((word) => word.length > 3 && leftWords.has(word));
}
function isSimilarVacancy(title, area, draft) {
    return Boolean(draft.area.trim() && area && normalize(area) === normalize(draft.area)) || sharesRelevantWord(title, draft.title);
}
function extractExplicitRequirementAddition(question) {
    const match = question.match(/(?:adicionar|incluir)[^“\"]{0,40}[“\"]([^”\"]{2,80})[”\"]/i);
    if (!match?.[1]?.trim())
        return null;
    return { label: match[1].trim(), importance: /desej[aá]vel/i.test(question) ? "desired" : "required" };
}
function stripLead(value) {
    return value.replace(/^(a pessoa ser[aá] respons[aá]vel por|ser[aá] respons[aá]vel por|respons[aá]vel por|estamos buscando[^.]*? para)\s*/i, "").replace(/[.]$/, "").trim();
}
function operationalResponsibility(value) {
    const cleaned = stripLead(value)
        .replace(/\b(usando|com conhecimento em|com experiência em|utilizando)\s+(?:node\.?js|php|laravel|docker|java|python|kafka|aws|azure)(?:\s*(?:,|e|ou)\s*(?:node\.?js|php|laravel|docker|java|python|kafka|aws|azure))*\b/ig, "")
        .replace(/\s{2,}/g, " ").replace(/\s+,/g, ",").replace(/[,:;\-\s]+$/, "").trim();
    if (!cleaned || /^(node\.?js|php|laravel|docker|java|python|kafka|aws|azure)$/i.test(cleaned))
        return "";
    return cleaned;
}
function createId() { return globalThis.crypto.randomUUID(); }
function isEvidence(value) { return value !== null; }
