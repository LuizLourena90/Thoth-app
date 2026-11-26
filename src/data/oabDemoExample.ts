import type { CohortInfo, EditalCard, ExamTrack } from "../types";

export const OAB_DEMO_TRACK: ExamTrack = {
  id: "oab-demo-fgv",
  title: "Exame da OAB — 1ª Fase",
  subtitle: "Plano demonstrativo com 5 tópicos de alta incidência",
  banca: "FGV",
  targetDate: "Próximo Exame",
};

export function createOabDemoCohorts(trackId: string): CohortInfo[] {
  return [
    {
      id: "oab-demo-turma-noturno",
      name: "Turma Noturno — 1ª Fase OAB",
      semester: "2026.2",
      enrolledStudents: 78,
      activeWeeklyRate: 81,
      averageAccuracy: 69,
      atRiskStudents: 11,
      publishedTrackIds: [trackId],
      coordinatorNotes: "Boa evolução em Ética Profissional e Constitucional",
    },
    {
      id: "oab-demo-turma-manha",
      name: "Turma Manhã — Intensivo OAB",
      semester: "2026.2",
      enrolledStudents: 54,
      activeWeeklyRate: 64,
      averageAccuracy: 57,
      atRiskStudents: 16,
      publishedTrackIds: [trackId],
      coordinatorNotes: "Reforço recomendado em Processo Civil e Direito Penal",
    },
  ];
}

export function createOabDemoCards(trackId: string): EditalCard[] {
  return [
    {
      id: `oab-demo-etica-${Date.now()}`,
      trackId,
      discipline: "Ética Profissional",
      topic: "Direitos e Prerrogativas do Advogado (Art. 7º do EOAB)",
      normativeRefs: "Lei 8.906/94, arts. 6º, 7º e 7º-B; Súmula Vinculante 14 do STF",
      incidence: "Alta",
      examWeightQuestions: 8,
      stage: "revisao",
      estimatedMinutes: 45,
      summary:
        "As prerrogativas profissionais garantem a independência da advocacia e o exercício pleno da defesa. Não há hierarquia nem subordinação entre advogados, magistrados e membros do Ministério Público. A violação às garantias de inviolabilidade do escritório, comunicação reservada com cliente preso e vista de autos findos ou em andamento sem sigilo configura crime previsto no art. 7º-B do Estatuto da OAB.",
      examTraps: [
        "Busca e apreensão em escritório exige decisão fundamentada, mandado específico e pormenorizado e acompanhamento de representante da OAB, sendo vedada a apreensão de documentos de outros clientes não investigados.",
        "Mesmo em inquérito sigiloso, o advogado tem direito de acesso aos elementos de prova já documentados nos autos que digam respeito ao direito de defesa (Súmula Vinculante 14), excluídas apenas diligências em curso ainda não documentadas.",
      ],
      steps: [
        { id: "oab-s1-1", label: "Leitura comentada do art. 7º da Lei 8.906/94", done: true },
        { id: "oab-s1-2", label: "Revisão da Súmula Vinculante 14 e art. 7º-B", done: true },
        { id: "oab-s1-3", label: "Resolução de questões FGV sobre prerrogativas", done: true },
      ],
      flashcards: [
        {
          id: "oab-fc-1",
          front: "Qual a condição para a validade da busca e apreensão em escritório de advocacia?",
          back: "Indícios de autoria e materialidade da prática de crime por parte de advogado, mandado judicial específico e pormenorizado e presença de representante da OAB (art. 7º, § 6º, EOAB).",
          articleRef: "Lei 8.906/94, art. 7º, § 6º",
          mastered: true,
        },
        {
          id: "oab-fc-2",
          front: "O advogado preso em flagrante por motivo ligado ao exercício da profissão tem direito à presença da OAB?",
          back: "Sim. Somente no caso de prisão em flagrante por motivo ligado ao exercício da advocacia exige-se a presença de representante da OAB para lavratura do auto, sob pena de nulidade (art. 7º, IV, EOAB).",
          articleRef: "Lei 8.906/94, art. 7º, IV",
          mastered: false,
        },
      ],
      questions: [
        {
          id: "oab-q-1",
          stem: "Durante investigação criminal contra o advogado Marcos, o juízo deferiu busca e apreensão em seu escritório profissional sem intimar a Seccional da OAB para acompanhar a diligência, sob o argumento de sigilo da investigação. À luz do Estatuto da OAB, a medida:",
          options: [
            "É válida, pois o sigilo do inquérito afasta a participação de terceiros na diligência.",
            "É nula, pois exige presença de representante da OAB e mandado específico e pormenorizado.",
            "É válida apenas se o mandado abranger computadores e celulares de todos os clientes do escritório.",
            "Depende exclusivamente de autorização posterior do Conselho Federal da OAB.",
          ],
          correctIndex: 1,
          explanation:
            "Nos termos do art. 7º, § 6º, do EOAB, a quebra da inviolabilidade do escritório exige mandado específico e pormenorizado a ser cumprido na presença de representante da OAB, vedada a utilização de documentos pertencentes a clientes não investigados.",
          articleRef: "Lei 8.906/94, art. 7º, § 6º",
        },
      ],
      sourceTitle: "Estatuto da Advocacia e da OAB — FGV",
      updatedAt: "Exemplo OAB",
    },
    {
      id: `oab-demo-const-${Date.now() + 1}`,
      trackId,
      discipline: "Direito Constitucional",
      topic: "Controle de Constitucionalidade Concentrado (ADI, ADC e ADPF)",
      normativeRefs: "CF/88, arts. 102, I, 'a' e 103; Lei 9.868/99; Lei 9.882/99",
      incidence: "Alta",
      examWeightQuestions: 7,
      stage: "exercicios",
      estimatedMinutes: 60,
      summary:
        "O controle concentrado no STF verifica em tese a compatibilidade de atos normativos com a Constituição Federal. Enquanto a ADI e a ADC exigem lei ou ato normativo federal (ou estadual na ADI) posterior à CF/88, a ADPF possui caráter subsidiário e alcança normas pré-constitucionais, leis municipais e atos do Poder Público lesivos a preceito fundamental.",
      examTraps: [
        "Pertinência temática é exigida apenas dos legitimados especiais (Governador, Mesa da Assembleia/Câmara Legislativa, confederação sindical e entidade de classe de âmbito nacional).",
        "Lei municipal contestada em face da Constituição Federal não pode ser objeto de ADI no STF, devendo ser impugnada via ADPF ou controle difuso.",
      ],
      steps: [
        { id: "oab-s2-1", label: "Diferenciar legitimados universais e especiais (art. 103 CF)", done: true },
        { id: "oab-s2-2", label: "Revisar objeto e subsidiariedade da ADPF", done: true },
        { id: "oab-s2-3", label: "Resolver 10 questões de controle concentrado", done: false },
      ],
      flashcards: [
        {
          id: "oab-fc-3",
          front: "Quais legitimados do art. 103 da CF/88 precisam demonstrar pertinência temática?",
          back: "Mesa de Assembleia Legislativa ou da Câmara Legislativa do DF, Governador de Estado ou do DF, e confederação sindical ou entidade de classe de âmbito nacional.",
          articleRef: "CF/88, art. 103, IV, V e IX",
          mastered: false,
        },
      ],
      questions: [
        {
          id: "oab-q-2",
          stem: "Determinado partido político com representação no Congresso Nacional pretende questionar diretamente no STF uma lei municipal promulgada em 2024 por violação direta a preceito fundamental da Constituição Federal. A ação cabível é:",
          options: [
            "Ação Direta de Inconstitucionalidade (ADI), por haver ofensa direta à CF/88.",
            "Arguição de Descumprimento de Preceito Fundamental (ADPF), dado o caráter subsidiário.",
            "Ação Declaratória de Constitucionalidade (ADC).",
            "Reclamação Constitucional originária.",
          ],
          correctIndex: 1,
          explanation:
            "Leis municipais não podem ser objeto de ADI perante o STF (art. 102, I, 'a', CF/88). Havendo lesão a preceito fundamental e inexistindo outro meio eficaz, cabe ADPF (art. 1º, parágrafo único, I, da Lei 9.882/99).",
          articleRef: "Lei 9.882/99, art. 1º, parágrafo único, I",
        },
      ],
      sourceTitle: "Jurisprudência STF e CF/88",
      updatedAt: "Exemplo OAB",
    },
    {
      id: `oab-demo-civil-${Date.now() + 2}`,
      trackId,
      discipline: "Direito Civil",
      topic: "Responsabilidade Civil Objetiva e Excludentes do Nexo Causal",
      normativeRefs: "Código Civil, arts. 186, 187, 927, parágrafo único, e 932 a 933",
      incidence: "Alta",
      examWeightQuestions: 6,
      stage: "resumo",
      estimatedMinutes: 50,
      summary:
        "A responsabilidade civil objetiva prescinde da comprovação de culpa, bastando a demonstração da conduta, do dano e do nexo de causalidade. Aplica-se nos casos especificados em lei, nas hipóteses do art. 932 do CC (pais, tutores, empregadores, hotéis) e quando a atividade normalmente desenvolvida implicar, por sua natureza, risco para os direitos de outrem.",
      examTraps: [
        "O empregador responde objetivamente pelos atos de seus empregados no exercício do trabalho (art. 933), mas tem direito de regresso contra o causador do dano caso este tenha agido com dolo ou culpa (art. 934).",
        "A culpa exclusiva da vítima rompe o nexo causal e exclui o dever de indenizar; já a culpa concorrente apenas reduz proporcionalmente o valor da indenização (art. 945).",
      ],
      steps: [
        { id: "oab-s3-1", label: "Estudar arts. 927 a 945 do Código Civil", done: true },
        { id: "oab-s3-2", label: "Sintetizar hipóteses de responsabilidade pelo fato de terceiro", done: true },
        { id: "oab-s3-3", label: "Praticar casos concretos sobre excludentes", done: false },
      ],
      flashcards: [
        {
          id: "oab-fc-4",
          front: "Qual a diferença entre culpa exclusiva da vítima e culpa concorrente no Código Civil?",
          back: "A culpa exclusiva da vítima rompe o nexo de causalidade e exclui a responsabilidade; a culpa concorrente reduz a indenização segundo a gravidade da culpa de cada parte (art. 945, CC).",
          articleRef: "CC, art. 945",
          mastered: false,
        },
      ],
      questions: [
        {
          id: "oab-q-3",
          stem: "Um motorista contratado por empresa de logística colide culposamente com veículo particular durante entrega comercial. Em ação indenizatória movida pela vítima contra a empresa empregadora:",
          options: [
            "A empresa só responde se a vítima comprovar culpa in eligendo da empregadora.",
            "A responsabilidade da empresa é objetiva, independentemente de culpa de sua parte.",
            "A empresa é isenta se o contrato proibir excesso de velocidade.",
            "A responsabilidade é subsidiária e depende de prévia execução do motorista.",
          ],
          correctIndex: 1,
          explanation:
            "Conforme os arts. 932, III, e 933 do Código Civil, o empregador responde independentemente de culpa pelos atos praticados por seus empregados no exercício do trabalho que lhes competir.",
          articleRef: "CC, arts. 932, III, e 933",
        },
      ],
      sourceTitle: "Código Civil Comentado",
      updatedAt: "Exemplo OAB",
    },
    {
      id: `oab-demo-cpc-${Date.now() + 3}`,
      trackId,
      discipline: "Direito Processual Civil",
      topic: "Tutelas Provisórias de Urgência e de Evidência",
      normativeRefs: "CPC, arts. 294 a 311",
      incidence: "Média",
      examWeightQuestions: 6,
      stage: "estudo",
      estimatedMinutes: 50,
      summary:
        "A tutela provisória divide-se em tutela de urgência (antecipada ou cautelar, antecedente ou incidental) e tutela de evidência. A tutela de urgência exige probabilidade do direito e perigo de dano ou risco ao resultado útil do processo (art. 300), enquanto a tutela de evidência dispensa a demonstração de perigo de dano nas hipóteses taxativas do art. 311 do CPC.",
      examTraps: [
        "A estabilização da tutela antecipada antecedente ocorre se não for interposto o respectivo recurso contra a decisão concessiva (art. 304), extinguindo-se o processo sem resolução de mérito e conservando os efeitos da decisão até eventual ação revisional no prazo de 2 anos.",
        "Na tutela cautelar antecedente, efetivada a medida, o autor deve formular o pedido principal nos mesmos autos no prazo de 30 dias (art. 308).",
      ],
      steps: [
        { id: "oab-s4-1", label: "Ler arts. 294 a 311 do CPC", done: true },
        { id: "oab-s4-2", label: "Mapear prazos da tutela antecedente (15 e 30 dias)", done: false },
        { id: "oab-s4-3", label: "Resolver questões sobre estabilização do art. 304", done: false },
      ],
      flashcards: [
        {
          id: "oab-fc-5",
          front: "Qual o prazo para ajuizar ação visando rever, reformar ou invalidar tutela antecipada estabilizada?",
          back: "2 (dois) anos, contados da ciência da decisão que extinguiu o processo (art. 304, § 5º, CPC).",
          articleRef: "CPC, art. 304, § 5º",
          mastered: false,
        },
      ],
      questions: [
        {
          id: "oab-q-4",
          stem: "Concedida tutela antecipada requerida em caráter antecedente, o réu permanece inerte e não interpõe agravo de instrumento no prazo legal. Nesse cenário, segundo o CPC:",
          options: [
            "A tutela torna-se estável, extingue-se o processo e a decisão faz coisa julgada material imediata.",
            "A tutela torna-se estável e o processo será extinto, cabendo ação revisional no prazo de 2 anos.",
            "O juiz deve obrigatoriamente converter o pedido em cautelar incidental.",
            "A decisão perde eficácia após 30 dias se não houver contestação.",
          ],
          correctIndex: 1,
          explanation:
            "Nos termos do art. 304 do CPC, a tutela antecipada torna-se estável se não houver recurso, extinguindo-se o processo sem formação de coisa julgada (§ 6º), mas mantendo eficácia até eventual ação revisional proposta em até 2 anos (§ 5º).",
          articleRef: "CPC, art. 304, §§ 1º, 5º e 6º",
        },
      ],
      sourceTitle: "Código de Processo Civil",
      updatedAt: "Exemplo OAB",
    },
    {
      id: `oab-demo-penal-${Date.now() + 4}`,
      trackId,
      discipline: "Direito Penal",
      topic: "Erro de Tipo e Erro de Proibição na Teoria do Crime",
      normativeRefs: "Código Penal, arts. 20 e 21",
      incidence: "Média",
      examWeightQuestions: 5,
      stage: "edital",
      estimatedMinutes: 40,
      summary:
        "O erro de tipo recai sobre elemento constitutivo do tipo legal de crime (falsa percepção da realidade fática) e exclui sempre o dolo, permitindo a punição por crime culposo se previsto em lei (art. 20). Já o erro de proibição recai sobre a ilicitude do fato: se inevitável, isenta de pena por excluir a culpabilidade; se evitável, diminui a pena de um sexto a um terço (art. 21).",
      examTraps: [
        "Erro de tipo inevitável exclui dolo e culpa (fato atípico). Erro de tipo evitável exclui o dolo, mas permite punição por culpa se houver modalidade culposa prevista.",
        "Erro de proibição nunca exclui o dolo: o agente sabe exatamente o que faz no plano fático, mas desconhece que a conduta é ilícita.",
      ],
      steps: [
        { id: "oab-s5-1", label: "Diferenciar efeitos do art. 20 e art. 21 do CP", done: false },
        { id: "oab-s5-2", label: "Revisar descriminantes putativas (art. 20, § 1º)", done: false },
        { id: "oab-s5-3", label: "Fazer bateria de questões FGV sobre teoria do erro", done: false },
      ],
      flashcards: [
        {
          id: "oab-fc-6",
          front: "Qual a consequência jurídica do erro de proibição inevitável (escusável)?",
          back: "Exclui a potencial consciência da ilicitude e, consequentemente, afasta a culpabilidade, isentando o agente de pena (art. 21, caput, CP).",
          articleRef: "CP, art. 21",
          mastered: false,
        },
      ],
      questions: [
        {
          id: "oab-q-5",
          stem: "Ao sair de uma sala de aula, João pega por engano o notebook idêntico de um colega acreditando ser o seu próprio aparelho. Sob a ótica da teoria do delito, verifica-se:",
          options: [
            "Erro de proibição inevitável, excluindo a culpabilidade.",
            "Erro de tipo essencial, excluindo o dolo e tornando a conduta atípica por inexistir furto culposo.",
            "Crime impossível por ineficácia absoluta do meio.",
            "Erro acidental sobre o objeto, respondendo por furto doloso.",
          ],
          correctIndex: 1,
          explanation:
            "João desconhece a elementar 'coisa alheia' do crime de furto (art. 155, CP), configurando erro de tipo essencial (art. 20, CP), que exclui o dolo. Como não existe modalidade culposa de furto, o fato é atípico.",
          articleRef: "CP, art. 20, caput",
        },
      ],
      sourceTitle: "Código Penal — Parte Geral",
      updatedAt: "Exemplo OAB",
    },
  ];
}
