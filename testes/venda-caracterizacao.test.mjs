/**
 * TESTE DE CARACTERIZAÇÃO — escrito ANTES de mexer em qualquer arquivo.
 *
 * Ele não julga o código antigo: documenta o que o sistema faz hoje, para
 * avisar a gente se a extração do ADR-001 mudar o comportamento sem querer.
 *
 * Por que ele é feio: a regra de venda, no estado original, vivia dentro de
 * ProdutoScreen.js:183-199 e SolicitacoesScreen.js:113-141 como arrow function
 * não exportada, fechada sobre `db`, `auth` e `showAlert`. Não havia como
 * importá-la. Então transcrevemos aqui, literalmente, as linhas que ela
 * executava, contra um banco falso que só anota as chamadas. É a única forma
 * de pregar o comportamento de hoje antes de tocar nele.
 *
 * Rodar:  npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STATUS, planejarVenda } from '../dominio/solicitacao.js';

// --------------------------------------------------------------------------
// Transcrição literal do comportamento ORIGINAL (ProdutoScreen.js:190-195)
//
//   await updateDoc(doc(db, 'solicitacoes', solicitacao.id),
//                   { status: 'vendida', dataVenda: Timestamp.now() });
//   await updateDoc(doc(db, 'variacoes', solicitacao.variacao_id),
//                   { estoque: increment(-solicitacao.quantidade) });
// --------------------------------------------------------------------------
function bancoFalso() {
  const escritas = [];
  return {
    escritas,
    updateDoc(colecao, id, campos) {
      escritas.push({ colecao, id, campos });
    },
  };
}

function vendaComoEraAntes(solicitacao, banco, agora) {
  banco.updateDoc('solicitacoes', solicitacao.id, {
    status: 'vendida',
    dataVenda: agora,
  });
  banco.updateDoc('variacoes', solicitacao.variacao_id, {
    estoque: { operacao: 'incrementar', valor: -solicitacao.quantidade },
  });
}

const AGORA = new Date('2026-09-17T14:00:00.000Z');

const SOLICITACAO = {
  id: 'sol-1',
  variacao_id: 'var-9',
  produto_id: 'prod-3',
  quantidade: 1,
  tamanho: 40,
  status: STATUS.PENDENTE,
  usuario_email: 'vendedor@loja.com',
};

test('caracterização: a venda de hoje produz exatamente duas escritas, nesta ordem', () => {
  const banco = bancoFalso();
  vendaComoEraAntes(SOLICITACAO, banco, AGORA);

  assert.equal(banco.escritas.length, 2);
  assert.deepEqual(banco.escritas[0], {
    colecao: 'solicitacoes',
    id: 'sol-1',
    campos: { status: 'vendida', dataVenda: AGORA },
  });
  assert.deepEqual(banco.escritas[1], {
    colecao: 'variacoes',
    id: 'var-9',
    campos: { estoque: { operacao: 'incrementar', valor: -1 } },
  });
});

test('o domínio extraído produz o MESMO resultado observável da venda antiga', () => {
  const banco = bancoFalso();
  vendaComoEraAntes(SOLICITACAO, banco, AGORA);

  // `variacao = null` reproduz o comportamento antigo, que não revalidava
  // o estoque no momento da venda.
  const plano = planejarVenda(SOLICITACAO, null, AGORA);

  assert.equal(plano.ok, true);
  assert.deepEqual(plano.escritas, banco.escritas);
});

test('diferença conhecida e intencional: o caminho antigo deixava o banco inconsistente', () => {
  // Reproduz a falha da SEGUNDA escrita, que nenhum teste pegava porque não
  // havia teste nenhum: sem transação, a primeira escrita já foi aplicada.
  const banco = bancoFalso();
  banco.updateDoc('solicitacoes', SOLICITACAO.id, {
    status: 'vendida',
    dataVenda: AGORA,
  });
  // ...e aqui a segunda falharia.

  assert.equal(banco.escritas.length, 1);
  assert.equal(banco.escritas[0].campos.status, 'vendida');

  // A solicitação ficou vendida e o estoque não baixou: exatamente a ruptura
  // de dados que o CeleRun existe para evitar.
  //
  // O domínio devolve as duas escritas como UM plano, e o repositório aplica
  // esse plano em writeBatch. A partir do ADR-001 este estado é impossível.
  const plano = planejarVenda(SOLICITACAO, null, AGORA);
  assert.equal(plano.escritas.length, 2);
});
