# Inventário de carregamento — v2.1.6

Revisão de fonte e estados: 30 páginas, componentes assíncronos e autenticação. Todos os labels abaixo são textos fixos, sem dados de registros. Browser separado prova comportamento; inventário não equivale a jornada real autenticada.

| Superfície | Arquivo | Estados observados |
| --- | --- | --- |
| AssessmentItemBankPage | web/src/pages/AssessmentItemBankPage.tsx | loading, saving |
| CompetencyVerificationPage | web/src/pages/CompetencyVerificationPage.tsx | loading, saving |
| DocumentDetailPage | web/src/pages/DocumentDetailPage.tsx | loading, busy |
| DocumentOperationsPage | web/src/pages/DocumentOperationsPage.tsx | loading |
| HomePage | web/src/pages/HomePage.tsx | loading, checkingSourceId |
| KnowledgePage | web/src/pages/KnowledgePage.tsx | decisionLoading, loading |
| PasswordChangePage | web/src/pages/PasswordChangePage.tsx | submitting |
| PeoplePage | web/src/pages/PeoplePage.tsx | loading |
| PersonDataSelfServicePage | web/src/pages/PersonDataSelfServicePage.tsx | loading, deleting |
| PersonFormPage | web/src/pages/PersonFormPage.tsx | loading, saving |
| PersonMergePage | web/src/pages/PersonMergePage.tsx | loading, busy |
| PersonProfilePage | web/src/pages/PersonProfilePage.tsx | loading |
| PersonWorkspacePage | web/src/pages/PersonWorkspacePage.tsx | loading, busy |
| MoveDocumentModal | web/src/pages/PersonWorkspacePage.tsx | moving |
| ProfileComparePage | web/src/pages/ProfileComparePage.tsx | loading |
| ProfileDeltaPage | web/src/pages/ProfileDeltaPage.tsx | loading, busy |
| ProfileReviewPage | web/src/pages/ProfileReviewPage.tsx | loading, busy |
| ProfileSearchPage | web/src/pages/ProfileSearchPage.tsx | loading |
| ProfileVersionsPage | web/src/pages/ProfileVersionsPage.tsx | loading, busy |
| ResumeImportPage | web/src/pages/ResumeImportPage.tsx | busy |
| SettingsPage | web/src/pages/SettingsPage.tsx | loading |
| UserFormPage | web/src/pages/UserFormPage.tsx | loading, submitting, resettingPassword |
| UsersPage | web/src/pages/UsersPage.tsx | loading |
| VacanciesPage | web/src/pages/VacancyPages.tsx | loading, deletingId |
| VacancyEditorPage | web/src/pages/VacancyPages.tsx | loading, saving, advisorLoading, referenceSearchLoading |
| VacancyDetailPage | web/src/pages/VacancyPages.tsx | loading, deleting |
| VacancyPeoplePage | web/src/pages/VacancyPages.tsx | decidingPersonId, learningPersonId, loading, interpreting |
| VacancyComparePage | web/src/pages/VacancyPages.tsx | loading |
| VerificationRequirementActions | web/src/pages/VacancyPages.tsx | creatingId |
| VerificationOperationsPage | web/src/pages/VerificationOperationsPage.tsx | loading, issuing |
| VerificationSessionPage | web/src/pages/VerificationSessionPage.tsx | loading, saving |
| PositionTaxonomyPanel | web/src/components/PositionTaxonomyPanel.tsx | loading |
| KnowledgePicker | web/src/components/PositionTaxonomyPanel.tsx | loading |
| ComplementDialog | web/src/components/PositionTaxonomyPanel.tsx | busy |
| TrajectoryConflictReview | web/src/components/TrajectoryConflictReview.tsx | loading, saving, refreshing |
| CompetencyCuration | web/src/components/profile/CompetencyCuration.tsx | busy |
| CurationForm | web/src/components/profile/CompetencyCuration.tsx | searching, suggestingDescription, saving |
| CompetencyGroupModal | web/src/components/profile/CompetencyGroupModal.tsx | loading, busy |
| EvidenceLinkModal | web/src/components/profile/PersonProfessionalEvidenceMap.tsx | busy |
| NormalizationStatus | web/src/components/profile/PersonProfessionalEvidenceMap.tsx | requesting |
| ProfileSynthesisBody | web/src/components/profile/ProfileSynthesisSurface.tsx | retrying |
| DocumentEvidenceViewer | web/src/components/review/DocumentEvidenceViewer.tsx | loading, rendering, ocrBusy |

Complementos necessários: refresh de Pessoa/Documento/Revisão; opções e reutilização de Posição; detalhes e atualização de avaliação; histórico/seleção da taxonomia; classificações; fontes de evidência; consulta e estado queued/processing da análise persistida; ações de Conhecimento; navegação/pausa/retomada da verificação; cópia/gestão de convite; acesso/saída da sessão e readiness visível da importação. Tarefas usam tokens independentes e encerramento em finally. Modais que ficam montados vinculam feedback ao estado aberto.

VacancyAssistPage é síncrona, sem espera artificial. ResumeImport, ProfileSearch e PasswordChange não carregam dados essenciais ao abrir: feedback inicia na operação real. Rotas de placeholder/negação/404 são estáticas. Troca de empresa navega/atualiza escopo local e os carregamentos das páginas subsequentes são sinalizados. Telemetria de foco e registros técnicos que não mudam a visualização não geram aviso artificial.
