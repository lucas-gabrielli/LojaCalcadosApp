/**
 * Domínio das variações (cor × numeração) — mesmo padrão do ADR-001:
 * sem React, sem Firebase, sem I/O. Só organiza e decide.
 *
 * A tela de detalhe deixou de listar uma linha por variação e passou a ter
 * dois seletores (Cor e Tamanho), como no Shopee. Quem sabe qual variação é a
 * escolhida, quanto dela existe e o que fazer quando a cor muda é este arquivo
 * — a tela só desenha o resultado.
 */

export const COR_PADRAO = 'Única';

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
    // A primeira variação da cor que tiver foto é quem representa a cor.
    if (!grupo.imagemUrl && variacao.imagemUrl) grupo.imagemUrl = variacao.imagemUrl;
    grupo.estoqueTotal += Number(variacao.estoque) || 0;
    grupo.tamanhos.push({ ...variacao, cor });
  });

  const grupos = Array.from(porCor.values());
  grupos.forEach((grupo) => grupo.tamanhos.sort((a, b) => compararTamanhos(a.tamanho, b.tamanho)));
  return grupos;
}

/** Tamanhos disponíveis (com ou sem estoque) de uma cor, já ordenados. */
export function tamanhosDaCor(variacoes, cor) {
  const alvo = normalizarCor(cor);
  const grupo = agruparPorCor(variacoes).find((g) => g.cor === alvo);
  return grupo ? grupo.tamanhos : [];
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
