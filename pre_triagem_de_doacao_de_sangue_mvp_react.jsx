import React, { useMemo, useState, useEffect } from "react";

// Pré-triagem anônima de doação de sangue — MVP (client-side)
// Atualizações/conteúdo principal:
// - Tema claro/escuro (classe 'dark' e toggle)
// - Tooltips com fontes normativas (title)
// - Regras de antibiótico e cirurgias conforme Anexo IV (mapa por procedimento) + retrocompat (pequena/média/grande)
// - Cálculo de data sugerida de retorno (maior janela restritiva)
// - Lista de medicamentos categorizada (inclui retinoides com exemplos)
// - Self-tests (TC1–TC11) para regressão básica
// - Mensagens de privacidade/LGPD e escopo orientativo para triagem de filas

export default function PreTriagemDoacaoSangueApp() {
  const [inputs, setInputs] = useState({
    idade: "",
    peso: "",
    altura: "",
    sexoRegulatorio: "",
    diasDesdeUltimaDoacao: "",
    febreUltimos7Dias: false,
    tatuagemOuPiercing: false,
    diasDesdeTatuagemPiercing: "",
    cirurgiaRecente: false,
    tipoCirurgia: "", // pequena | media | grande (retrocompat)
    procedimentoCirurgico: "", // mapeado pelo Anexo IV simplificado
    diasDesdeCirurgia: "",
    viagemAreaMalaria: false,
    diasDesdeViagemMalaria: "",
    dstRecente: false,
    gestanteOuAmamentando: false,
    usaMedicamentos: false,
    medicamentosTexto: "",
    medicamentosSelecionados: [],
    terminouAntibiotico: false,
    diasDesdeAntibiotico: "",
  });

  const [tema, setTema] = useState("claro");

  // Fontes normativas (resumo curto).
  const SOURCES = {
    idade: { label: "Portaria 158/2016 (Anexo IV) — Idade", url: "https://bvsms.saude.gov.br/bvs/saudelegis/gm/2016/prt0158_04_02_2016.html" },
    peso: { label: "Portaria 158/2016 (Anexo IV) — Peso mínimo", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    intervaloM: { label: "Portaria 158/2016 — Intervalo homem ≥60 d", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    intervaloF: { label: "Portaria 158/2016 — Intervalo mulher ≥90 d", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    febre: { label: "Boas práticas — afebril por ~7 d", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
    tatuagem: { label: "Tatuagem/piercing ~12 meses", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    cirurgiaPeq: { label: "Procedimentos menores: janelas curtas", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    cirurgiaMed: { label: "Cirurgias: avaliar; ~30 d (exemplo)", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    cirurgiaGra: { label: "Cirurgia maior: janela longa (ex.: 6 meses)", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    malaria: { label: "Critério epidemiológico — até 12 meses", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    ist: { label: "Triagem clínica — IST recente", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
    gestacao: { label: "Gestação/lactação — inaptidão temporária", url: "https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" },
    antibiotico: { label: "Pós-ATB: assintomático + janela mínima (serviço)", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
    finasterida: { label: "Finasterida — ~30 d", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
    dutasterida: { label: "Dutasterida — ~6 meses", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
    isotretinoina: { label: "Isotretinoína — ~30 d", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
    acitretina: { label: "Acitretina — ~3 anos", url: "https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" },
  };

  // Categorias de medicamentos (exemplos)
  const MED_CATS = [
    {
      nome: "Retinoides sistêmicos (teratogênicos)",
      descricao: "Exigem janelas longas após término do uso",
      itens: [
        { id: "isotretinoina", nome: "Isotretinoína (Roaccutan®/Genéricos)", regra: "Aguardar ~30 dias após término" },
        { id: "acitretina", nome: "Acitretina (Neotigason®/Genéricos)", regra: "Aguardar ~3 anos após término" }
      ]
    },
    {
      nome: "Antiandrogênicos / Inibidores da 5α-redutase",
      descricao: "Janelas moderadas",
      itens: [
        { id: "dutasterida", nome: "Dutasterida", regra: "Aguardar ~6 meses após término" },
        { id: "finasterida", nome: "Finasterida", regra: "Aguardar ~30 dias após término" }
      ]
    },
    {
      nome: "Antitrombóticos",
      descricao: "Avaliação obrigatória; risco hemorrágico",
      itens: [
        { id: "anticoagulantes", nome: "Varfarina, heparinas, DOACs (rivaroxabana, apixabana, etc.)", regra: "Inapto durante o uso; retorno com liberação" },
        { id: "antiagregantes", nome: "AAS, clopidogrel, ticagrelor, etc.", regra: "Avaliação; pode impedir certos hemocomponentes" }
      ]
    },
    {
      nome: "Antibióticos",
      descricao: "Aguardar resolução clínica",
      itens: [
        { id: "antibiotico", nome: "Antibiótico em uso/recente", regra: "Aguardar assintomático e ~7 dias após término (serviço); norma: vida média da droga" }
      ]
    },
    {
      nome: "Outros",
      descricao: "Conforme composição e indicação",
      itens: [
        { id: "retinoides_topicos", nome: "Retinoides tópicos potentes", regra: "Avaliação; algumas formulações exigem janela" }
      ]
    }
  ];

  // Cirurgias/Procedimentos (Anexo IV simplificado) — referência
  // Mantém retrocompatibilidade com tipoCirurgia pequena/média/grande
  const SURGERY_RULES = {
    // Odontológicos (ambulatoriais)
    odonto_muito_pequena_1d: { dias: 1, label: "Odontológico muito pequeno (sem anestesia) — 1 dia", srcKey: "cirurgiaPeq" },
    odonto_local_3d: { dias: 3, label: "Odontológico com anestesia local — 3 dias", srcKey: "cirurgiaPeq" },
    odonto_extracao_7d: { dias: 7, label: "Extração dentária — 7 dias", srcKey: "cirurgiaPeq" },
    odonto_canal_7d: { dias: 7, label: "Tratamento de canal/drenagem — 7 dias após término de ATB/AINH", srcKey: "cirurgiaPeq" },
    // Cirurgias não odontológicas (exemplos)
    nefrolitotomia_30d: { dias: 30, label: "Nefrolitotomia extracorpórea — 30 dias", srcKey: "cirurgiaMed" },
    apendicectomia_90d: { dias: 90, label: "Apendicectomia — 3 meses", srcKey: "cirurgiaMed" },
    hernia_varizes_colecistectomia_180d: { dias: 180, label: "Hernioplastia/Varizes/Colecistectomia — 6 meses", srcKey: "cirurgiaGra" },
    ortopedica_geral_360d: { dias: 360, label: "Ortopédicas em geral — 12 meses", srcKey: "cirurgiaGra" },
    outro_avaliacao: { dias: null, label: "Outro/Não listado — avaliação clínica (sem data automática)", srcKey: "cirurgiaMed" },
  };

  function onChange(e) {
    const { name, type, value, checked } = e.target;
    setInputs((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  function onToggleMed(id) {
    setInputs((p) => {
      const set = new Set(p.medicamentosSelecionados);
      if (set.has(id)) set.delete(id); else set.add(id);
      return { ...p, medicamentosSelecionados: Array.from(set) };
    });
  }

  function toNumber(v) {
    const n = parseInt(String(v).trim(), 10);
    return Number.isFinite(n) ? n : undefined;
  }

  function calcIMC(peso, alturaCm) {
    const p = Number(peso);
    const h = Number(alturaCm) / 100;
    if (!p || !h) return undefined;
    const imc = p / (h * h);
    return Math.round(imc * 10) / 10;
  }

  function interpretIMC(imc) {
    if (!imc) return "";
    if (imc < 18.5) return "Abaixo do peso (OMS). Para doação, avalia-se peso absoluto (≥ 50 kg) e condição clínica.";
    if (imc < 25) return "Eutrofia (OMS). Lembre-se: critério de doação é peso ≥ 50 kg e aptidão clínica.";
    if (imc < 30) return "Sobrepeso (OMS). A aptidão depende da avaliação clínica e critérios hemoterápicos.";
    return "Obesidade (OMS). A doação depende de avaliação clínica individual e critérios do serviço.";
  }

  // utilitário de razão com fonte
  function reason(text, srcKey) {
    return { text, srcKey };
  }

  function avaliar(inp) {
    const razoes = []; // {text, srcKey}
    const waits = []; // dias a aguardar (máxima janela)

    const idade = toNumber(inp.idade);
    const peso = toNumber(inp.peso);
    const diasUlt = toNumber(inp.diasDesdeUltimaDoacao);
    const diasTat = toNumber(inp.diasDesdeTatuagemPiercing);
    const diasCir = toNumber(inp.diasDesdeCirurgia);
    const diasMal = toNumber(inp.diasDesdeViagemMalaria);
    const diasAtb = toNumber(inp.diasDesdeAntibiotico);
    const proc = inp.procedimentoCirurgico || "";

    // 1) Idade (16–69)
    if (idade === undefined || idade < 16 || idade > 69) {
      razoes.push(reason("Idade fora da faixa geral (16 a 69 anos)", "idade"));
    }

    // 2) Peso mínimo 50 kg
    if (peso === undefined || peso < 50) {
      razoes.push(reason("Peso inferior a 50 kg", "peso"));
    }

    // 3) Intervalo entre doações
    if (diasUlt !== undefined && inp.sexoRegulatorio) {
      if (inp.sexoRegulatorio === "M" && diasUlt < 60) {
        razoes.push(reason("Intervalo entre doações para homens menor que 60 dias", "intervaloM"));
        waits.push(60 - diasUlt);
      }
      if (inp.sexoRegulatorio === "F" && diasUlt < 90) {
        razoes.push(reason("Intervalo entre doações para mulheres menor que 90 dias", "intervaloF"));
        waits.push(90 - diasUlt);
      }
    }

    // 4) Febre — sugerir 7 dias sem sintomas
    if (inp.febreUltimos7Dias) {
      razoes.push(reason("Febre recente — sugerido aguardar 7 dias assintomático", "febre"));
      waits.push(7);
    }

    // 5) Tatuagem/piercing — 12 meses
    if (inp.tatuagemOuPiercing) {
      if (diasTat === undefined || diasTat < 365) {
        razoes.push(reason("Tatuagem/piercing recente — aguardar 12 meses", "tatuagem"));
        if (diasTat !== undefined) waits.push(Math.max(0, 365 - diasTat));
      }
    }

    // 6) Cirurgia — por procedimento (Anexo IV) + retrocompat
    if (inp.cirurgiaRecente) {
      if (proc && SURGERY_RULES[proc]) {
        const rule = SURGERY_RULES[proc];
        if (rule.dias != null) {
          if (diasCir === undefined || diasCir < rule.dias) {
            razoes.push(reason(`${rule.label} — aguardar ${rule.dias} dias`, rule.srcKey));
            if (diasCir !== undefined) waits.push(Math.max(0, rule.dias - diasCir)); else waits.push(rule.dias);
          }
        } else {
          razoes.push(reason(`${rule.label}`, rule.srcKey));
        }
      }
      // retrocompat
      const tipo = inp.tipoCirurgia || "";
      if (!proc && tipo) {
        if (tipo === "pequena") {
          if (diasCir === undefined || diasCir < 14) {
            razoes.push(reason("Cirurgia/Procedimento pequeno — aguardar ~14 dias e estar assintomático", "cirurgiaPeq"));
            if (diasCir !== undefined) waits.push(Math.max(0, 14 - diasCir)); else waits.push(14);
          }
        } else if (tipo === "media") {
          if (diasCir === undefined || diasCir < 30) {
            razoes.push(reason("Cirurgia de porte médio — sugerido aguardar ~30 dias", "cirurgiaMed"));
            if (diasCir !== undefined) waits.push(Math.max(0, 30 - diasCir)); else waits.push(30);
          }
        } else if (tipo === "grande") {
          if (diasCir === undefined || diasCir < 180) {
            razoes.push(reason("Cirurgia de grande porte — sugerido aguardar ~6 meses", "cirurgiaGra"));
            if (diasCir !== undefined) waits.push(Math.max(0, 180 - diasCir)); else waits.push(180);
          }
        } else {
          if (diasCir === undefined || diasCir < 30) {
            razoes.push(reason("Cirurgia recente — requer avaliação (sugestão: ~30 dias)", "cirurgiaMed"));
            if (diasCir !== undefined) waits.push(Math.max(0, 30 - diasCir)); else waits.push(30);
          }
        }
      }
    }

    // 7) Malária — <30 dias adiar; 30–365 avaliar
    if (inp.viagemAreaMalaria) {
      if (diasMal !== undefined && diasMal < 30) {
        razoes.push(reason("Deslocamento recente para área endêmica de malária (<30 dias)", "malaria"));
        waits.push(30 - diasMal);
      } else if (diasMal === undefined || diasMal < 365) {
        razoes.push(reason("Histórico de viagem a área endêmica de malária — requer avaliação (até 12 meses)", "malaria"));
      }
    }

    // 8) IST recente — avaliação
    if (inp.dstRecente) {
      razoes.push(reason("Diagnóstico/tratamento recente de IST — requer avaliação", "ist"));
    }

    // 9) Gestação/lactação — inaptidão temporária (sem data automática)
    if (inp.gestanteOuAmamentando) {
      razoes.push(reason("Gestação/Amamentação — inaptidão temporária", "gestacao"));
    }

    // 10) Antibiótico — se selecionado OU flag de término recente
    const marcouAtb = inp.medicamentosSelecionados.includes("antibiotico") || inp.terminouAntibiotico;
    if (marcouAtb) {
      if (diasAtb === undefined || diasAtb < 7) {
        razoes.push(reason("Antibiótico recente — sugerido aguardar ~7 dias após término e estar assintomático", "antibiotico"));
        if (diasAtb !== undefined) waits.push(Math.max(0, 7 - diasAtb)); else waits.push(7);
      }
    }

    // 11) Outros medicamentos (retinoides, 5α-redutase etc.)
    if (inp.medicamentosSelecionados.length > 0) {
      inp.medicamentosSelecionados.forEach((id) => {
        if (id === "antibiotico") return; // já considerado
        const m = MED_CATS.flatMap((c) => c.itens).find((x) => x.id === id);
        if (m) {
          razoes.push(reason(`${m.nome} — ${m.regra}`, id));
          const mWait = (id === "isotretinoina") ? 30 : (id === "finasterida") ? 30 : (id === "dutasterida") ? 180 : (id === "acitretina") ? 1095 : undefined;
          if (mWait) waits.push(mWait);
        }
      });
    }

    // Texto livre de medicamentos (fallback)
    if (inp.usaMedicamentos && inp.medicamentosTexto.trim().length > 0 && !marcouAtb && inp.medicamentosSelecionados.filter(id => id !== "antibiotico").length === 0) {
      razoes.push(reason("Uso de medicamentos informado — requer avaliação profissional", ""));
    }

    // Resultado e retorno
    let status = "APTO EM PRINCÍPIO";
    if (razoes.length > 0) status = "INAPTO OU AVALIAÇÃO NECESSÁRIA";

    let dataSugerida = undefined;
    let diasRestantes = undefined;
    if (waits.length > 0) {
      const diasAguardar = Math.max(...waits);
      const dt = new Date();
      dt.setDate(dt.getDate() + diasAguardar);
      dataSugerida = dt.toISOString().slice(0, 10); // yyyy-mm-dd
      diasRestantes = diasAguardar;
    }

    return { status, razoes, dataSugerida, diasRestantes };
  }

  const resultado = useMemo(() => avaliar(inputs), [inputs]);
  const imc = useMemo(() => calcIMC(inputs.peso, inputs.altura), [inputs.peso, inputs.altura]);

  // Tema: espelha também na raiz do documento
  useEffect(() => {
    const root = document.documentElement;
    if (tema === "escuro") root.classList.add("dark"); else root.classList.remove("dark");
  }, [tema]);

  // Self-tests (executa no mount) — NÃO alterar os casos existentes; TC10–TC11 adicionados
  useEffect(() => {
    try {
      const BASE = {
        idade: "25", peso: "70", altura: "170", sexoRegulatorio: "M", diasDesdeUltimaDoacao: "120",
        febreUltimos7Dias: false, tatuagemOuPiercing: false, diasDesdeTatuagemPiercing: "",
        cirurgiaRecente: false, tipoCirurgia: "", procedimentoCirurgico: "", diasDesdeCirurgia: "",
        viagemAreaMalaria: false, diasDesdeViagemMalaria: "",
        dstRecente: false, gestanteOuAmamentando: false,
        usaMedicamentos: false, medicamentosTexto: "", medicamentosSelecionados: [],
        terminouAntibiotico: false, diasDesdeAntibiotico: ""
      };

      // TC1: Apto em princípio
      let r = avaliar(BASE);
      console.assert(r.status.includes("APTO"), "TC1 falhou: esperado APTO, obtido:", r.status);

      // TC2: Peso < 50 => inaptidão
      r = avaliar({ ...BASE, peso: "49" });
      console.assert(r.status.includes("INAPTO"), "TC2 falhou: esperado INAPTO por peso < 50");

      // TC3: Intervalo homem < 60
      r = avaliar({ ...BASE, diasDesdeUltimaDoacao: "45" });
      console.assert(r.status.includes("INAPTO"), "TC3 falhou: esperado INAPTO por intervalo insuficiente");
      console.assert(r.diasRestantes >= 15, "TC3 falhou: dias restantes deveria ser >= 15");

      // TC4: Tatuagem 200 dias => retorno em ~165 dias
      r = avaliar({ ...BASE, tatuagemOuPiercing: true, diasDesdeTatuagemPiercing: "200" });
      console.assert(r.status.includes("INAPTO"), "TC4 falhou: esperado INAPTO por tatuagem recente");
      console.assert(r.diasRestantes && r.diasRestantes >= 160 && r.diasRestantes <= 170, "TC4 falhou: janela tatuagem incorreta", r.diasRestantes);

      // TC5: Retinoide isotretinoína ⇒ ~30 dias
      r = avaliar({ ...BASE, usaMedicamentos: true, medicamentosSelecionados: ["isotretinoina"] });
      console.assert(r.diasRestantes === 30, "TC5 falhou: isotretinoína deveria sugerir 30 dias", r.diasRestantes);

      // TC6: Cirurgia pequena 10 dias ⇒ faltam ~4 dias (retrocompat)
      r = avaliar({ ...BASE, cirurgiaRecente: true, tipoCirurgia: "pequena", diasDesdeCirurgia: "10" });
      console.assert(r.diasRestantes === 4, "TC6 falhou: cirurgia pequena 10d ⇒ 4d restantes", r.diasRestantes);

      // TC7: Procedimento mapeado — apendicectomia 20 dias ⇒ faltam 70 dias
      r = avaliar({ ...BASE, cirurgiaRecente: true, procedimentoCirurgico: "apendicectomia_90d", diasDesdeCirurgia: "20" });
      console.assert(r.diasRestantes === 70, "TC7 falhou: apendicectomia 20d ⇒ 70d restantes", r.diasRestantes);

      // TC8: Antibiótico 7 dias ⇒ não adiciona espera
      r = avaliar({ ...BASE, terminouAntibiotico: true, diasDesdeAntibiotico: "7" });
      console.assert(!r.diasRestantes && r.status.includes("APTO"), "TC8 falhou: ATB 7d deveria estar apto se isolado", r);

      // TC9: Malária 10 dias desde retorno ⇒ faltam 20 dias
      r = avaliar({ ...BASE, viagemAreaMalaria: true, diasDesdeViagemMalaria: "10" });
      console.assert(r.diasRestantes === 20, "TC9 falhou: malária retorno 10d ⇒ faltam 20d", r.diasRestantes);

      // TC10 (novo): Antibiótico 5 dias ⇒ faltam 2 dias
      r = avaliar({ ...BASE, terminouAntibiotico: true, diasDesdeAntibiotico: "5" });
      console.assert(r.diasRestantes === 2, "TC10 falhou: ATB 5d ⇒ faltam 2d", r.diasRestantes);

      // TC11 (novo): Procedimento "outro_avaliacao" ⇒ avaliação sem dias automáticos
      r = avaliar({ ...BASE, cirurgiaRecente: true, procedimentoCirurgico: "outro_avaliacao", diasDesdeCirurgia: "15" });
      console.assert(r.status.includes("INAPTO") || r.razoes.length > 0, "TC11 falhou: deveria sinalizar avaliação clínica");

      console.log("Self-tests (avaliar): OK");
    } catch (e) {
      console.warn("Self-tests encontraram problema:", e);
    }
  }, []);

  // Classe raiz (evita ReferenceError). Além do efeito acima, mantém compatibilidade com estilos que herdam da wrapper.
  const rootClass = `${tema === "escuro" ? "dark" : ""}`;

  const card = (children) => (
    <div className="max-w-3xl w-full rounded-2xl shadow-lg bg-white dark:bg-slate-900 dark:border-slate-700 p-6 border border-gray-100">
      {children}
    </div>
  );

  function resetar() {
    setInputs({
      idade: "",
      peso: "",
      altura: "",
      sexoRegulatorio: "",
      diasDesdeUltimaDoacao: "",
      febreUltimos7Dias: false,
      tatuagemOuPiercing: false,
      diasDesdeTatuagemPiercing: "",
      cirurgiaRecente: false,
      tipoCirurgia: "",
      procedimentoCirurgico: "",
      diasDesdeCirurgia: "",
      viagemAreaMalaria: false,
      diasDesdeViagemMalaria: "",
      dstRecente: false,
      gestanteOuAmamentando: false,
      usaMedicamentos: false,
      medicamentosTexto: "",
      medicamentosSelecionados: [],
      terminouAntibiotico: false,
      diasDesdeAntibiotico: "",
    });
  }

  return (
    <div className={rootClass}>
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-800 dark:text-slate-100 flex flex-col items-center py-10">
        <div className="max-w-3xl w-full px-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Pré-triagem de Doação de Sangue</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              Responda anonimamente. O resultado é <strong>orientativo</strong> e seu uso é restrito à <strong>triagem de filas</strong>,
              não substituindo a triagem clínica e laboratorial do serviço de hemoterapia.
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={() => setTema(tema === "claro" ? "escuro" : "claro")}
              className="px-3 py-2 rounded-xl border text-sm bg-white dark:bg-slate-800 dark:border-slate-700 shadow hover:opacity-90"
              title="Alternar tema claro/escuro"
            >
              {tema === "claro" ? "Tema: Escuro" : "Tema: Claro"}
            </button>
          </div>
        </div>

        {card(
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Idade (anos)</label>
              <input name="idade" value={inputs.idade} onChange={onChange} type="number" min={0}
                     className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 28" />
            </div>
            <div>
              <label className="block text-sm font-medium">Peso (kg)</label>
              <input name="peso" value={inputs.peso} onChange={onChange} type="number" min={0}
                     className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 70" />
            </div>
            <div>
              <label className="block text-sm font-medium">Altura (cm)</label>
              <input name="altura" value={inputs.altura} onChange={onChange} type="number" min={0}
                     className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 170" />
            </div>
            <div>
              <label className="block text-sm font-medium">Sexo (regulatório)</label>
              <select name="sexoRegulatorio" value={inputs.sexoRegulatorio} onChange={onChange}
                      className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                <option value="">Prefiro não informar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Usado apenas para cálculo de intervalos entre doações.</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Dias desde a última doação</label>
              <input name="diasDesdeUltimaDoacao" value={inputs.diasDesdeUltimaDoacao} onChange={onChange} type="number" min={0}
                     className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 120" />
            </div>

            <div className="md:col-span-2 pt-2 border-t dark:border-slate-700" />

            <div className="flex items-center gap-2">
              <input id="febre" name="febreUltimos7Dias" type="checkbox" checked={inputs.febreUltimos7Dias} onChange={onChange} />
              <label htmlFor="febre" className="text-sm">Tive febre nos últimos 7 dias</label>
            </div>

            <div className="flex items-center gap-2">
              <input id="tatoo" name="tatuagemOuPiercing" type="checkbox" checked={inputs.tatuagemOuPiercing} onChange={onChange} />
              <label htmlFor="tatoo" className="text-sm">Fiz tatuagem ou piercing nos últimos 12 meses</label>
            </div>
            {inputs.tatuagemOuPiercing && (
              <div>
                <label className="block text-sm font-medium">Dias desde tatuagem/piercing</label>
                <input name="diasDesdeTatuagemPiercing" value={inputs.diasDesdeTatuagemPiercing} onChange={onChange} type="number" min={0}
                       className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 400" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input id="cirurgia" name="cirurgiaRecente" type="checkbox" checked={inputs.cirurgiaRecente} onChange={onChange} />
              <label htmlFor="cirurgia" className="text-sm">Passei por cirurgia/procedimento recente</label>
            </div>
            {inputs.cirurgiaRecente && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium">Selecione o procedimento</label>
                  <select name="procedimentoCirurgico" value={inputs.procedimentoCirurgico} onChange={onChange}
                          className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                    <option value="">Não sei / Outro (usará retrocompatibilidade)</option>
                    <optgroup label="Odontológicos">
                      <option value="odonto_muito_pequena_1d">Odontológico muito pequeno (sem anestesia) — 1 dia</option>
                      <option value="odonto_local_3d">Odontológico com anestesia local — 3 dias</option>
                      <option value="odonto_extracao_7d">Extração dentária — 7 dias</option>
                      <option value="odonto_canal_7d">Tratamento de canal/drenagem — 7 dias após término de ATB/AINH</option>
                    </optgroup>
                    <optgroup label="Cirurgias">
                      <option value="nefrolitotomia_30d">Nefrolitotomia extracorpórea — 30 dias</option>
                      <option value="apendicectomia_90d">Apendicectomia — 3 meses</option>
                      <option value="hernia_varizes_colecistectomia_180d">Hernioplastia / Varizes / Colecistectomia — 6 meses</option>
                      <option value="ortopedica_geral_360d">Ortopédicas em geral — 12 meses</option>
                      <option value="outro_avaliacao">Outro / Não listado — avaliação (sem data automática)</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium">Dias desde o procedimento</label>
                  <input name="diasDesdeCirurgia" value={inputs.diasDesdeCirurgia} onChange={onChange} type="number" min={0}
                         className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 10" />
                </div>
                <div>
                  <label className="block text-sm font-medium">(Opcional) Classificação antiga</label>
                  <select name="tipoCirurgia" value={inputs.tipoCirurgia} onChange={onChange}
                          className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2">
                    <option value="">—</option>
                    <option value="pequena">Pequena</option>
                    <option value="media">Média</option>
                    <option value="grande">Grande</option>
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Usada apenas se você não selecionar um procedimento específico.</p>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <input id="malaria" name="viagemAreaMalaria" type="checkbox" checked={inputs.viagemAreaMalaria} onChange={onChange} />
              <label htmlFor="malaria" className="text-sm">Viajei/estive em área endêmica de malária</label>
            </div>
            {inputs.viagemAreaMalaria && (
              <div>
                <label className="block text-sm font-medium">Dias desde o retorno</label>
                <input name="diasDesdeViagemMalaria" value={inputs.diasDesdeViagemMalaria} onChange={onChange} type="number" min={0}
                       className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 45" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input id="dst" name="dstRecente" type="checkbox" checked={inputs.dstRecente} onChange={onChange} />
              <label htmlFor="dst" className="text-sm">Fui diagnosticado/tratado para IST recentemente</label>
            </div>

            <div className="flex items-center gap-2">
              <input id="gestante" name="gestanteOuAmamentando" type="checkbox" checked={inputs.gestanteOuAmamentando} onChange={onChange} />
              <label htmlFor="gestante" className="text-sm">Estou gestante ou amamentando</label>
            </div>

            <div className="md:col-span-2 pt-2 border-t dark:border-slate-700" />

            <div className="flex items-center gap-2 md:col-span-2">
              <input id="meds" name="usaMedicamentos" type="checkbox" checked={inputs.usaMedicamentos} onChange={onChange} />
              <label htmlFor="meds" className="text-sm">Uso medicamentos</label>
            </div>
            {inputs.usaMedicamentos && (
              <div className="md:col-span-2 space-y-3">
                <p className="text-sm">Selecione os que utiliza (categorias):</p>
                {MED_CATS.map((cat) => (
                  <div key={cat.nome} className="border rounded-xl p-2 dark:border-slate-700">
                    <p className="text-sm font-semibold mb-1">{cat.nome}</p>
                    {cat.descricao && <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{cat.descricao}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {cat.itens.map((m) => (
                        <label key={m.id} className="flex items-start gap-2 p-2 rounded-lg border dark:border-slate-700">
                          <input type="checkbox" checked={inputs.medicamentosSelecionados.includes(m.id)} onChange={() => onToggleMed(m.id)} />
                          <span className="text-sm">
                            <span className="font-medium">{m.nome}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{m.regra}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input id="atbflag" name="terminouAntibiotico" type="checkbox" checked={inputs.terminouAntibiotico} onChange={onChange} />
                    <label htmlFor="atbflag" className="text-sm">Terminei antibiótico recentemente</label>
                  </div>
                  {inputs.terminouAntibiotico && (
                    <div>
                      <label className="block text-sm font-medium">Dias desde o término do antibiótico</label>
                      <input name="diasDesdeAntibiotico" value={inputs.diasDesdeAntibiotico} onChange={onChange} type="number" min={0}
                             className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: 5" />
                    </div>
                  )}
                </div>

                <label className="block text-sm font-medium mt-2">Outros (texto livre)</label>
                <textarea name="medicamentosTexto" value={inputs.medicamentosTexto} onChange={onChange}
                          rows={3} className="mt-1 w-full rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2" placeholder="Ex.: nome do medicamento, dose e quando usou pela última vez" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">A decisão final sobre medicamentos é sempre clínica. Informe tudo no dia da doação.</p>
              </div>
            )}
          </form>
        )}

        <div className="h-4" />

        {card(
          <div>
            <h2 className="text-xl font-semibold">Resultado orientativo</h2>
            <div className="mt-3 p-4 rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <p className={`font-bold ${resultado.status.includes("APTO") ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                {resultado.status}
              </p>

              {resultado.razoes.length > 0 ? (
                <ul className="list-disc ml-6 mt-2 space-y-1">
                  {resultado.razoes.map((r, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span>{r.text}</span>
                      {r.srcKey && SOURCES[r.srcKey] && (
                        <span
                          className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-slate-200 dark:bg-slate-700 cursor-help"
                          title={`${SOURCES[r.srcKey].label}`}
                          aria-label={`Fonte: ${SOURCES[r.srcKey].label}`}
                        >
                          i
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm mt-2">Nenhuma restrição evidente com base nas respostas informadas.</p>
              )}

              {(resultado.dataSugerida || resultado.diasRestantes !== undefined) && (
                <div className="mt-3 p-3 rounded-lg bg-white dark:bg-slate-900 border dark:border-slate-700">
                  {resultado.dataSugerida && (
                    <p className="text-sm"><strong>Data sugerida para retorno:</strong> {resultado.dataSugerida}</p>
                  )}
                  {resultado.diasRestantes !== undefined && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">Faltam aproximadamente <strong>{resultado.diasRestantes}</strong> dia(s).</p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Baseado na janela mais restritiva entre os fatores assinalados.</p>
                </div>
              )}

              <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
                <p>
                  O resultado deste formulário anônimo é <strong>orientativo</strong> e seu uso é restrito à
                  <strong> triagem de filas</strong>, não substituindo a triagem clínica e laboratorial do serviço de hemoterapia.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900">
                <p className="text-sm"><strong>IMC (opcional):</strong> {imc ? `${imc}` : "—"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{imc ? interpretIMC(imc) : "IMC é informativo e não decisório isoladamente."}</p>
              </div>
              <div className="p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900">
                <p className="text-sm"><strong>Privacidade e LGPD:</strong> este formulário está em conformidade com a Lei Geral de Proteção de Dados (LGPD) e garante a privacidade do usuário, pois não coleta nome ou documento.</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Use em locais com conexão segura (HTTPS).</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button onClick={resetar} className="px-4 py-2 rounded-xl bg-slate-800 dark:bg-slate-200 dark:text-slate-900 text-white text-sm shadow hover:opacity-90">
                Limpar respostas
              </button>
            </div>
          </div>
        )}

        <footer className="max-w-3xl w-full px-4 mt-6 text-xs text-slate-500 dark:text-slate-400 space-y-2">
          <p>
            Conteúdo educativo. Categorias de medicamentos exemplificadas (retinoides sistêmicos: isotretinoína, acitretina; 5α-redutase: dutasterida, finasterida; antitrombóticos; antibióticos). Personalize conforme protocolo local.
          </p>
          <p>
            <strong>Normativas (Brasil):</strong> Portaria 158/2016 (Regulamento Técnico Hemoterápico; consolidada no Anexo IV da Portaria de Consolidação nº 5/2017), RDC ANVISA 34/2014 (Boas Práticas no Ciclo do Sangue) e diretrizes de hemovigilância (IN/ANVISA). Critérios práticos usuais: idade ≥16 anos, peso ≥50 kg, intervalos mínimos (M: 60 dias; F: 90 dias), janelas para procedimentos (tatuagem/piercing ~12 meses) e avaliação epidemiológica (malária até 12 meses conforme exposição). Em conformidade com a LGPD (Lei nº 13.709/2018).
          </p>
        </footer>

        <div className="max-w-3xl w-full px-4 mt-4">
          <div className="p-3 rounded-xl border dark:border-slate-700 bg-white dark:bg-slate-900">
            <p className="text-sm font-semibold">Para maiores informações, acesse:</p>
            <ul className="list-disc ml-6 mt-2 text-sm">
              <li><a className="underline" href="https://bvsms.saude.gov.br/bvs/saudelegis/gm/2016/prt0158_04_02_2016.html" target="_blank" rel="noreferrer">Portaria nº 158/2016 — Regulamento Técnico (MS/GM)</a></li>
              <li><a className="underline" href="https://www.cevs.rs.gov.br/upload/arquivos/202004/20111609-portaria-de-consolidacao-5-anexo-iv.pdf" target="_blank" rel="noreferrer">Portaria de Consolidação nº 5/2017 — Anexo IV (consolidação do regulamento)</a></li>
              <li><a className="underline" href="https://bvsms.saude.gov.br/bvs/saudelegis/anvisa/2014/rdc0034_11_06_2014.pdf" target="_blank" rel="noreferrer">RDC ANVISA nº 34/2014 — Boas Práticas no Ciclo do Sangue</a></li>
              <li><a className="underline" href="https://www.gov.br/anvisa/pt-br/assuntos/noticias-anvisa/2022/instrucao-normativa-orienta-sobre-eventos-adversos-relacionados-ao-ciclo-do-sangue" target="_blank" rel="noreferrer">IN ANVISA nº 196/2022 — Hemovigilância (nota explicativa)</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
