/**
 * Domínio de estoque — segue o mesmo padrão do ADR-001 (dominio/solicitacao.js):
 * sem React, sem Firebase, sem I/O. Só decide.
 */

export const LIMITE_ESTOQUE_BAIXO = 3;

/**
 * Classifica uma quantidade em estoque.
 * @param {number} quantidade
 * @param {number} limite  a partir de quantos pares já é "baixo" (inclusive)
 * @returns {'zerado'|'baixo'|'normal'}
 */
export function classificarEstoque(quantidade, limite = LIMITE_ESTOQUE_BAIXO) {
  const valor = Number(quantidade);
  if (!Number.isFinite(valor) || valor <= 0) return 'zerado';
  if (valor <= limite) return 'baixo';
  return 'normal';
}

/** Filtra as variações que merecem atenção (zeradas ou com estoque baixo). */
export function variacoesComEstoqueBaixo(variacoes, limite = LIMITE_ESTOQUE_BAIXO) {
  return (variacoes || []).filter((v) => classificarEstoque(v.estoque, limite) !== 'normal');
}
