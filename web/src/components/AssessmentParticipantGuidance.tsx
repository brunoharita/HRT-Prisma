import {assessmentDeadlineLabel} from "../domain/assessmentPortalPresentation";

export function AssessmentParticipantGuidance({durationMinutes,expiresAt}:{durationMinutes:number|undefined;expiresAt:string|undefined}) {
 return <div className="pa-guidance">
  <section aria-labelledby="pa-guidance-time"><h2 id="pa-guidance-time">Tempo e conclusão</h2>
   <p>Você terá {durationMinutes} minutos a partir do início. O prazo de acesso termina em <strong>{assessmentDeadlineLabel(expiresAt)} (horário de Brasília)</strong>.</p>
   <p>Conclua e envie todas as respostas antes de terminar a duração da prova ou o prazo de acesso, o que ocorrer primeiro. O relógio continua contando se você sair ou fechar a página; retomar a avaliação não reinicia o tempo.</p>
  </section>
  <section aria-labelledby="pa-guidance-answer"><h2 id="pa-guidance-answer">Como responder</h2><ol>
   <li>Prepare um ambiente tranquilo e uma conexão estável antes de iniciar.</li>
   <li><strong>Mantenha a aba e a janela da avaliação ativas durante toda a prova.</strong> Responda com seus próprios conhecimentos. Não alterne para outras abas ou janelas para consultar conteúdo e não capture nem compartilhe as questões.</li>
   <li>Cada questão tem cinco alternativas e uma resposta correta. Selecione uma alternativa; você pode navegar entre as questões e marcar as que deseja revisar.</li>
   <li>As respostas são salvas durante o preenchimento. Aguarde <strong>Respostas sincronizadas</strong> antes de fechar a página. Se houver falha de conexão, retome a sincronização dentro do tempo disponível.</li>
   <li>Use <strong>Revisar avaliação</strong> no cabeçalho, confira todas as respostas e use <strong>Enviar avaliação</strong>. Confirme em <strong>Confirmar envio e encerrar</strong>. O tempo continua correndo durante a revisão. A avaliação só estará concluída quando aparecer <strong>Avaliação enviada</strong>; após a confirmação, as respostas não podem ser alteradas.</li>
  </ol></section>
  <section aria-labelledby="pa-guidance-privacy"><h2 id="pa-guidance-privacy">Atividade e privacidade</h2>
   <p>Suas respostas e sinais de atividade desta avaliação são registrados para apoiar a análise humana da regularidade do processo. Durante a prova, o sistema observa perda de foco da aba ou janela, intervalos sem movimento do mouse, mudanças de resposta, reabertura de questões, alterações de escala e alguns atalhos de captura recebidos pelo navegador.</p>
   <p><strong>Esses registros são limitados: não comprovam, por si só, consulta externa ou fraude e não geram eliminação automática.</strong> O uso de teclado, toque ou recursos de acessibilidade pode modificar os sinais e não representa um resultado negativo.</p>
   <details><summary>O que é registrado e quais são os limites</summary><ul>
    <li>Foco: episódios e duração em que a questão perde o foco ou a aba fica oculta, sem identificar qual outra janela foi acessada.</li>
    <li>Mouse: tempo total e maior intervalo sem movimento observado até a primeira alternativa marcada, somente enquanto a questão e a janela estão ativas. As coordenadas do ponteiro não são gravadas.</li>
    <li>Respostas: reaberturas de questões e mudanças de alternativa, sem inferir a intenção.</li>
    <li>Escala e teclado: somente alterações de escala observáveis e determinados atalhos de captura que chegam ao navegador. Não é possível confirmar que uma captura ocorreu.</li>
   </ul><p>Não há gravação da tela, coleta de imagens, conteúdo da área de transferência ou histórico geral do que você digita. Outros aparelhos, programas de captura e algumas alterações de zoom não são observáveis.</p></details>
   <p>Para dúvidas sobre o tratamento dos seus dados ou necessidades de acessibilidade, procure a empresa responsável pelo processo seletivo.</p>
  </section>
 </div>;
}
