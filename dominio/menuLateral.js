/**
 * Estado do menu lateral — segue o padrão do ADR-001: puro, sem React,
 * sem navegação, sem I/O. Só decide.
 *
 * A regra que vive aqui é a que mais quebrou na prática: quem entra numa tela
 * PELO MENU deve encontrar o menu aberto ao voltar; quem abre o menu pelo
 * avatar, ou sai da conta, não.
 */

export const ESTADO_INICIAL = { aberto: false, reabrirAoVoltar: false };

/** Toque no avatar: abre e não agenda reabertura. */
export function abrirPeloAvatar(estado) {
  return { ...estado, aberto: true };
}

/** Fechar por toque fora, botão X ou voltar do Android. */
export function fechar(estado) {
  return { ...estado, aberto: false };
}

/** Escolha de um item do menu: fecha agora e agenda a reabertura. */
export function escolherItem(estado) {
  return { aberto: false, reabrirAoVoltar: true };
}

/** A tela inicial ganhou foco de novo. */
export function aoFocarInicio(estado) {
  if (!estado.reabrirAoVoltar) return estado;
  return { aberto: true, reabrirAoVoltar: false };
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
