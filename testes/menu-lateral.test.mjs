import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ESTADO_INICIAL,
  abrirPeloAvatar,
  fechar,
  escolherItem,
  aoFocarInicio,
  sairDaConta,
  reduzir,
} from '../dominio/menuLateral.js';

test('começa fechado e sem reabertura agendada', () => {
  assert.deepEqual(ESTADO_INICIAL, { aberto: false, reabrirAoVoltar: false });
});

test('avatar abre o menu sem agendar reabertura', () => {
  const estado = abrirPeloAvatar(ESTADO_INICIAL);
  assert.equal(estado.aberto, true);
  assert.equal(estado.reabrirAoVoltar, false);
});

test('abrir pelo avatar e voltar de uma tela NÃO reabre o menu', () => {
  // Quem abriu o menu e navegou por um atalho da grade não pediu reabertura.
  const aberto = abrirPeloAvatar(ESTADO_INICIAL);
  const fechado = fechar(aberto);
  assert.deepEqual(aoFocarInicio(fechado), fechado);
});

test('escolher um item fecha o menu e agenda a reabertura', () => {
  const estado = escolherItem(abrirPeloAvatar(ESTADO_INICIAL));
  assert.equal(estado.aberto, false);
  assert.equal(estado.reabrirAoVoltar, true);
});

test('ao voltar para o Início o menu reabre uma única vez', () => {
  const aposEscolha = escolherItem(abrirPeloAvatar(ESTADO_INICIAL));
  const aoVoltar = aoFocarInicio(aposEscolha);
  assert.equal(aoVoltar.aberto, true, 'deve reabrir ao voltar');
  assert.equal(aoVoltar.reabrirAoVoltar, false, 'a reabertura é consumida');

  // Fechar e focar de novo não pode reabrir sozinho — era o bug do menu
  // "aparecendo do nada" depois de já ter sido fechado.
  const depoisDeFechar = fechar(aoVoltar);
  assert.deepEqual(aoFocarInicio(depoisDeFechar), depoisDeFechar);
});

test('entrar e voltar duas vezes seguidas mantém o comportamento', () => {
  let estado = abrirPeloAvatar(ESTADO_INICIAL);
  for (let volta = 0; volta < 2; volta++) {
    estado = escolherItem(estado);
    assert.equal(estado.aberto, false);
    estado = aoFocarInicio(estado);
    assert.equal(estado.aberto, true, `volta ${volta + 1} deve reabrir`);
  }
  assert.equal(estado.reabrirAoVoltar, false);
});

test('sair da conta zera tudo e não deixa reabertura pendente', () => {
  const pendente = escolherItem(abrirPeloAvatar(ESTADO_INICIAL));
  const aposSair = sairDaConta(pendente);
  assert.deepEqual(aposSair, ESTADO_INICIAL);
  assert.deepEqual(aoFocarInicio(aposSair), ESTADO_INICIAL);
});

test('redutor aceita as ações por nome e ignora desconhecidas', () => {
  assert.equal(reduzir(ESTADO_INICIAL, 'abrirPeloAvatar').aberto, true);
  assert.deepEqual(reduzir(ESTADO_INICIAL, 'inexistente'), ESTADO_INICIAL);
});
