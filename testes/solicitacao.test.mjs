/**
 * Testes que eram IMPOSSÍVEIS de escrever antes do ADR-001.
 *
 * Antes, chegar até a regra de venda exigia abrir 6 arquivos e 1.841 linhas,
 * renderizar a tela dentro de um ThemeProvider e de um NavigationContainer,
 * e ter uma instância real do Firestore. Nenhum destes casos era alcançável.
 *
 * Rodar:  npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  STATUS,
  podeTransicionar,
  planejarVenda,
  planejarCancelamento,
  calcularLeadTimeMinutos,
  mediaLeadTimeMinutos,
  LIMITE_ATENCAO_MINUTOS,
  LIMITE_CRITICO_MINUTOS,
  calcularMinutosDesde,
  classificarUrgencia,
} from '../dominio/solicitacao.js';

const AGORA = new Date('2026-09-17T14:00:00.000Z');

function solicitacao(extras = {}) {
  return {
    id: 'sol-1',
    variacao_id: 'var-9',
    quantidade: 1,
    status: STATUS.PENDENTE,
    ...extras,
  };
}

// --- máquina de estados ----------------------------------------------------

test('só se sai de pendente', () => {
  assert.equal(podeTransicionar(STATUS.PENDENTE, STATUS.VENDIDA), true);
  assert.equal(podeTransicionar(STATUS.PENDENTE, STATUS.CANCELADA), true);
  assert.equal(podeTransicionar(STATUS.VENDIDA, STATUS.CANCELADA), false);
  assert.equal(podeTransicionar(STATUS.CANCELADA, STATUS.VENDIDA), false);
  assert.equal(podeTransicionar('inventado', STATUS.VENDIDA), false);
});

// --- venda -----------------------------------------------------------------

test('não vende uma solicitação que já foi vendida', () => {
  const plano = planejarVenda(solicitacao({ status: STATUS.VENDIDA }), null, AGORA);
  assert.equal(plano.ok, false);
  assert.equal(plano.motivo, 'TRANSICAO_INVALIDA');
});

test('não vende uma solicitação devolvida', () => {
  const plano = planejarVenda(solicitacao({ status: STATUS.CANCELADA }), null, AGORA);
  assert.equal(plano.ok, false);
  assert.equal(plano.motivo, 'TRANSICAO_INVALIDA');
});

test('recusa a venda quando o estoque físico não cobre a quantidade', () => {
  const plano = planejarVenda(solicitacao({ quantidade: 2 }), { estoque: 1 }, AGORA);
  assert.equal(plano.ok, false);
  assert.equal(plano.motivo, 'SEM_ESTOQUE');
});

test('vende quando o estoque cobre exatamente a quantidade', () => {
  const plano = planejarVenda(solicitacao({ quantidade: 2 }), { estoque: 2 }, AGORA);
  assert.equal(plano.ok, true);
  assert.deepEqual(plano.escritas[1].campos.estoque, {
    operacao: 'incrementar',
    valor: -2,
  });
});

test('recusa solicitação sem variação associada', () => {
  const plano = planejarVenda(solicitacao({ variacao_id: null }), null, AGORA);
  assert.equal(plano.ok, false);
  assert.equal(plano.motivo, 'VARIACAO_INVALIDA');
});

// --- devolução -------------------------------------------------------------

test('devolve uma pendente e não toca no estoque', () => {
  const plano = planejarCancelamento(solicitacao());
  assert.equal(plano.ok, true);
  assert.equal(plano.escritas.length, 1);
  assert.equal(plano.escritas[0].colecao, 'solicitacoes');
  assert.deepEqual(plano.escritas[0].campos, { status: STATUS.CANCELADA });
});

test('não devolve uma solicitação já vendida', () => {
  const plano = planejarCancelamento(solicitacao({ status: STATUS.VENDIDA }));
  assert.equal(plano.ok, false);
});

// --- lead time: o indicador do artigo --------------------------------------

test('lead time em minutos, entre solicitação e venda', () => {
  const minutos = calcularLeadTimeMinutos({
    dataSolicitacao: new Date('2026-09-17T14:00:00Z'),
    dataVenda: new Date('2026-09-17T14:07:30Z'),
  });
  assert.equal(minutos, 7.5);
});

test('lead time é nulo quando o ciclo não fechou', () => {
  assert.equal(
    calcularLeadTimeMinutos({ dataSolicitacao: AGORA, dataVenda: null }),
    null
  );
});

test('média de lead time ignora os ciclos incompletos', () => {
  const media = mediaLeadTimeMinutos([
    { dataSolicitacao: new Date('2026-09-17T14:00:00Z'), dataVenda: new Date('2026-09-17T14:10:00Z') },
    { dataSolicitacao: new Date('2026-09-17T15:00:00Z'), dataVenda: new Date('2026-09-17T15:20:00Z') },
    { dataSolicitacao: new Date('2026-09-17T16:00:00Z'), dataVenda: null },
  ]);
  assert.equal(media, 15);
});

test('média é nula quando nenhuma venda fechou', () => {
  assert.equal(mediaLeadTimeMinutos([{ dataSolicitacao: AGORA, dataVenda: null }]), null);
  assert.equal(mediaLeadTimeMinutos([]), null);
});

// --- escalonamento de urgência ----------------------------------------------

test('minutos decorridos desde uma data, com "agora" injetado', () => {
  const inicio = new Date('2026-09-17T14:00:00.000Z');
  const agora = new Date('2026-09-17T14:07:30.000Z');
  assert.equal(calcularMinutosDesde(inicio, agora), 7.5);
});

test('minutos decorridos é nulo quando a data de início é inválida', () => {
  assert.equal(calcularMinutosDesde(null, AGORA), null);
  assert.equal(calcularMinutosDesde(undefined, AGORA), null);
});

test('urgência normal antes do limite de atenção', () => {
  assert.equal(classificarUrgencia(0), 'normal');
  assert.equal(classificarUrgencia(LIMITE_ATENCAO_MINUTOS - 1), 'normal');
});

test('urgência de atenção no limite (inclusive) até antes do crítico', () => {
  assert.equal(classificarUrgencia(LIMITE_ATENCAO_MINUTOS), 'atencao');
  assert.equal(classificarUrgencia(LIMITE_CRITICO_MINUTOS - 1), 'atencao');
});

test('urgência crítica no limite (inclusive) em diante', () => {
  assert.equal(classificarUrgencia(LIMITE_CRITICO_MINUTOS), 'critico');
  assert.equal(classificarUrgencia(LIMITE_CRITICO_MINUTOS + 100), 'critico');
});

test('urgência normal quando os minutos são nulos (sem data válida)', () => {
  assert.equal(classificarUrgencia(null), 'normal');
});
