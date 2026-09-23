/**
 * Repositório de solicitações — ADR-001.
 *
 * Interface própria entre o app e o Firestore. A partir daqui, o resto do
 * sistema não precisa saber que existe Firebase: entram e saem objetos comuns,
 * com Date no lugar de Timestamp.
 *
 * Aplica os planos de escrita do domínio em writeBatch — o que torna
 * impossível a solicitação virar "vendida" sem a baixa do estoque acontecer
 * junto (o defeito documentado em testes/venda-caracterizacao.test.mjs).
 */

import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  writeBatch,
  increment,
  Timestamp,
} from 'firebase/firestore';

import { db } from '../firebaseConfig';
import { STATUS } from '../dominio/solicitacao';

/** Fronteira do formato: Timestamp do Firestore vira Date aqui, e em nenhum outro lugar. */
function paraData(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor.toDate === 'function') return valor.toDate();
  if (typeof valor.seconds === 'number') return new Date(valor.seconds * 1000);
  return null;
}

export function paraSolicitacao(id, dados) {
  return {
    ...dados,
    id,
    dataSolicitacao: paraData(dados.dataSolicitacao),
    dataVenda: paraData(dados.dataVenda),
  };
}

function assinar(consulta, aoMudar, aoFalhar) {
  return onSnapshot(
    consulta,
    (snapshot) => {
      const lista = [];
      snapshot.forEach((documento) => {
        lista.push(paraSolicitacao(documento.id, documento.data()));
      });
      aoMudar(lista);
    },
    (erro) => {
      console.error('[solicitacoesRepo] falha na assinatura:', erro);
      if (aoFalhar) aoFalhar(erro);
    }
  );
}

/** Solicitações pendentes de um vendedor, em tempo real. */
export function assinarPendentesDoVendedor(email, aoMudar, aoFalhar) {
  return assinar(
    query(
      collection(db, 'solicitacoes'),
      where('usuario_email', '==', email),
      where('status', '==', STATUS.PENDENTE),
      orderBy('dataSolicitacao', 'desc')
    ),
    aoMudar,
    aoFalhar
  );
}

/** Solicitações pendentes de um produto — usada na tela de detalhe. */
export function assinarPendentesDoProduto(produtoId, aoMudar, aoFalhar) {
  return assinar(
    query(
      collection(db, 'solicitacoes'),
      where('produto_id', '==', produtoId),
      where('status', '==', STATUS.PENDENTE)
    ),
    aoMudar,
    aoFalhar
  );
}

/**
 * Gancho do Módulo Runner: a fila do depósito é de TODOS os vendedores.
 * A tela do Runner não existe ainda (fora de escopo do ADR-001); o ponto de
 * entrada fica pronto para ela.
 */
export function assinarFilaDoDeposito(aoMudar, aoFalhar) {
  return assinar(
    query(
      collection(db, 'solicitacoes'),
      where('status', '==', STATUS.PENDENTE),
      orderBy('dataSolicitacao', 'asc')
    ),
    aoMudar,
    aoFalhar
  );
}

/** Lê uma variação para que o domínio possa revalidar o estoque antes da venda. */
export async function buscarVariacao(variacaoId) {
  if (!variacaoId) return null;
  const instantaneo = await getDoc(doc(db, 'variacoes', variacaoId));
  if (!instantaneo.exists()) return null;
  return { id: instantaneo.id, ...instantaneo.data() };
}

function paraValorDoBanco(valor) {
  if (valor instanceof Date) return Timestamp.fromDate(valor);
  if (valor && valor.operacao === 'incrementar') return increment(valor.valor);
  return valor;
}

/**
 * Aplica um plano de escritas do domínio. Tudo ou nada.
 * @param {Array<{colecao: string, id: string, campos: object}>} escritas
 */
export async function aplicarEscritas(escritas) {
  if (!Array.isArray(escritas) || escritas.length === 0) return;

  const lote = writeBatch(db);
  escritas.forEach(({ colecao, id, campos }) => {
    const convertidos = {};
    Object.keys(campos).forEach((chave) => {
      convertidos[chave] = paraValorDoBanco(campos[chave]);
    });
    lote.update(doc(db, colecao, id), convertidos);
  });

  await lote.commit();
}
