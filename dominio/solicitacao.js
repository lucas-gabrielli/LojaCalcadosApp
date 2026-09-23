/**
 * Domínio da solicitação — ADR-001.
 *
 * Regra de negócio do ciclo de vida de uma solicitação de calçado.
 * Este arquivo NÃO importa nada: sem React, sem Firebase, sem I/O, sem relógio.
 *
 * As funções de planejamento não gravam nada. Elas DECIDEM e devolvem um
 * "plano de escritas" — uma lista de { colecao, id, campos } que quem chamou
 * entrega para dados/solicitacoesRepo.js aplicar. É isso que torna a regra
 * chamável por `node --test`, sem servidor, sem banco e sem interface.
 */

export const STATUS = {
  PENDENTE: 'pendente',
  VENDIDA: 'vendida',
  CANCELADA: 'cancelada',
};

/**
 * A máquina de estados, num lugar só.
 * Os estados do Módulo Runner (em separação, a caminho, entregue) entram aqui
 * — e só aqui. Era essa edição que antes custava 5 arquivos e 1.180 linhas.
 */
export const TRANSICOES = {
  [STATUS.PENDENTE]: [STATUS.VENDIDA, STATUS.CANCELADA],
  [STATUS.VENDIDA]: [],
  [STATUS.CANCELADA]: [],
};

export function podeTransicionar(de, para) {
  const permitidos = TRANSICOES[de];
  return Array.isArray(permitidos) && permitidos.includes(para);
}

function recusa(motivo, mensagem) {
  return { ok: false, motivo, mensagem };
}

/**
 * Planeja a confirmação de uma venda.
 *
 * @param {object} solicitacao  { id, status, quantidade, variacao_id }
 * @param {object|null} variacao  { estoque } — passe null para reproduzir o
 *        comportamento antigo, que não revalidava o estoque no momento da venda.
 * @param {Date} agora  injetado para o teste poder fixar a data.
 * @returns {{ok: true, escritas: Array}|{ok: false, motivo: string, mensagem: string}}
 */
export function planejarVenda(solicitacao, variacao = null, agora = new Date()) {
  if (!solicitacao || !solicitacao.id) {
    return recusa('SOLICITACAO_INVALIDA', 'Solicitação sem identificador.');
  }
  if (!solicitacao.variacao_id) {
    return recusa('VARIACAO_INVALIDA', 'Solicitação sem variação associada.');
  }
  if (!podeTransicionar(solicitacao.status, STATUS.VENDIDA)) {
    return recusa(
      'TRANSICAO_INVALIDA',
      `Uma solicitação "${solicitacao.status}" não pode ser vendida.`
    );
  }

  const quantidade = Number(solicitacao.quantidade);
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    return recusa('QUANTIDADE_INVALIDA', 'Quantidade da solicitação inválida.');
  }
  if (variacao && Number(variacao.estoque) < quantidade) {
    return recusa(
      'SEM_ESTOQUE',
      'O estoque físico não cobre esta venda. Confira a prateleira antes de confirmar.'
    );
  }

  return {
    ok: true,
    escritas: [
      {
        colecao: 'solicitacoes',
        id: solicitacao.id,
        campos: { status: STATUS.VENDIDA, dataVenda: agora },
      },
      {
        colecao: 'variacoes',
        id: solicitacao.variacao_id,
        campos: { estoque: { operacao: 'incrementar', valor: -quantidade } },
      },
    ],
  };
}

/** Planeja a devolução (cancelamento) de uma solicitação. */
export function planejarCancelamento(solicitacao) {
  if (!solicitacao || !solicitacao.id) {
    return recusa('SOLICITACAO_INVALIDA', 'Solicitação sem identificador.');
  }
  if (!podeTransicionar(solicitacao.status, STATUS.CANCELADA)) {
    return recusa(
      'TRANSICAO_INVALIDA',
      `Uma solicitação "${solicitacao.status}" não pode ser devolvida.`
    );
  }
  return {
    ok: true,
    escritas: [
      {
        colecao: 'solicitacoes',
        id: solicitacao.id,
        campos: { status: STATUS.CANCELADA },
      },
    ],
  };
}

/**
 * Lead time de atendimento, em minutos: da solicitação até a venda.
 * Este é o indicador que o artigo mede. Recebe Date — a conversão do formato
 * do banco é responsabilidade do repositório, não do domínio.
 * Devolve null quando o ciclo não fechou ou as datas estão invertidas.
 */
export function calcularLeadTimeMinutos(solicitacao) {
  const inicio = solicitacao && solicitacao.dataSolicitacao;
  const fim = solicitacao && solicitacao.dataVenda;
  if (!(inicio instanceof Date) || !(fim instanceof Date)) return null;
  const minutos = (fim.getTime() - inicio.getTime()) / 60000;
  return minutos >= 0 ? minutos : null;
}

/** Média do lead time, ignorando os ciclos que não fecharam. */
export function mediaLeadTimeMinutos(solicitacoes) {
  const valores = (solicitacoes || [])
    .map(calcularLeadTimeMinutos)
    .filter((m) => m !== null);
  if (valores.length === 0) return null;
  return valores.reduce((soma, m) => soma + m, 0) / valores.length;
}

/**
 * Escalonamento de solicitações pendentes — quanto tempo é aceitável esperar
 * antes que a espera vire um problema visível pro vendedor.
 */
export const LIMITE_ATENCAO_MINUTOS = 10;
export const LIMITE_CRITICO_MINUTOS = 20;

/** Minutos decorridos desde uma data. `agora` é injetável para teste. */
export function calcularMinutosDesde(dataInicio, agora = new Date()) {
  if (!(dataInicio instanceof Date)) return null;
  return (agora.getTime() - dataInicio.getTime()) / 60000;
}

/**
 * Classifica a urgência de uma solicitação pendente a partir dos minutos
 * já decorridos desde a abertura.
 * @returns {'normal'|'atencao'|'critico'}
 */
export function classificarUrgencia(minutosDecorridos) {
  if (minutosDecorridos == null) return 'normal';
  if (minutosDecorridos >= LIMITE_CRITICO_MINUTOS) return 'critico';
  if (minutosDecorridos >= LIMITE_ATENCAO_MINUTOS) return 'atencao';
  return 'normal';
}
