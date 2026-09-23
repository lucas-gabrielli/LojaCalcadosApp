/**
 * Estado do menu lateral — segue o padrão do ADR-001: puro, sem React,
 * sem navegação, sem I/O. Só decide.
 *
 * Duas regras vivem aqui, as que mais quebraram na prática:
 *
 * 1. Quem entra numa tela PELO MENU deve encontrar o menu aberto ao voltar;
 *    quem abre o menu pelo avatar, ou sai da conta, não.
 * 2. Essa ida-e-volta é uma só: entrar por um item e voltar não pode parecer
 *    "fechou e abriu de novo". Por isso o par escolherItem/aoFocarInicio marca
 *    `instantaneo`, e a UI pula a animação nas duas pontas. O menu some junto
 *    com a tela e reaparece já montado — parece que nunca saiu.
 */

export const ESTADO_INICIAL = { aberto: false, reabrirAoVoltar: false, instantaneo: false };

/** Toque no avatar: abre com animação e não agenda reabertura. */
export function abrirPeloAvatar(estado) {
  return { aberto: true, reabrirAoVoltar: false, instantaneo: false };
}

/** Fechar por toque fora, botão X ou voltar do Android — sempre animado. */
export function fechar(estado) {
  return { ...estado, aberto: false, instantaneo: false };
}

/** Escolha de um item do menu: some na hora e agenda a reabertura. */
export function escolherItem(estado) {
  return { aberto: false, reabrirAoVoltar: true, instantaneo: true };
}

/** A tela inicial ganhou foco de novo. */
export function aoFocarInicio(estado) {
  if (!estado.reabrirAoVoltar) return estado;
  return { aberto: true, reabrirAoVoltar: false, instantaneo: true };
}

/** Sair da conta: nunca deve reabrir o menu depois. */
export function sairDaConta(estado) {
  return ESTADO_INICIAL;
}

const ACOES = {
  abrirPeloAvatar,
  fechar,
  escolherItem,
  aoFocarInicio,
  sairDaConta,
};

/** Redutor para o useReducer da camada de UI. */
export function reduzir(estado, acao) {
  const fn = ACOES[acao];
  return fn ? fn(estado) : estado;
}
