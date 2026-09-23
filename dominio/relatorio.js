/**
 * Domínio do relatório — mesmo padrão do ADR-001: sem React, sem Firebase.
 *
 * O status deixou de ser filtrado na consulta e passou a ser filtrado aqui.
 * O motivo é o placar do topo: se o banco já devolvesse só as vendidas,
 * "Pendentes" e "Canceladas" marcariam zero no instante em que o usuário
 * tocasse em "Vendidas" — e o placar viraria mentira. Buscando o período
 * inteiro e filtrando em memória, os três números continuam verdadeiros
 * enquanto a lista abaixo mostra só o status escolhido.
 */

import { STATUS } from './solicitacao.js';

export const FILTRO_TODOS = 'todos';

export function filtrarPorStatus(solicitacoes, status) {
  const lista = solicitacoes || [];
  if (!status || status === FILTRO_TODOS) return lista;
  return lista.filter((s) => s.status === status);
}

/** Placar do topo: sempre sobre o período inteiro, nunca sobre o já filtrado. */
export function contarPorStatus(solicitacoes) {
  const contagem = {
    [STATUS.VENDIDA]: 0,
    [STATUS.PENDENTE]: 0,
    [STATUS.CANCELADA]: 0,
    total: 0,
  };
  (solicitacoes || []).forEach((s) => {
    contagem.total += 1;
    if (contagem[s.status] !== undefined) contagem[s.status] += 1;
  });
  return contagem;
}

/**
 * Tocar no cartão do status já ativo desliga o filtro — é como o usuário
 * volta a ver tudo sem precisar abrir o painel de filtros.
 */
export function alternarStatus(statusAtual, statusTocado) {
  return statusAtual === statusTocado ? FILTRO_TODOS : statusTocado;
}
