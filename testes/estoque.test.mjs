import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LIMITE_ESTOQUE_BAIXO, classificarEstoque, variacoesComEstoqueBaixo } from '../dominio/estoque.js';

// --- classificarEstoque -----------------------------------------------------

test('estoque zerado quando a quantidade é 0', () => {
  assert.equal(classificarEstoque(0), 'zerado');
});

test('estoque zerado também para valores inválidos ou negativos', () => {
  assert.equal(classificarEstoque(-1), 'zerado');
  assert.equal(classificarEstoque(undefined), 'zerado');
  assert.equal(classificarEstoque(null), 'zerado');
});

test('estoque baixo no limite (inclusive)', () => {
  assert.equal(classificarEstoque(LIMITE_ESTOQUE_BAIXO), 'baixo');
  assert.equal(classificarEstoque(1), 'baixo');
});

test('estoque normal logo acima do limite', () => {
  assert.equal(classificarEstoque(LIMITE_ESTOQUE_BAIXO + 1), 'normal');
});

test('aceita um limite customizado', () => {
  assert.equal(classificarEstoque(5, 10), 'baixo');
  assert.equal(classificarEstoque(11, 10), 'normal');
});

// --- variacoesComEstoqueBaixo -----------------------------------------------

test('filtra só as variações zeradas ou baixas, mantendo a ordem', () => {
  const variacoes = [
    { id: 'a', estoque: 10 },
    { id: 'b', estoque: 2 },
    { id: 'c', estoque: 0 },
    { id: 'd', estoque: LIMITE_ESTOQUE_BAIXO },
  ];
  const resultado = variacoesComEstoqueBaixo(variacoes);
  assert.deepEqual(resultado.map((v) => v.id), ['b', 'c', 'd']);
});

test('lista vazia quando tudo está com estoque normal', () => {
  assert.deepEqual(variacoesComEstoqueBaixo([{ id: 'a', estoque: 50 }]), []);
});

test('lida com entrada vazia ou indefinida', () => {
  assert.deepEqual(variacoesComEstoqueBaixo([]), []);
  assert.deepEqual(variacoesComEstoqueBaixo(undefined), []);
});
