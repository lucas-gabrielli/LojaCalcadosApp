/**
 * Repositório de estoque — mesmo papel de dados/solicitacoesRepo.js (ADR-001):
 * único lugar que fala com o SDK do Firestore para dados de variações/estoque.
 */

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { LIMITE_ESTOQUE_BAIXO } from '../dominio/estoque';

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
