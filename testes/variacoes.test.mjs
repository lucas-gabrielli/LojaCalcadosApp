import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  COR_PADRAO,
  normalizarCor,
  agruparPorCor,
  tamanhosDaCor,
  gradeDeTamanhos,
  contarTamanhosDisponiveis,
  encontrarVariacao,
  escolhaInicial,
  tamanhoAoTrocarCor,
  limitarQuantidade,
  descreverItem,
  detalhesDoItem,
} from '../dominio/variacoes.js';

// Catálogo de apoio: um modelo, duas cores, numerações que não coincidem.
const VARIACOES = [
  { id: 'v1', qr_code: 'QR-PRETO-40', cor: 'Preto', tamanho: 40, estoque: 2, imagemUrl: 'preto.jpg' },
  { id: 'v2', qr_code: 'QR-PRETO-39', cor: 'Preto', tamanho: 39, estoque: 0 },
  { id: 'v3', qr_code: 'QR-BRANCO-41', cor: 'Branco', tamanho: 41, estoque: 5, imagemUrl: 'branco.jpg' },
  { id: 'v4', qr_code: 'QR-BRANCO-40', cor: 'Branco', tamanho: 40, estoque: 0 },
];

// --- normalizarCor ----------------------------------------------------------

test('variação sem cor cadastrada vira a cor padrão', () => {
  assert.equal(normalizarCor(null), COR_PADRAO);
  assert.equal(normalizarCor('   '), COR_PADRAO);
  assert.equal(normalizarCor('Preto'), 'Preto');
});

// --- agruparPorCor ----------------------------------------------------------

test('agrupa o mesmo modelo por cor, na ordem em que as cores aparecem', () => {
  const grupos = agruparPorCor(VARIACOES);
  assert.deepEqual(grupos.map((g) => g.cor), ['Preto', 'Branco']);
});

test('cada cor soma o próprio estoque e herda a primeira foto que encontrar', () => {
  const [preto, branco] = agruparPorCor(VARIACOES);
  assert.equal(preto.estoqueTotal, 2);
  assert.equal(preto.imagemUrl, 'preto.jpg');
  assert.equal(branco.estoqueTotal, 5);
  assert.equal(branco.imagemUrl, 'branco.jpg');
});

test('os tamanhos de cada cor saem ordenados por número', () => {
  const [preto] = agruparPorCor(VARIACOES);
  assert.deepEqual(preto.tamanhos.map((t) => t.tamanho), [39, 40]);
});

test('lida com entrada vazia ou indefinida', () => {
  assert.deepEqual(agruparPorCor([]), []);
  assert.deepEqual(agruparPorCor(undefined), []);
});

// --- tamanhosDaCor / encontrarVariacao --------------------------------------

test('tamanhosDaCor devolve só a numeração daquela cor', () => {
  assert.deepEqual(tamanhosDaCor(VARIACOES, 'Branco').map((t) => t.tamanho), [40, 41]);
  assert.deepEqual(tamanhosDaCor(VARIACOES, 'Verde'), []);
});

test('encontrarVariacao acha a combinação exata de cor e tamanho', () => {
  assert.equal(encontrarVariacao(VARIACOES, 'Branco', 41).id, 'v3');
  // O tamanho 41 só existe no branco — pedir no preto não pode devolver o branco.
  assert.equal(encontrarVariacao(VARIACOES, 'Preto', 41), null);
  assert.equal(encontrarVariacao(VARIACOES, 'Preto', null), null);
});

// --- escolhaInicial ---------------------------------------------------------

test('abre já na cor e no tamanho do QR Code escaneado', () => {
  assert.deepEqual(escolhaInicial(VARIACOES, 'QR-BRANCO-40'), { cor: 'Branco', tamanho: 40 });
});

test('sem QR conhecido, abre na primeira combinação com estoque', () => {
  assert.deepEqual(escolhaInicial(VARIACOES), { cor: 'Preto', tamanho: 40 });
});

test('com tudo zerado, ainda abre em alguma combinação', () => {
  const zeradas = [{ id: 'z', cor: 'Preto', tamanho: 38, estoque: 0 }];
  assert.deepEqual(escolhaInicial(zeradas), { cor: 'Preto', tamanho: 38 });
});

test('produto sem variação nenhuma não seleciona nada', () => {
  assert.deepEqual(escolhaInicial([]), { cor: null, tamanho: null });
});

// --- tamanhoAoTrocarCor -----------------------------------------------------

test('trocar de cor mantém o tamanho quando ele existe e tem estoque', () => {
  const comAmbos = [
    ...VARIACOES,
    { id: 'v5', cor: 'Branco', tamanho: 39, estoque: 3 },
  ];
  assert.equal(tamanhoAoTrocarCor(comAmbos, 'Branco', 39), 39);
});

test('trocar de cor pula para o primeiro tamanho com estoque quando o atual está esgotado', () => {
  // 40 existe no branco, mas zerado — a seleção desce para o 41.
  assert.equal(tamanhoAoTrocarCor(VARIACOES, 'Branco', 40), 41);
});

test('trocar para uma cor sem tamanho algum não seleciona nada', () => {
  assert.equal(tamanhoAoTrocarCor(VARIACOES, 'Verde', 40), null);
});

// --- limitarQuantidade ------------------------------------------------------

test('a quantidade nunca passa do estoque disponível', () => {
  assert.equal(limitarQuantidade(10, 3), 3);
  assert.equal(limitarQuantidade(2, 3), 2);
});

test('a quantidade nunca desce abaixo de 1 quando há estoque', () => {
  assert.equal(limitarQuantidade(0, 3), 1);
  assert.equal(limitarQuantidade(-5, 3), 1);
  assert.equal(limitarQuantidade('abc', 3), 1);
});

test('sem estoque, a quantidade é zero', () => {
  assert.equal(limitarQuantidade(1, 0), 0);
  assert.equal(limitarQuantidade(1, undefined), 0);
});

// --- gradeDeTamanhos --------------------------------------------------------

test('a grade vai de 36 a 45 mesmo quando quase nada está cadastrado', () => {
  const grade = gradeDeTamanhos(VARIACOES, 'Preto');
  assert.equal(grade.length, 10);
  assert.deepEqual(grade.map((i) => i.chave), ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45']);
});

test('numeração com par vira disponível; com pouco par, baixo', () => {
  const grade = gradeDeTamanhos(VARIACOES, 'Preto');
  const porChave = Object.fromEntries(grade.map((i) => [i.chave, i]));
  // v1: Preto 40, estoque 2 → dentro do limite de estoque baixo.
  assert.equal(porChave['40'].situacao, 'baixo');
  assert.equal(porChave['40'].estoque, 2);
  assert.equal(porChave['40'].cadastrado, true);

  const branco = gradeDeTamanhos(VARIACOES, 'Branco');
  // v3: Branco 41, estoque 5 → acima do limite.
  assert.equal(branco.find((i) => i.chave === '41').situacao, 'disponivel');
});

test('numeração cadastrada mas zerada fica esgotada, e não indisponível', () => {
  const grade = gradeDeTamanhos(VARIACOES, 'Preto');
  const trinta9 = grade.find((i) => i.chave === '39');
  assert.equal(trinta9.situacao, 'esgotado');
  assert.equal(trinta9.cadastrado, true);
  assert.equal(trinta9.estoque, 0);
});

test('numeração que a loja não trabalha fica indisponível e sem variação', () => {
  const grade = gradeDeTamanhos(VARIACOES, 'Preto');
  const quarenta5 = grade.find((i) => i.chave === '45');
  assert.equal(quarenta5.situacao, 'indisponivel');
  assert.equal(quarenta5.cadastrado, false);
  assert.equal(quarenta5.variacao, null);
  assert.equal(quarenta5.estoque, 0);
});

test('numeração fora da faixa não some: entra no fim da grade', () => {
  const variacoes = [
    { id: 'a', cor: 'Preto', tamanho: 46, estoque: 4 },
    { id: 'b', cor: 'Preto', tamanho: 35, estoque: 1 },
    { id: 'c', cor: 'Preto', tamanho: 40, estoque: 1 },
  ];
  const grade = gradeDeTamanhos(variacoes, 'Preto');
  assert.deepEqual(grade.slice(10).map((i) => i.chave), ['35', '46']);
  assert.equal(grade.find((i) => i.chave === '46').situacao, 'disponivel');
});

test('cadastro duplicado da mesma numeração soma o estoque', () => {
  const variacoes = [
    { id: 'a', cor: 'Preto', tamanho: 40, estoque: 3 },
    { id: 'b', cor: 'Preto', tamanho: 40, estoque: 4 },
  ];
  const item = gradeDeTamanhos(variacoes, 'Preto').find((i) => i.chave === '40');
  assert.equal(item.estoque, 7);
  assert.equal(item.situacao, 'disponivel');
});

test('a faixa da grade é configurável', () => {
  const grade = gradeDeTamanhos(VARIACOES, 'Preto', { minimo: 38, maximo: 40 });
  assert.deepEqual(grade.map((i) => i.chave), ['38', '39', '40']);
});

test('cor sem nenhuma variação ainda mostra a grade inteira apagada', () => {
  const grade = gradeDeTamanhos(VARIACOES, 'Azul');
  assert.equal(grade.length, 10);
  assert.ok(grade.every((i) => i.situacao === 'indisponivel'));
});

test('contarTamanhosDisponiveis conta só quem tem par para vender', () => {
  // Preto: 40 com 2 pares (baixo) e 39 zerado.
  assert.equal(contarTamanhosDisponiveis(gradeDeTamanhos(VARIACOES, 'Preto')), 1);
  assert.equal(contarTamanhosDisponiveis(gradeDeTamanhos(VARIACOES, 'Azul')), 0);
  assert.equal(contarTamanhosDisponiveis([]), 0);
  assert.equal(contarTamanhosDisponiveis(undefined), 0);
});

// --- descreverItem / detalhesDoItem -----------------------------------------

test('descreverItem grava produto, cor e tamanho num formato só', () => {
  assert.equal(descreverItem('Nike Air', 'Preto', 40), 'Nike Air - Cor: Preto - Tam: 40');
  assert.equal(descreverItem('Nike Air', null, 40), `Nike Air - Cor: ${COR_PADRAO} - Tam: 40`);
});

test('detalhesDoItem prefere os campos soltos do item', () => {
  const item = { nomeBase: 'Nike Air', nomeProduto: 'lixo antigo', cor: 'Branco', tamanho: 41 };
  assert.deepEqual(detalhesDoItem(item), { nome: 'Nike Air', cor: 'Branco', tamanho: 41 });
});

test('detalhesDoItem lê itens antigos, que só têm o nome cheio', () => {
  const antigo = { nomeProduto: 'Nike Air - Cor: Preto - Tam: 40' };
  assert.deepEqual(detalhesDoItem(antigo), { nome: 'Nike Air', cor: 'Preto', tamanho: '40' });
});

test('detalhesDoItem não quebra com nome fora do formato', () => {
  assert.deepEqual(detalhesDoItem({ nomeProduto: 'Só o nome' }), {
    nome: 'Só o nome',
    cor: COR_PADRAO,
    tamanho: null,
  });
  assert.deepEqual(detalhesDoItem(null), { nome: '', cor: COR_PADRAO, tamanho: null });
});
