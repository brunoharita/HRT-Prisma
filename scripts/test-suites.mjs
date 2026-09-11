// Explicit reviewed boundaries, not an automatic dependency/impact analyzer.
export const personFlowGroups = {
  ingestion: ["curriculumFirstIntake", "m2PeopleIngestion", "processResume", "documentIntelligence", "adaptiveResumeExtraction", "documentRecordPatterns", "partialResumeRecovery"],
  review: ["m2DocumentReliabilityReview", "m5SpatialEvidence", "reviewFieldLifecycle", "reviewFieldLifecycleMigration", "educationClassification", "educationClassificationUi", "educationClassificationMigration", "customProfileSections"],
  publication: ["profileDelta", "profilePublicationDeltaMigration", "profileDocumentLifecycle"],
  presentation: ["resumeProductState", "documentPresentation", "personActionCenter", "profileProfessionalStandard", "resumeInterruptionUx", "reviewOperationErrors"],
  security: ["isolation", "webProtectedRoutes", "schemaMigration", "m56MigrationSecurity"],
  scenarios: ["personFlowScenarios"],
};

export const testSuites = {
  "person-flow": {
    version: "1.0.0",
    files: [...Object.values(personFlowGroups).flat().map((name) => `tests/${name}.test.ts`), "tests/tooling/validationRunner.test.mjs"],
    limits: ["No live database/RLS execution", "No authenticated browser smoke", "No Paddle/OCR provider execution", "No real resumes or LLM calls", "Not a whole-repository regression gate"],
  },
};
