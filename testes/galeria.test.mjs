import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extrairImagens, capaDaCor, galeriaDoGrupo } from '../dominio/galeria.js';
import { agruparPorCor } from '../dominio/variacoes.js';

// --- extrairImagens ---------------------------------------------------------

test('lê a lista nova `imagens` na ordem cadastrada', () => {
  assert.deepEqual(extrairImagens({ imagens: ['a.jpg', 'b.jpg'] }), ['a.jpg', 'b.jpg']);
});

test('o campo antigo `imagemUrl` continua valendo, e entra depois da lista', () => {
  const fonte = { imagens: ['nova.jpg'], imagemUrl: 'antiga.jpg' };
  assert.deepEqual(extrairImagens(fonte), ['nova.jpg', 'antiga.jpg']);
});

test('cadastro só com o campo antigo devolve aquela foto', () => {
  assert.deepEqual(extrairImagens({ imagemUrl: 'antiga.jpg' }), ['antiga.jpg']);
});

test('aceita os apelidos de campo usados no cadastro manual', () => {
  assert.deepEqual(extrairImagens({ fotos: ['1.jpg'] }), ['1.jpg']);
  assert.deepEqual(extrairImagens({ galeria: ['2.jpg'] }), ['2.jpg']);
  assert.deepEqual(extrairImagens({ foto: '3.jpg' }), ['3.jpg']);
  assert.deepEqual(extrairImagens({ imagem_url: '4.jpg' }), ['4.jpg']);
});

test('várias URLs coladas numa string só viram uma lista', () => {
  assert.deepEqual(extrairImagens({ imagens: 'a.jpg, b.jpg;c.jpg' }), ['a.jpg', 'b.jpg', 'c.jpg']);
});

test('aceita objetos com url, uri ou imagemUrl dentro da lista', () => {
  const fonte = { imagens: [{ url: 'a.jpg' }, { uri: 'b.jpg' }, { imagemUrl: 'c.jpg' }] };
  assert.deepEqual(extrairImagens(fonte), ['a.jpg', 'b.jpg', 'c.jpg']);
});

test('descarta vazios, espaços em branco e repetidas', () => {
  const fonte = { imagens: ['  a.jpg  ', '', null, 'a.jpg', 42], imagemUrl: '   ' };
  assert.deepEqual(extrairImagens(fonte), ['a.jpg']);
});

test('documento sem nenhuma foto devolve lista vazia', () => {
  assert.deepEqual(extrairImagens({}), []);
  assert.deepEqual(extrairImagens(null), []);
  assert.deepEqual(extrairImagens('texto'), []);
});

// --- capaDaCor --------------------------------------------------------------

test('a capa da cor é a primeira foto que aparecer nas variações dela', () => {
  const variacoes = [{ tamanho: 39 }, { tamanho: 40, imagens: ['preto-40.jpg'] }, { tamanho: 41, imagemUrl: 'x.jpg' }];
  assert.equal(capaDaCor(variacoes), 'preto-40.jpg');
});

test('cor sem foto nenhuma não tem capa', () => {
  assert.equal(capaDaCor([{ tamanho: 39 }]), null);
  assert.equal(capaDaCor([]), null);
  assert.equal(capaDaCor(undefined), null);
});

// --- galeriaDoGrupo ---------------------------------------------------------

const PRODUTO = { nome: 'Tênis X', imagens: ['geral-1.jpg', 'geral-2.jpg'] };
const VARIACOES = [
  { id: 'v1', cor: 'Preto', tamanho: 39, estoque: 1, imagens: ['preto-1.jpg', 'preto-2.jpg'] },
  { id: 'v2', cor: 'Preto', tamanho: 40, estoque: 2, imagemUrl: 'preto-3.jpg' },
  { id: 'v3', cor: 'Branco', tamanho: 40, estoque: 5, imagens: ['branco-1.jpg'] },
  { id: 'v4', cor: 'Verde', tamanho: 41, estoque: 0 },
];
const GRUPOS = agruparPorCor(VARIACOES);
const grupoDe = (cor) => GRUPOS.find((g) => g.cor === cor);

test('as fotos da cor escolhida vêm primeiro, depois as gerais do produto', () => {
  assert.deepEqual(galeriaDoGrupo(PRODUTO, grupoDe('Preto'), GRUPOS), [
    'preto-1.jpg',
    'preto-2.jpg',
    'preto-3.jpg',
    'geral-1.jpg',
    'geral-2.jpg',
  ]);
});

test('trocar de cor troca o carrossel', () => {
  const branco = galeriaDoGrupo(PRODUTO, grupoDe('Branco'), GRUPOS);
  assert.equal(branco[0], 'branco-1.jpg');
  assert.ok(!branco.includes('preto-1.jpg'));
});

test('cor sem foto usa as fotos gerais do produto', () => {
  assert.deepEqual(galeriaDoGrupo(PRODUTO, grupoDe('Verde'), GRUPOS), ['geral-1.jpg', 'geral-2.jpg']);
});

test('sem foto na cor e sem foto no produto, cai para as outras cores', () => {
  const galeria = galeriaDoGrupo({ nome: 'Tênis X' }, grupoDe('Verde'), GRUPOS);
  assert.deepEqual(galeria, ['preto-1.jpg', 'preto-2.jpg', 'preto-3.jpg', 'branco-1.jpg']);
});

test('produto sem foto nenhuma devolve carrossel vazio', () => {
  const grupos = agruparPorCor([{ id: 'v1', cor: 'Preto', tamanho: 40, estoque: 1 }]);
  assert.deepEqual(galeriaDoGrupo({ nome: 'Tênis Y' }, grupos[0], grupos), []);
});

test('a mesma foto cadastrada no produto e na variação aparece uma vez só', () => {
  const grupos = agruparPorCor([{ id: 'v1', cor: 'Preto', tamanho: 40, estoque: 1, imagens: ['a.jpg'] }]);
  assert.deepEqual(galeriaDoGrupo({ imagens: ['a.jpg', 'b.jpg'] }, grupos[0], grupos), ['a.jpg', 'b.jpg']);
});

test('sem grupo em destaque ainda mostra as fotos do produto', () => {
  assert.deepEqual(galeriaDoGrupo(PRODUTO, null, GRUPOS), ['geral-1.jpg', 'geral-2.jpg']);
});
