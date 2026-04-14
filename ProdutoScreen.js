import React, { useState, useEffect, useContext } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Button, 
  FlatList,
  Alert,
  ScrollView,
  Pressable
} from 'react-native';

import { db, auth } from './firebaseConfig'; 
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,        
  Timestamp,
  onSnapshot,
  updateDoc,   // NOVO: Para atualizar o status da solicitação
  increment    // NOVO: Para dar baixa no estoque de forma segura
} from 'firebase/firestore';

import { ThemeContext } from './ThemeContext';

export default function ProdutoScreen({ route, navigation }) {
  const { qrCode } = route.params;
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getDynamicStyles(isDarkMode);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [produto, setProduto] = useState(null);
  const [variacoes, setVariacoes] = useState([]);
  
  const [solicitacoesAtivas, setSolicitacoesAtivas] = useState([]);

  // 1. BUSCA O PRODUTO E AS VARIAÇÕES (ESTOQUE) EM TEMPO REAL
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

        // LISTENER PARA AS VARIAÇÕES (Assim o estoque atualiza na tela se alguém vender)
        const qTodasVariacoes = query(variacoesRef, where('produto_id', '==', produtoId));
        unsubscribeVariacoes = onSnapshot(qTodasVariacoes, (snapshot) => {
            const listaVariacoes = [];
            snapshot.forEach((doc) => {
              listaVariacoes.push({ id: doc.id, ...doc.data() });
            });
            listaVariacoes.sort((a, b) => a.tamanho - b.tamanho);
            setVariacoes(listaVariacoes);
        });

      } catch (e) {
        console.error("Erro na busca completa: ", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProdutoCompleto();

    return () => {
      if (unsubscribeVariacoes) unsubscribeVariacoes();
    };
  }, [qrCode]);

  // 2. LISTENER PARA AS SOLICITAÇÕES PENDENTES
  useEffect(() => {
    if (!produto || !produto.id) return;

    const solicitacoesRef = collection(db, 'solicitacoes');
    const qSolicitacoes = query(
      solicitacoesRef, 
      where('produto_id', '==', produto.id),
      where('status', '==', 'pendente')
    );

    const unsubscribeSolicitacoes = onSnapshot(qSolicitacoes, (snapshot) => {
      const listaSolicitacoes = [];
      snapshot.forEach((doc) => {
        listaSolicitacoes.push({ id: doc.id, ...doc.data() });
      });
      setSolicitacoesAtivas(listaSolicitacoes);
    });

    return () => unsubscribeSolicitacoes();
  }, [produto]);

  // --- AÇÕES DO APLICATIVO ---

  const handleSolicitar = async (itemSolicitado) => {
    if (itemSolicitado.estoque <= 0) {
      Alert.alert('Indisponível', 'Este produto está sem estoque físico!');
      return;
    }

    Alert.alert(
      'Confirmar Solicitação',
      `Deseja separar 1x [${produto.nome} - Tam: ${itemSolicitado.tamanho}]?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const logRef = collection(db, 'solicitacoes'); 
            const usuarioLogado = auth.currentUser; 

            try {
              await addDoc(logRef, {
                produto_id: itemSolicitado.produto_id,
                variacao_id: itemSolicitado.id,
                qrCode: itemSolicitado.qr_code,
                nomeProduto: produto.nome,
                tamanho: itemSolicitado.tamanho,
                cor: itemSolicitado.cor,
                dataSolicitacao: Timestamp.now(), 
                status: 'pendente', 
                usuario_email: usuarioLogado ? usuarioLogado.email : 'Usuário Desconhecido', 
                quantidade: 1 
              });
            } catch (e) {
              console.error("Erro ao registrar solicitação: ", e);
              Alert.alert('Erro', 'Não foi possível registrar a solicitação.');
            }
          },
        },
      ]
    );
  };

  // NOVO: FUNÇÃO PARA DEVOLVER (CANCELA A SOLICITAÇÃO)
  const handleDevolver = async (solicitacaoId) => {
    Alert.alert(
      'Devolver Tênis',
      'O cliente desistiu? Isso irá cancelar a solicitação.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Devolver',
          style: 'destructive',
          onPress: async () => {
            try {
              const solRef = doc(db, 'solicitacoes', solicitacaoId);
              // Apenas muda o status, ela some da tela e o estoque fica intacto
              await updateDoc(solRef, { status: 'cancelada' }); 
            } catch (error) {
              console.error("Erro ao devolver: ", error);
              Alert.alert("Erro", "Falha ao devolver o produto.");
            }
          }
        }
      ]
    );
  };

  // NOVO: FUNÇÃO PARA VENDER (CONCLUI A SOLICITAÇÃO E BAIXA O ESTOQUE)
  const handleVender = async (solicitacao) => {
    Alert.alert(
      'Confirmar Venda',
      'O cliente vai levar? Isso dará baixa no estoque físico.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vender',
          onPress: async () => {
            try {
              // 1. Muda o status da solicitação para vendida (some da tela)
              const solRef = doc(db, 'solicitacoes', solicitacao.id);
              await updateDoc(solRef, { status: 'vendida', dataVenda: Timestamp.now() });

              // 2. Vai na variação específica e reduz o estoque baseado na quantidade solicitada
              const varRef = doc(db, 'variacoes', solicitacao.variacao_id);
              await updateDoc(varRef, { 
                estoque: increment(-solicitacao.quantidade) 
              });

              Alert.alert("Sucesso", "Venda finalizada e estoque atualizado!");
            } catch (error) {
              console.error("Erro ao vender: ", error);
              Alert.alert("Erro", "Falha ao processar a venda.");
            }
          }
        }
      ]
    );
  };


  // --- RENDERIZAÇÃO DA TELA ---

  const renderItemVariacao = ({ item }) => (
    <View style={styles.variacaoItem}>
      <View>
        <Text style={styles.variacaoTamanho}>Tamanho: {item.tamanho}</Text>
        {item.estoque > 0 ? (
          <Text style={styles.estoqueDisponivel}>
            {item.estoque} disponíveis fisicamente
          </Text>
        ) : (
          <Text style={styles.estoqueIndisponivel}>Estoque Zerado</Text>
        )}
      </View>
      <View style={styles.vendaButtonContainer}>
        <Button
          title="Solicitar" 
          onPress={() => handleSolicitar(item)} 
          disabled={item.estoque === 0}
          color={isDarkMode ? "#5865F2" : "#007bff"} 
        />
      </View>
    </View>
  );

  const renderSolicitacoesConcorrentes = () => {
    if (solicitacoesAtivas.length === 0) return null;

    const usuarioLogado = auth.currentUser; // Pega quem está usando o app agora

    return (
      <View style={styles.concorrentesContainer}>
        <Text style={styles.concorrentesTitle}>⚠️ Solicitações em Andamento:</Text>
        
        {solicitacoesAtivas.map((sol, index) => {
          // A REGRA DE NEGÓCIO: Só é dono se o email bater
          const isDonoDaSolicitacao = usuarioLogado && sol.usuario_email === usuarioLogado.email;

          return (
            <View key={index} style={styles.concorrenteItem}>
              <View style={styles.concorrenteInfo}>
                  <Text style={styles.concorrenteTexto}>
                    👤 <Text style={{fontWeight: 'bold'}}>{isDonoDaSolicitacao ? 'Você' : sol.usuario_email}</Text>
                  </Text>
                  <Text style={styles.concorrenteTexto}>
                    📦 {sol.quantidade} par (Tam: {sol.tamanho})
                  </Text>
              </View>
              
              {/* RENDERIZAÇÃO CONDICIONAL: Só mostra os botões se for o dono */}
              {isDonoDaSolicitacao ? (
                <View style={styles.actionRow}>
                    <Pressable 
                        style={[styles.actionBtn, styles.btnDevolver]} 
                        onPress={() => handleDevolver(sol.id)}
                    >
                        <Text style={styles.btnDevolverText}>Devolver</Text>
                    </Pressable>

                    <Pressable 
                        style={[styles.actionBtn, styles.btnVender]} 
                        onPress={() => handleVender(sol)}
                    >
                        <Text style={styles.btnVenderText}>Vender</Text>
                    </Pressable>
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: '#DA373C', fontStyle: 'italic', marginTop: 5 }}>
                  🔒 Aguardando ação deste usuário
                </Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDarkMode ? "#5865F2" : "#0000ff"} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Tentar Novamente" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      {produto && (
        <Text style={styles.title}>{produto.nome}</Text>
      )}
      
      <FlatList
        data={variacoes}
        renderItem={renderItemVariacao}
        keyExtractor={(item) => item.id}
        style={styles.list}
        scrollEnabled={false} 
      />

      {renderSolicitacoesConcorrentes()}

      <View style={{ marginTop: 20, width: '100%' }}>
        <Button title="Voltar" onPress={() => navigation.goBack()} color={isDarkMode ? "#888" : undefined}/>
      </View>
    </ScrollView>
  );
}

const getDynamicStyles = (isDarkMode) => {
  const colors = {
    background: isDarkMode ? '#313338' : '#f5f5f5',
    card: isDarkMode ? '#2B2D31' : '#ffffff',
    text: isDarkMode ? '#F2F3F5' : '#000000',
    border: isDarkMode ? '#1E1F22' : '#eeeeee',
    success: isDarkMode ? '#23A559' : 'green',
    danger: isDarkMode ? '#DA373C' : 'red',
    warningBg: isDarkMode ? '#3C3020' : '#fff3cd', 
    warningBorder: isDarkMode ? '#FEE75C' : '#ffeeba'
  };

  return StyleSheet.create({
    scrollContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      justifyContent: 'flex-start',
      alignItems: 'center',
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      marginTop: 10,
      textAlign: 'center',
      color: colors.text,
    },
    errorText: {
      fontSize: 18,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: 15,
    },
    list: {
      width: '100%',
    },
    variacaoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 8,
      marginBottom: 10,
    },
    variacaoTamanho: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text, 
    },
    estoqueDisponivel: {
      fontSize: 14,
      color: colors.success, 
      marginTop: 4,
    },
    estoqueIndisponivel: {
      fontSize: 14,
      color: colors.danger,
      marginTop: 4,
    },
    vendaButtonContainer: {
      width: 100, 
    },
    concorrentesContainer: {
      width: '100%',
      marginTop: 20,
      padding: 15,
      backgroundColor: colors.warningBg,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.warningBorder,
    },
    concorrentesTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    concorrenteItem: {
      marginBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    concorrenteInfo: {
        marginBottom: 10,
    },
    concorrenteTexto: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    // ESTILOS DOS NOVOS BOTÕES DE DEVOLVER/VENDER
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDevolver: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.danger,
        marginRight: 5,
    },
    btnDevolverText: {
        color: colors.danger,
        fontWeight: 'bold',
    },
    btnVender: {
        backgroundColor: colors.success,
        marginLeft: 5,
    },
    btnVenderText: {
        color: '#fff',
        fontWeight: 'bold',
    }
  });
};