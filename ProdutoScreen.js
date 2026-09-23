import React, { useState, useEffect, useContext } from 'react';
import { Text, View, Image, ActivityIndicator, TouchableOpacity, FlatList, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db, auth } from './firebaseConfig';
// Leitura de catálogo ainda usa o SDK direto — fora do escopo do ADR-001.
import { collection, query, where, getDocs, doc, getDoc, onSnapshot, limit } from 'firebase/firestore';
// ADR-001: a regra de venda e devolução saiu daqui.
import { assinarPendentesDoProduto, buscarVariacao, aplicarEscritas } from './dados/solicitacoesRepo';
import { planejarVenda, planejarCancelamento } from './dominio/solicitacao';
import { classificarEstoque } from './dominio/estoque';
import { ThemeContext } from './ThemeContext';
import { getProdutoStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

const MAX_OUTROS_PRODUTOS = 8;

export default function ProdutoScreen({ route, navigation }) {
  const { qrCode } = route.params;
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getProdutoStyles(isDarkMode);
  const placeholderIconColor = isDarkMode ? '#555' : '#ccc';
  const { alert, showAlert } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [produto, setProduto] = useState(null);
  const [variacoes, setVariacoes] = useState([]);
  const [solicitacoesAtivas, setSolicitacoesAtivas] = useState([]);
  const [outrosProdutos, setOutrosProdutos] = useState([]);
  const [carregandoOutros, setCarregandoOutros] = useState(true);

  useEffect(() => {
    // `ativo` evita o vazamento de quem sai da tela antes do fetch terminar:
    // sem ele, o onSnapshot nascia DEPOIS da limpeza e nunca era cancelado.
    let ativo = true;
    let unsubscribeVariacoes;
    const fetchProdutoCompleto = async () => {
      setLoading(true);
      setError(null);
      try {
        const variacoesRef = collection(db, 'variacoes');
        const qVariacao = query(variacoesRef, where('qr_code', '==', qrCode));
        const variacaoSnapshot = await getDocs(qVariacao);
        if (variacaoSnapshot.empty) throw new Error('QR Code não encontrado!');

        const variacaoEncontrada = variacaoSnapshot.docs[0].data();
        const produtoId = variacaoEncontrada.produto_id;
        const produtoRef = doc(db, 'produtos', produtoId);
        const produtoSnap = await getDoc(produtoRef);

        if (!produtoSnap.exists()) throw new Error('Produto principal não encontrado!');
        if (!ativo) return;
        setProduto({ id: produtoId, ...produtoSnap.data() });

        const qTodasVariacoes = query(variacoesRef, where('produto_id', '==', produtoId));
        unsubscribeVariacoes = onSnapshot(qTodasVariacoes, (snapshot) => {
            const listaVariacoes = [];
            snapshot.forEach((doc) => listaVariacoes.push({ id: doc.id, ...doc.data() }));
            listaVariacoes.sort((a, b) => a.tamanho - b.tamanho);
            setVariacoes(listaVariacoes);
        });
      } catch (e) {
        if (ativo) setError(e.message);
      } finally {
        if (ativo) setLoading(false);
      }
    };
    fetchProdutoCompleto();
    return () => {
      ativo = false;
      if (unsubscribeVariacoes) unsubscribeVariacoes();
    };
  }, [qrCode]);

  useEffect(() => {
    if (!produto || !produto.id) return;
    const unsubscribeSolicitacoes = assinarPendentesDoProduto(produto.id, setSolicitacoesAtivas);
    return () => unsubscribeSolicitacoes();
  }, [produto]);

  // Sugestão de "outros produtos disponíveis" (sem categoria/marca no banco ainda,
  // por isso pega qualquer produto diferente do atual que tenha estoque > 0)
  useEffect(() => {
    if (!produto || !produto.id) return;
    let ativo = true;

    const fetchOutrosProdutos = async () => {
      setCarregandoOutros(true);
      try {
        const variacoesRef = collection(db, 'variacoes');
        const qDisponiveis = query(variacoesRef, where('estoque', '>', 0), limit(30));
        const snapshot = await getDocs(qDisponiveis);

        const representantesPorProduto = new Map();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.produto_id === produto.id) return;
          if (!representantesPorProduto.has(data.produto_id)) {
            representantesPorProduto.set(data.produto_id, data);
          }
        });

        const candidatos = Array.from(representantesPorProduto.entries()).slice(0, MAX_OUTROS_PRODUTOS);
        const lista = await Promise.all(candidatos.map(async ([produtoId, variacao]) => {
          const produtoSnap = await getDoc(doc(db, 'produtos', produtoId));
          if (!produtoSnap.exists()) return null;
          return {
            id: produtoId,
            nome: produtoSnap.data().nome,
            // A foto do produto (se existir) vence; senão usa a da própria
            // variação — é lá que a foto por cor é cadastrada.
            imagemUrl: produtoSnap.data().imagemUrl || variacao.imagemUrl || null,
            qrCode: variacao.qr_code,
            tamanho: variacao.tamanho,
            estoque: variacao.estoque,
          };
        }));

        if (ativo) setOutrosProdutos(lista.filter(Boolean));
      } catch (e) {
        console.error('Erro ao buscar outros produtos disponíveis:', e);
      } finally {
        if (ativo) setCarregandoOutros(false);
      }
    };

    fetchOutrosProdutos();
    return () => { ativo = false; };
  }, [produto]);

  const handleSolicitar = async (itemSolicitado) => {
    if (itemSolicitado.estoque <= 0) {
      showAlert({ type: 'warning', title: 'Indisponível', message: 'Este produto está sem estoque físico!', actions: [{ label: 'OK' }] });
      return;
    }
    showAlert({
      type: 'info',
      title: 'Adicionar à Sacola',
      message: `Colocar [${produto.nome} - Tam: ${itemSolicitado.tamanho}] na sacola de solicitações?`,
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        {
          label: 'Adicionar',
          onPress: async () => {
            try {
              const corFormatada = itemSolicitado.cor || 'Única';
              const nomeCompleto = `${produto.nome} - Cor: ${corFormatada} - Tam: ${itemSolicitado.tamanho}`;

              const itemSacola = {
                id_unico: Date.now().toString(),
                produto_id: itemSolicitado.produto_id,
                variacao_id: itemSolicitado.id,
                qrCode: itemSolicitado.qr_code,
                nomeProduto: nomeCompleto,
                tamanho: itemSolicitado.tamanho,
                cor: corFormatada,
                quantidade: 1
              };

              const sacolaAtual = await AsyncStorage.getItem('@sacola_pedidos');
              const sacolaArray = sacolaAtual ? JSON.parse(sacolaAtual) : [];
              sacolaArray.push(itemSacola);
              await AsyncStorage.setItem('@sacola_pedidos', JSON.stringify(sacolaArray));

              showAlert({ type: 'success', title: 'Adicionado!', message: 'Vá até a aba "Sacola" para enviar os pedidos ao estoque.', actions: [{ label: 'OK' }] });
            } catch (e) {
              showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao adicionar na sacola local.', actions: [{ label: 'OK' }] });
            }
          },
        },
      ],
    });
  };

  // ADR-001: as duas cópias da regra viraram uma. Estas funções agora só
  // perguntam ao domínio e mandam o repositório gravar o plano.
  const handleDevolver = async (solicitacao) => {
    showAlert({
      type: 'danger',
      title: 'Devolver Tênis',
      message: 'Isso irá cancelar a solicitação.',
      actions: [
        { label: 'Voltar', style: 'cancel' },
        { label: 'Devolver', style: 'destructive', onPress: async () => {
            const plano = planejarCancelamento(solicitacao);
            if (!plano.ok) {
              showAlert({ type: 'warning', title: 'Não é possível devolver', message: plano.mensagem, actions: [{ label: 'OK' }] });
              return;
            }
            try { await aplicarEscritas(plano.escritas); }
            catch (error) { showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao devolver.', actions: [{ label: 'OK' }] }); }
        }},
      ],
    });
  };

  const handleVender = async (solicitacao) => {
    showAlert({
      type: 'success',
      title: 'Confirmar Venda',
      message: 'Isso dará baixa no estoque físico.',
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        { label: 'Vender', onPress: async () => {
            try {
              const variacao = await buscarVariacao(solicitacao.variacao_id);
              const plano = planejarVenda(solicitacao, variacao);
              if (!plano.ok) {
                showAlert({ type: 'warning', title: 'Não é possível vender', message: plano.mensagem, actions: [{ label: 'OK' }] });
                return;
              }
              await aplicarEscritas(plano.escritas);
              showAlert({ type: 'success', title: 'Sucesso', message: 'Venda finalizada!', actions: [{ label: 'OK' }] });
            } catch (error) { showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao vender.', actions: [{ label: 'OK' }] }); }
        }},
      ],
    });
  };

  const estoqueTotal = variacoes.reduce((soma, v) => soma + (v.estoque || 0), 0);

  const renderItemVariacao = ({ item }) => {
    const situacaoEstoque = classificarEstoque(item.estoque);
    return (
    <View style={styles.variacaoItem}>
      <View style={styles.variacaoConteudo}>
        <View style={styles.variacaoThumbWrapper}>
          {item.imagemUrl ? (
            <Image source={{ uri: item.imagemUrl }} style={styles.variacaoThumbImage} resizeMode="cover" />
          ) : (
            <Ionicons name="footsteps-outline" size={20} color={placeholderIconColor} />
          )}
        </View>
        <View>
          <Text style={styles.variacaoTamanho}>Tamanho: {item.tamanho} ({item.cor})</Text>
          {situacaoEstoque === 'zerado' ? (
            <Text style={styles.estoqueIndisponivel}>Estoque Zerado</Text>
          ) : (
            <Text style={styles.estoqueDisponivel}>{item.estoque} disponíveis</Text>
          )}
          {situacaoEstoque === 'baixo' && (
            <View style={styles.tagEstoqueBaixo}>
              <Text style={styles.tagEstoqueBaixoText}>Estoque baixo</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[styles.btnAdicionar, item.estoque === 0 && styles.btnAdicionarDisabled]}
        onPress={() => handleSolicitar(item)}
        disabled={item.estoque === 0}
      >
        <Ionicons name="bag-add-outline" size={18} color="#fff" />
        <Text style={styles.btnAdicionarText}>Adicionar</Text>
      </TouchableOpacity>
    </View>
    );
  };

  const renderSolicitacoesConcorrentes = () => {
    if (solicitacoesAtivas.length === 0) return null;
    const usuarioLogado = auth.currentUser;
    return (
      <View style={styles.concorrentesContainer}>
        <Text style={styles.concorrentesTitle}>⚠️ Solicitações em Andamento:</Text>
        {solicitacoesAtivas.map((sol, index) => {
          const isDono = usuarioLogado && sol.usuario_email === usuarioLogado.email;
          return (
            <View key={index} style={styles.concorrenteItem}>
              <View style={styles.concorrenteInfo}>
                  <Text style={styles.concorrenteTexto}>👤 <Text style={{fontWeight: 'bold'}}>{isDono ? 'Você' : sol.usuario_email}</Text></Text>
                  <Text style={styles.concorrenteTexto}>📦 {sol.quantidade} par (Tam: {sol.tamanho})</Text>
              </View>
              {isDono ? (
                <View style={styles.actionRow}>
                    <Pressable style={[styles.actionBtn, styles.btnDevolver]} onPress={() => handleDevolver(sol)}><Text style={styles.btnDevolverText}>Devolver</Text></Pressable>
                    <Pressable style={[styles.actionBtn, styles.btnVender]} onPress={() => handleVender(sol)}><Text style={styles.btnVenderText}>Vender</Text></Pressable>
                </View>
              ) : (
                <Text style={styles.aguardandoTexto}>🔒 Aguardando ação deste usuário</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const renderOutroProduto = ({ item }) => (
    <TouchableOpacity
      style={styles.similarCard}
      onPress={() => navigation.push('Produto', { qrCode: item.qrCode })}
    >
      <View style={styles.similarImageWrapper}>
        {item.imagemUrl ? (
          <Image source={{ uri: item.imagemUrl }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <Ionicons name="footsteps-outline" size={32} color={placeholderIconColor} />
        )}
      </View>
      <View style={styles.similarInfo}>
        <Text style={styles.similarNome} numberOfLines={1}>{item.nome}</Text>
        <Text style={styles.similarEstoque}>Tam {item.tamanho} · {item.estoque} un.</Text>
      </View>
    </TouchableOpacity>
  );

  const Header = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Detalhes do Produto</Text>
      {/* Ao entrar em "outros produtos" várias vezes seguidas, a pilha cresce
          (cada um empilha uma nova tela de Produto). Este botão zera a pilha
          e volta direto ao Início, em vez de exigir voltar tela por tela. */}
      <TouchableOpacity
        onPress={() => navigation.popToTop()}
        style={styles.backButton}
        accessibilityLabel="Voltar ao Início"
      >
        <Ionicons name="home-outline" size={22} color={isDarkMode ? '#F2F3F5' : '#111'} />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.scrollContainer}>
        <Header />
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#5865F2" />
        </View>
        <AppAlert {...alert} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.scrollContainer}>
        <Header />
        <View style={styles.container}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
        <AppAlert {...alert} />
      </View>
    );
  }

  // Imagem de destaque: usa a foto do produto se existir; senão, cai para a
  // primeira variação (tamanho/cor) que já tenha foto cadastrada.
  const imagemDestaque = produto?.imagemUrl || variacoes.find((v) => v.imagemUrl)?.imagemUrl;

  return (
    <View style={styles.scrollContainer}>
      <Header />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrapper}>
          {imagemDestaque ? (
            <Image source={{ uri: imagemDestaque }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="footsteps-outline" size={64} color={placeholderIconColor} />
              <Text style={styles.imagePlaceholderText}>Sem foto cadastrada</Text>
            </>
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{produto?.nome}</Text>
          <View style={[styles.estoqueBadge, estoqueTotal === 0 && styles.estoqueBadgeZerado]}>
            <Ionicons
              name={estoqueTotal > 0 ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={estoqueTotal > 0 ? styles.estoqueBadgeText.color : styles.estoqueBadgeTextZerado.color}
            />
            <Text style={[styles.estoqueBadgeText, estoqueTotal === 0 && styles.estoqueBadgeTextZerado]}>
              {estoqueTotal > 0 ? `${estoqueTotal} pares no estoque` : 'Sem estoque disponível'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Selecionar Tamanho</Text>
        <FlatList data={variacoes} renderItem={renderItemVariacao} keyExtractor={(item) => item.id} style={styles.list} scrollEnabled={false} />

        {renderSolicitacoesConcorrentes()}

        <Text style={styles.sectionTitle}>Outros Produtos Disponíveis</Text>
        <View style={styles.similaresContainer}>
          {carregandoOutros ? (
            <ActivityIndicator size="small" color="#5865F2" />
          ) : outrosProdutos.length === 0 ? (
            <Text style={styles.similaresVazio}>Nenhum outro produto disponível no momento.</Text>
          ) : (
            <FlatList
              data={outrosProdutos}
              renderItem={renderOutroProduto}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.similaresList}
            />
          )}
        </View>
      </ScrollView>
      <AppAlert {...alert} />
    </View>
  );
}
