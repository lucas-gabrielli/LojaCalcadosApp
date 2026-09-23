/**
 * Domínio das variações (cor × numeração) — mesmo padrão do ADR-001:
 * sem React, sem Firebase, sem I/O. Só organiza e decide.
 *
 * A tela de detalhe deixou de listar uma linha por variação e passou a ter
 * dois seletores (Cor e Tamanho), como no Shopee. Quem sabe qual variação é a
 * escolhida, quanto dela existe e o que fazer quando a cor muda é este arquivo
 * — a tela só desenha o resultado.
 */

import { classificarEstoque } from './estoque.js';
import { capaDaCor } from './galeria.js';

export const COR_PADRAO = 'Única';

// A grade que a loja trabalha. A tela mostra TODAS estas numerações mesmo que
// o modelo não tenha nenhum par delas: o vendedor precisa enxergar num piscar
// de olhos o que existe e o que não existe, sem ficar procurando um número que
// simplesmente não aparece na lista.
export const TAMANHO_MINIMO = 36;
export const TAMANHO_MAXIMO = 45;

/** Variação sem cor cadastrada não some da tela: vira "Única". */
export function normalizarCor(cor) {
  const texto = typeof cor === 'string' ? cor.trim() : '';
  return texto || COR_PADRAO;
}

/** 39 antes de 40, mas "P 36-38" ainda precisa ordenar de forma estável. */
function compararTamanhos(a, b) {
  const na = Number(a);
  const nb = Number(b);
  const aEhNumero = Number.isFinite(na);
  const bEhNumero = Number.isFinite(nb);
  if (aEhNumero && bEhNumero) return na - nb;
  if (aEhNumero) return -1;
  if (bEhNumero) return 1;
  return String(a).localeCompare(String(b));
}

/**
 * Agrupa as variações de um produto por cor, na ordem em que as cores
 * aparecem na lista.
 * @returns {Array<{cor: string, imagemUrl: string|null, estoqueTotal: number, tamanhos: Array}>}
 */
export function agruparPorCor(variacoes) {
  const porCor = new Map();

  (variacoes || []).forEach((variacao) => {
    const cor = normalizarCor(variacao.cor);
    if (!porCor.has(cor)) {
      porCor.set(cor, { cor, imagemUrl: null, estoqueTotal: 0, tamanhos: [] });
    }
    const grupo = porCor.get(cor);
    grupo.estoqueTotal += Number(variacao.estoque) || 0;
    grupo.tamanhos.push({ ...variacao, cor });
  });

  const grupos = Array.from(porCor.values());
  grupos.forEach((grupo) => {
    grupo.tamanhos.sort((a, b) => compararTamanhos(a.tamanho, b.tamanho));
    // A primeira foto que aparecer na cor representa a cor no chip — venha ela
    // do campo antigo `imagemUrl` ou da lista nova `imagens`.
    grupo.imagemUrl = capaDaCor(grupo.tamanhos);
  });
  return grupos;
}

/** Tamanhos disponíveis (com ou sem estoque) de uma cor, já ordenados. */
export function tamanhosDaCor(variacoes, cor) {
  const alvo = normalizarCor(cor);
  const grupo = agruparPorCor(variacoes).find((g) => g.cor === alvo);
  return grupo ? grupo.tamanhos : [];
}

/**
 * A grade fechada de numerações de uma cor: de 36 a 45 sempre, cadastradas ou
 * não, mais qualquer numeração fora dessa faixa que exista no estoque (35, 46,
 * "P 36-38") — essas entram no fim para não sumirem do catálogo.
 *
 * A situação de cada numeração é o que a tela pinta:
 *   'disponivel'   — tem par na prateleira (destaque verde)
 *   'baixo'        — tem par, mas está acabando (verde + aviso da quantidade)
 *   'esgotado'     — a numeração existe no modelo, mas zerou
 *   'indisponivel' — a loja não trabalha essa numeração neste modelo/cor
 *
 * @returns {Array<{chave: string, tamanho: any, variacao: object|null,
 *                  estoque: number, cadastrado: boolean, situacao: string}>}
 */
export function gradeDeTamanhos(variacoes, cor, opcoes = {}) {
  const { minimo = TAMANHO_MINIMO, maximo = TAMANHO_MAXIMO } = opcoes;

  const porTamanho = new Map();
  tamanhosDaCor(variacoes, cor).forEach((variacao) => {
    const chave = String(variacao.tamanho);
    const estoque = Number(variacao.estoque) || 0;
    const existente = porTamanho.get(chave);
    // Cadastro duplicado (duas variações da mesma cor e numeração) soma o
    // estoque em vez de esconder metade dele.
    if (existente) existente.estoque += estoque;
    else porTamanho.set(chave, { variacao, estoque });
  });

  const faixaFixa = [];
  for (let numero = minimo; numero <= maximo; numero += 1) faixaFixa.push(String(numero));

  const foraDaFaixa = Array.from(porTamanho.keys()).filter((chave) => !faixaFixa.includes(chave));
  foraDaFaixa.sort(compararTamanhos);

  return [...faixaFixa, ...foraDaFaixa].map((chave) => {
    const encontrado = porTamanho.get(chave) || null;
    const estoque = encontrado ? encontrado.estoque : 0;
    return {
      chave,
      tamanho: encontrado ? encontrado.variacao.tamanho : Number(chave),
      variacao: encontrado ? encontrado.variacao : null,
      estoque,
      cadastrado: Boolean(encontrado),
      situacao: situacaoDoTamanho(encontrado, estoque),
    };
  });
}

function situacaoDoTamanho(encontrado, estoque) {
  if (!encontrado) return 'indisponivel';
  const classe = classificarEstoque(estoque);
  if (classe === 'zerado') return 'esgotado';
  if (classe === 'baixo') return 'baixo';
  return 'disponivel';
}

/** Quantas numerações da grade têm par para vender agora. */
export function contarTamanhosDisponiveis(grade) {
  return (grade || []).filter((item) => item.situacao === 'disponivel' || item.situacao === 'baixo').length;
}

/** A variação exata de uma combinação cor + tamanho, ou null. */
export function encontrarVariacao(variacoes, cor, tamanho) {
  if (tamanho == null) return null;
  const alvoCor = normalizarCor(cor);
  const encontrada = (variacoes || []).find(
    (v) => normalizarCor(v.cor) === alvoCor && String(v.tamanho) === String(tamanho)
  );
  return encontrada || null;
}

/**
 * O que já vem selecionado ao abrir a tela: a cor e o tamanho da variação
 * escaneada, quando ela existe; senão, a primeira combinação com estoque.
 * Sem nada em estoque, cai na primeira combinação que existir — a tela ainda
 * precisa mostrar alguma coisa.
 */
export function escolhaInicial(variacoes, qrCodePreferido = null) {
  const grupos = agruparPorCor(variacoes);
  if (grupos.length === 0) return { cor: null, tamanho: null };

  const preferida = qrCodePreferido
    ? (variacoes || []).find((v) => v.qr_code === qrCodePreferido)
    : null;
  if (preferida) {
    return { cor: normalizarCor(preferida.cor), tamanho: preferida.tamanho };
  }

  for (const grupo of grupos) {
    const comEstoque = grupo.tamanhos.find((t) => (Number(t.estoque) || 0) > 0);
    if (comEstoque) return { cor: grupo.cor, tamanho: comEstoque.tamanho };
  }

  const primeiro = grupos[0];
  return { cor: primeiro.cor, tamanho: primeiro.tamanhos[0]?.tamanho ?? null };
}

/**
 * Ao trocar de cor, o tamanho escolhido pode não existir na cor nova.
 * Mantém o tamanho quando ele existe lá; senão escolhe o primeiro com estoque.
 */
export function tamanhoAoTrocarCor(variacoes, cor, tamanhoAtual) {
  const tamanhos = tamanhosDaCor(variacoes, cor);
  if (tamanhos.length === 0) return null;
  const mesmo = tamanhos.find((t) => String(t.tamanho) === String(tamanhoAtual));
  if (mesmo && (Number(mesmo.estoque) || 0) > 0) return mesmo.tamanho;
  const comEstoque = tamanhos.find((t) => (Number(t.estoque) || 0) > 0);
  if (comEstoque) return comEstoque.tamanho;
  return mesmo ? mesmo.tamanho : tamanhos[0].tamanho;
}

/** Prende a quantidade entre 1 e o estoque da variação escolhida. */
export function limitarQuantidade(quantidade, estoqueDisponivel) {
  const teto = Math.max(0, Number(estoqueDisponivel) || 0);
  if (teto === 0) return 0;
  const valor = Math.floor(Number(quantidade));
  if (!Number.isFinite(valor) || valor < 1) return 1;
  return Math.min(valor, teto);
}

/** Nome cheio gravado na sacola e nas solicitações. Um formato só, aqui. */
export function descreverItem(nome, cor, tamanho) {
  return `${nome} - Cor: ${normalizarCor(cor)} - Tam: ${tamanho}`;
}

/**
 * O caminho de volta de descreverItem: quebra o nome cheio em partes para a
 * Sacola e os Relatórios mostrarem produto, cor e tamanho separados.
 * Itens antigos, gravados antes dos campos soltos existirem, só têm o nome
 * cheio — por isso a leitura cai para o texto quando o campo falta.
 */
export function detalhesDoItem(item) {
  if (!item) return { nome: '', cor: COR_PADRAO, tamanho: null };

  const cheio = typeof item.nomeProduto === 'string' ? item.nomeProduto : '';
  const partes = cheio.match(/^(.*?)\s+-\s+Cor:\s+(.*?)\s+-\s+Tam:\s+(.*)$/);

  return {
    nome: item.nomeBase || (partes ? partes[1] : cheio),
    cor: normalizarCor(item.cor || (partes ? partes[2] : null)),
    tamanho: item.tamanho ?? (partes ? partes[3] : null),
  };
}
