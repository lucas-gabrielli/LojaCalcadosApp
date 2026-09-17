import React, { useState, useEffect, useContext } from 'react';
import { Text, View, Image, ActivityIndicator, TouchableOpacity, FlatList, ScrollView, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db, auth } from './firebaseConfig';
import { collection, query, where, getDocs, doc, getDoc, Timestamp, onSnapshot, updateDoc, increment, limit } from 'firebase/firestore';
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
        setProduto({ id: produtoId, ...produtoSnap.data() });

        const qTodasVariacoes = query(variacoesRef, where('produto_id', '==', produtoId));
        unsubscribeVariacoes = onSnapshot(qTodasVariacoes, (snapshot) => {
            const listaVariacoes = [];
            snapshot.forEach((doc) => listaVariacoes.push({ id: doc.id, ...doc.data() }));
            listaVariacoes.sort((a, b) => a.tamanho - b.tamanho);
            setVariacoes(listaVariacoes);
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProdutoCompleto();
    return () => { if (unsubscribeVariacoes) unsubscribeVariacoes(); };
  }, [qrCode]);

  useEffect(() => {
    if (!produto || !produto.id) return;
    const solicitacoesRef = collection(db, 'solicitacoes');
    const qSolicitacoes = query(solicitacoesRef, where('produto_id', '==', produto.id), where('status', '==', 'pendente'));
    const unsubscribeSolicitacoes = onSnapshot(qSolicitacoes, (snapshot) => {
      const listaSolicitacoes = [];
      snapshot.forEach((doc) => listaSolicitacoes.push({ id: doc.id, ...doc.data() }));
      setSolicitacoesAtivas(listaSolicitacoes);
    });
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
            imagemUrl: produtoSnap.data().imagemUrl || null,
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

  const handleDevolver = async (solicitacaoId) => {
    showAlert({
      type: 'danger',
      title: 'Devolver Tênis',
      message: 'Isso irá cancelar a solicitação.',
      actions: [
        { label: 'Voltar', style: 'cancel' },
        { label: 'Devolver', style: 'destructive', onPress: async () => {
            try { await updateDoc(doc(db, 'solicitacoes', solicitacaoId), { status: 'cancelada' }); }
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
              await updateDoc(doc(db, 'solicitacoes', solicitacao.id), { status: 'vendida', dataVenda: Timestamp.now() });
              await updateDoc(doc(db, 'variacoes', solicitacao.variacao_id), { estoque: increment(-solicitacao.quantidade) });
              showAlert({ type: 'success', title: 'Sucesso', message: 'Venda finalizada!', actions: [{ label: 'OK' }] });
            } catch (error) { showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao vender.', actions: [{ label: 'OK' }] }); }
        }},
      ],
    });
  };

  const estoqueTotal = variacoes.reduce((soma, v) => soma + (v.estoque || 0), 0);

  const renderItemVariacao = ({ item }) => (
    <View style={styles.variacaoItem}>
      <View>
        <Text style={styles.variacaoTamanho}>Tamanho: {item.tamanho} ({item.cor})</Text>
        {item.estoque > 0 ? (
          <Text style={styles.estoqueDisponivel}>{item.estoque} disponíveis</Text>
        ) : (
          <Text style={styles.estoqueIndisponivel}>Estoque Zerado</Text>
        )}
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
                    <Pressable style={[styles.actionBtn, styles.btnDevolver]} onPress={() => handleDevolver(sol.id)}><Text style={styles.btnDevolverText}>Devolver</Text></Pressable>
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
      <View style={{ width: 24 }} />
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

  return (
    <View style={styles.scrollContainer}>
      <Header />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.imageWrapper}>
          {produto?.imagemUrl ? (
            <Image source={{ uri: produto.imagemUrl }} style={styles.productImage} resizeMode="cover" />
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
