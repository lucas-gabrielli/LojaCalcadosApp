import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
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
import {
  agruparPorCor,
  normalizarCor,
  tamanhosDaCor,
  encontrarVariacao,
  escolhaInicial,
  tamanhoAoTrocarCor,
  limitarQuantidade,
  descreverItem,
} from './dominio/variacoes';
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

  // Seleção no modelo do Shopee: uma cor, uma numeração e uma quantidade.
  const [corSelecionada, setCorSelecionada] = useState(null);
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState(1);
  // O onSnapshot reemite a cada mudança de estoque. Sem esta trava, a venda de
  // um par feita por outro vendedor jogaria a seleção do usuário de volta ao
  // início no meio do atendimento.
  const selecaoIniciada = useRef(false);

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

  // Abre já na cor e na numeração do par que foi escaneado. Só volta a mexer na
  // seleção se a cor escolhida sumir do catálogo (variação apagada no estoque)
  // — aí a tela ficaria travada num seletor sem numeração nenhuma.
  useEffect(() => {
    if (variacoes.length === 0) return;
    const corAindaExiste =
      corSelecionada !== null &&
      variacoes.some((v) => normalizarCor(v.cor) === corSelecionada);
    if (selecaoIniciada.current && corAindaExiste) return;

    const inicial = escolhaInicial(variacoes, qrCode);
    setCorSelecionada(inicial.cor);
    setTamanhoSelecionado(inicial.tamanho);
    setQuantidade(1);
    selecaoIniciada.current = true;
  }, [variacoes, qrCode, corSelecionada]);

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

  // --- Seleção de cor × numeração --------------------------------------------

  const gruposDeCor = useMemo(() => agruparPorCor(variacoes), [variacoes]);
  const tamanhosDisponiveis = useMemo(
    () => tamanhosDaCor(variacoes, corSelecionada),
    [variacoes, corSelecionada]
  );
  const variacaoSelecionada = useMemo(
    () => encontrarVariacao(variacoes, corSelecionada, tamanhoSelecionado),
    [variacoes, corSelecionada, tamanhoSelecionado]
  );

  const estoqueSelecionado = Number(variacaoSelecionada?.estoque) || 0;
  // A quantidade é derivada, não só guardada: se o estoque cair por baixo dela
  // enquanto a tela está aberta, o número na tela desce junto.
  const quantidadeEfetiva = limitarQuantidade(quantidade, estoqueSelecionado);
  const situacaoSelecionada = classificarEstoque(estoqueSelecionado);
  const temMaisDeUmaCor = gruposDeCor.length > 1;

  const selecionarCor = (cor) => {
    setCorSelecionada(cor);
    setTamanhoSelecionado(tamanhoAoTrocarCor(variacoes, cor, tamanhoSelecionado));
    setQuantidade(1);
  };

  const selecionarTamanho = (tamanho) => {
    setTamanhoSelecionado(tamanho);
    setQuantidade(1);
  };

  const ajustarQuantidade = (delta) => {
    setQuantidade(limitarQuantidade(quantidadeEfetiva + delta, estoqueSelecionado));
  };

  const handleSolicitar = async () => {
    if (!variacaoSelecionada) {
      showAlert({ type: 'warning', title: 'Escolha uma opção', message: 'Selecione a cor e a numeração antes de adicionar à sacola.', actions: [{ label: 'OK' }] });
      return;
    }
    if (estoqueSelecionado <= 0) {
      showAlert({ type: 'warning', title: 'Indisponível', message: 'Este produto está sem estoque físico!', actions: [{ label: 'OK' }] });
      return;
    }

    const nomeCompleto = descreverItem(produto.nome, variacaoSelecionada.cor, variacaoSelecionada.tamanho);

    showAlert({
      type: 'info',
      title: 'Adicionar à Sacola',
      message: `Colocar ${quantidadeEfetiva} ${quantidadeEfetiva === 1 ? 'par' : 'pares'} de [${nomeCompleto}] na sacola de solicitações?`,
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        {
          label: 'Adicionar',
          onPress: async () => {
            try {
              const itemSacola = {
                id_unico: Date.now().toString(),
                produto_id: variacaoSelecionada.produto_id,
                variacao_id: variacaoSelecionada.id,
                qrCode: variacaoSelecionada.qr_code,
                nomeProduto: nomeCompleto,
                // Campos soltos: a Sacola e os Relatórios mostram o tênis em
                // partes (foto, nome, cor, numeração) em vez de um texto só.
                nomeBase: produto.nome,
                imagemUrl: variacaoSelecionada.imagemUrl || produto.imagemUrl || null,
                tamanho: variacaoSelecionada.tamanho,
                cor: variacaoSelecionada.cor || 'Única',
                quantidade: quantidadeEfetiva
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

  const renderSeletorDeCor = () => {
    // Produto de cor única não ganha um seletor com uma opção só.
    if (!temMaisDeUmaCor) return null;
    return (
      <View style={styles.opcaoBloco}>
        <Text style={styles.opcaoLabel}>Cor</Text>
        <View style={styles.opcaoLista}>
          {gruposDeCor.map((grupo) => {
            const ativa = grupo.cor === corSelecionada;
            const esgotada = grupo.estoqueTotal <= 0;
            return (
              <TouchableOpacity
                key={grupo.cor}
                style={[styles.corChip, ativa && styles.corChipAtiva, esgotada && styles.opcaoChipEsgotada]}
                onPress={() => selecionarCor(grupo.cor)}
                accessibilityLabel={`Cor ${grupo.cor}`}
                accessibilityState={{ selected: ativa }}
              >
                <View style={styles.corChipThumb}>
                  {grupo.imagemUrl ? (
                    <Image source={{ uri: grupo.imagemUrl }} style={styles.corChipImagem} resizeMode="cover" />
                  ) : (
                    <Ionicons name="footsteps-outline" size={14} color={placeholderIconColor} />
                  )}
                </View>
                <Text
                  style={[styles.corChipTexto, ativa && styles.opcaoChipTextoAtivo, esgotada && styles.opcaoChipTextoEsgotado]}
                  numberOfLines={1}
                >
                  {grupo.cor}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSeletorDeTamanho = () => (
    <View style={styles.opcaoBloco}>
      <Text style={styles.opcaoLabel}>Tamanho</Text>
      {tamanhosDisponiveis.length === 0 ? (
        <Text style={styles.opcaoVazia}>Nenhuma numeração cadastrada para esta cor.</Text>
      ) : (
        <View style={styles.opcaoLista}>
          {tamanhosDisponiveis.map((item) => {
            const ativo = String(item.tamanho) === String(tamanhoSelecionado);
            const esgotado = (Number(item.estoque) || 0) <= 0;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.tamanhoChip, ativo && styles.corChipAtiva, esgotado && styles.opcaoChipEsgotada]}
                onPress={() => selecionarTamanho(item.tamanho)}
                accessibilityLabel={`Numeração ${item.tamanho}`}
                accessibilityState={{ selected: ativo, disabled: esgotado }}
              >
                <Text
                  style={[styles.tamanhoChipTexto, ativo && styles.opcaoChipTextoAtivo, esgotado && styles.opcaoChipTextoEsgotado]}
                >
                  {item.tamanho}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderSeletorDeQuantidade = () => (
    <View style={styles.opcaoBloco}>
      <Text style={styles.opcaoLabel}>Quantidade</Text>
      <View style={styles.quantidadeLinha}>
        <View style={styles.quantidadeStepper}>
          <TouchableOpacity
            style={[styles.quantidadeBotao, quantidadeEfetiva <= 1 && styles.quantidadeBotaoDesabilitado]}
            onPress={() => ajustarQuantidade(-1)}
            disabled={quantidadeEfetiva <= 1}
            accessibilityLabel="Diminuir quantidade"
          >
            <Ionicons name="remove" size={18} color={isDarkMode ? '#F2F3F5' : '#111'} />
          </TouchableOpacity>
          <Text style={styles.quantidadeValor}>{quantidadeEfetiva}</Text>
          <TouchableOpacity
            style={[styles.quantidadeBotao, quantidadeEfetiva >= estoqueSelecionado && styles.quantidadeBotaoDesabilitado]}
            onPress={() => ajustarQuantidade(1)}
            disabled={quantidadeEfetiva >= estoqueSelecionado}
            accessibilityLabel="Aumentar quantidade"
          >
            <Ionicons name="add" size={18} color={isDarkMode ? '#F2F3F5' : '#111'} />
          </TouchableOpacity>
        </View>

        {situacaoSelecionada === 'zerado' ? (
          <Text style={styles.estoqueIndisponivel}>Esgotado nesta opção</Text>
        ) : (
          <Text style={styles.estoqueDisponivel}>{estoqueSelecionado} disponíveis</Text>
        )}
      </View>

      {situacaoSelecionada === 'baixo' && (
        <View style={styles.tagEstoqueBaixo}>
          <Text style={styles.tagEstoqueBaixoText}>Estoque baixo</Text>
        </View>
      )}
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
                  <Text style={styles.concorrenteTexto}>📦 {sol.quantidade} par (Tam: {sol.tamanho}{sol.cor ? ` · ${sol.cor}` : ''})</Text>
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

  // Imagem de destaque: acompanha a cor escolhida — é o que faz o mesmo modelo
  // em outra cor aparecer sem trocar de tela. Sem foto por cor, cai para a do
  // produto e, por último, para a primeira variação que tiver alguma.
  const corEmDestaque = gruposDeCor.find((g) => g.cor === corSelecionada);
  const imagemDestaque =
    corEmDestaque?.imagemUrl || produto?.imagemUrl || variacoes.find((v) => v.imagemUrl)?.imagemUrl;

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
          {temMaisDeUmaCor && (
            <Text style={styles.subtitulo}>
              {gruposDeCor.length} cores deste modelo
            </Text>
          )}
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

        <View style={styles.seletorCard}>
          {renderSeletorDeCor()}
          {renderSeletorDeTamanho()}
          {renderSeletorDeQuantidade()}

          <TouchableOpacity
            style={[styles.btnAdicionar, estoqueSelecionado === 0 && styles.btnAdicionarDisabled]}
            onPress={handleSolicitar}
            disabled={estoqueSelecionado === 0}
          >
            <Ionicons name="bag-add-outline" size={20} color="#fff" />
            <Text style={styles.btnAdicionarText}>Adicionar à Sacola</Text>
          </TouchableOpacity>
        </View>

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
