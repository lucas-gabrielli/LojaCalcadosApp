import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FILTRO_TODOS,
  filtrarPorStatus,
  contarPorStatus,
  alternarStatus,
} from '../dominio/relatorio.js';

const SOLICITACOES = [
  { id: '1', status: 'vendida' },
  { id: '2', status: 'pendente' },
  { id: '3', status: 'vendida' },
  { id: '4', status: 'cancelada' },
];

// --- filtrarPorStatus -------------------------------------------------------

test('filtra pelo status escolhido', () => {
  assert.deepEqual(filtrarPorStatus(SOLICITACOES, 'vendida').map((s) => s.id), ['1', '3']);
});

test('"todos" devolve a lista inteira', () => {
  assert.equal(filtrarPorStatus(SOLICITACOES, FILTRO_TODOS).length, 4);
  assert.equal(filtrarPorStatus(SOLICITACOES, null).length, 4);
});

test('lida com entrada vazia ou indefinida', () => {
  assert.deepEqual(filtrarPorStatus([], 'vendida'), []);
  assert.deepEqual(filtrarPorStatus(undefined, 'vendida'), []);
});

// --- contarPorStatus --------------------------------------------------------

test('o placar conta cada status e o total', () => {
  assert.deepEqual(contarPorStatus(SOLICITACOES), {
    vendida: 2,
    pendente: 1,
    cancelada: 1,
    total: 4,
  });
});

test('o placar do período não muda quando a lista já está filtrada por status', () => {
  // É por isso que a contagem é feita sobre o período inteiro: sobre a lista
  // filtrada, "Pendentes" marcaria zero assim que "Vendidas" fosse tocado.
  const soVendidas = filtrarPorStatus(SOLICITACOES, 'vendida');
  assert.equal(contarPorStatus(soVendidas).pendente, 0);
  assert.equal(contarPorStatus(SOLICITACOES).pendente, 1);
});

test('status desconhecido não entra na contagem, mas soma no total', () => {
  const contagem = contarPorStatus([{ id: 'x', status: 'em_separacao' }]);
  assert.equal(contagem.total, 1);
  assert.equal(contagem.vendida, 0);
});

// --- alternarStatus ---------------------------------------------------------

test('tocar num status inativo liga o filtro dele', () => {
  assert.equal(alternarStatus(FILTRO_TODOS, 'vendida'), 'vendida');
  assert.equal(alternarStatus('pendente', 'vendida'), 'vendida');
});

test('tocar no status já ativo desliga o filtro', () => {
  assert.equal(alternarStatus('vendida', 'vendida'), FILTRO_TODOS);
});
