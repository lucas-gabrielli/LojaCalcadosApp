/**
 * Repositório de estoque — mesmo papel de dados/solicitacoesRepo.js (ADR-001):
 * único lugar que fala com o SDK do Firestore para dados de variações/estoque.
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LIMITE_ESTOQUE_BAIXO } from '../dominio/estoque';

// Teto de leituras avulsas por tela: um relatório de "todo o período" pode ter
// centenas de linhas, e nenhuma delas justifica centenas de idas ao Firestore.
const MAX_VARIACOES_POR_BUSCA = 40;

/**
 * Busca todas as variações da loja com estoque na faixa "baixo" ou "zerado"
 * (estoque <= limite), já com o nome do produto resolvido.
 * Consulta de loja inteira — não filtra por vendedor, pois estoque é da loja.
 */
export async function buscarVariacoesComEstoqueBaixo(limite = LIMITE_ESTOQUE_BAIXO) {
  const variacoesRef = collection(db, 'variacoes');
  const q = query(variacoesRef, where('estoque', '<=', limite));
  const snapshot = await getDocs(q);

  const variacoes = [];
  snapshot.forEach((docSnap) => variacoes.push({ id: docSnap.id, ...docSnap.data() }));

  const produtoIds = [...new Set(variacoes.map((v) => v.produto_id).filter(Boolean))];
  const produtosPorId = {};
  await Promise.all(
    produtoIds.map(async (produtoId) => {
      const produtoSnap = await getDoc(doc(db, 'produtos', produtoId));
      if (produtoSnap.exists()) produtosPorId[produtoId] = produtoSnap.data();
    })
  );

  return variacoes.map((v) => ({
    ...v,
    nomeProduto: produtosPorId[v.produto_id]?.nome || 'Produto',
  }));
}

/**
 * Resolve os dados de exibição de um punhado de variações, pelo id.
 *
 * A Sacola e os Relatórios guardam só o texto do item — nome, cor, tamanho.
 * Para mostrarem o tênis como o Histórico de Busca mostra (com foto e link
 * para o detalhe), falta a foto e o QR Code, que vivem na variação.
 *
 * @param {string[]} ids
 * @returns {Promise<Object<string, {imagemUrl: string|null, qrCode: string|null, cor: string|null, tamanho: any, estoque: number}>>}
 */
export async function buscarDetalhesDeVariacoes(ids) {
  const unicos = [...new Set((ids || []).filter(Boolean))].slice(0, MAX_VARIACOES_POR_BUSCA);
  if (unicos.length === 0) return {};

  const porId = {};
  await Promise.all(
    unicos.map(async (variacaoId) => {
      try {
        const snap = await getDoc(doc(db, 'variacoes', variacaoId));
        if (!snap.exists()) return;
        const dados = snap.data();
        porId[variacaoId] = {
          imagemUrl: dados.imagemUrl || null,
          qrCode: dados.qr_code || null,
          cor: dados.cor || null,
          tamanho: dados.tamanho,
          estoque: Number(dados.estoque) || 0,
        };
      } catch (e) {
        // Uma variação apagada não pode derrubar a lista inteira: o item
        // simplesmente aparece sem foto, como já aparecia antes.
        console.error('[estoqueRepo] falha ao ler variação', variacaoId, e);
      }
    })
  );

  return porId;
}
