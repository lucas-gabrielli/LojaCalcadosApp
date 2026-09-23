import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import { Text, View, Image, ActivityIndicator, TouchableOpacity, FlatList, ScrollView, Pressable, useWindowDimensions } from 'react-native';
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
  gradeDeTamanhos,
  contarTamanhosDisponiveis,
  encontrarVariacao,
  escolhaInicial,
  tamanhoAoTrocarCor,
  limitarQuantidade,
  descreverItem,
} from './dominio/variacoes';
import { galeriaDoGrupo, extrairImagens } from './dominio/galeria';
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
  // A largura do slide é a da tela menos o padding de 20 de cada lado do
  // container. Vem do hook (e não de Dimensions.get) para o carrossel não
  // ficar torto quando o aparelho gira.
  const { width: larguraJanela } = useWindowDimensions();
  const larguraSlide = Math.max(1, larguraJanela - 40);

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
  const [fotoAtual, setFotoAtual] = useState(0);
  const carrosselRef = useRef(null);
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
            // variação — é lá que a foto por cor é cadastrada. As duas leituras
            // passam pelo domínio para aceitar tanto `imagemUrl` quanto a
            // lista nova `imagens`.
            imagemUrl: extrairImagens(produtoSnap.data())[0] || extrairImagens(variacao)[0] || null,
            qrCode: variacao.qr_code,
            cor: variacao.cor ? normalizarCor(variacao.cor) : null,
            tamanho: variacao.tamanho,
            estoque: Number(variacao.estoque) || 0,
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
  const grupoEmDestaque = useMemo(
    () => gruposDeCor.find((g) => g.cor === corSelecionada) || null,
    [gruposDeCor, corSelecionada]
  );
  // A grade vai de 36 a 45 mesmo sem cadastro — quem não existe aparece
  // apagado. Ver dominio/variacoes.js.
  const gradeTamanhos = useMemo(
    () => gradeDeTamanhos(variacoes, corSelecionada),
    [variacoes, corSelecionada]
  );
  const totalTamanhosDisponiveis = contarTamanhosDisponiveis(gradeTamanhos);
  const fotos = useMemo(
    () => galeriaDoGrupo(produto, grupoEmDestaque, gruposDeCor),
    [produto, grupoEmDestaque, gruposDeCor]
  );
  const variacaoSelecionada = useMemo(
    () => encontrarVariacao(variacoes, corSelecionada, tamanhoSelecionado),
    [variacoes, corSelecionada, tamanhoSelecionado]
  );

  // Trocou de cor (ou o cadastro de fotos mudou) → o carrossel volta para a
  // primeira foto. Sem isto, sair da foto 4 de uma cor para uma cor com 2
  // fotos deixaria o carrossel parado num vazio.
  useEffect(() => {
    setFotoAtual(0);
    carrosselRef.current?.scrollTo({ x: 0, animated: false });
  }, [corSelecionada, fotos.length]);

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
                imagemUrl: extrairImagens(variacaoSelecionada)[0] || extrairImagens(produto)[0] || null,
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

  // Carrossel de fotos da cor escolhida. A lista vem pronta do domínio
  // (dominio/galeria.js) — aqui é só arrastar, contar e destacar.
  const aoSoltarCarrossel = (evento) => {
    const posicao = evento.nativeEvent.contentOffset.x;
    const indice = Math.round(posicao / larguraSlide);
    setFotoAtual(Math.min(Math.max(indice, 0), Math.max(fotos.length - 1, 0)));
  };

  const irParaFoto = (indice) => {
    setFotoAtual(indice);
    carrosselRef.current?.scrollTo({ x: indice * larguraSlide, animated: true });
  };

  const renderCarrossel = () => {
    if (fotos.length === 0) {
      return (
        <View style={styles.imageWrapper}>
          <Ionicons name="footsteps-outline" size={64} color={placeholderIconColor} />
          <Text style={styles.imagePlaceholderText}>Sem foto cadastrada</Text>
        </View>
      );
    }

    return (
      <View style={styles.carrossel}>
        <View style={styles.carrosselMoldura}>
          <ScrollView
            ref={carrosselRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={aoSoltarCarrossel}
            scrollEnabled={fotos.length > 1}
          >
            {fotos.map((uri, indice) => (
              <View key={`${uri}-${indice}`} style={[styles.carrosselSlide, { width: larguraSlide }]}>
                <Image source={{ uri }} style={styles.carrosselImagem} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>

          {/* Uma foto só não precisa de contador nem de pontinhos. */}
          {fotos.length > 1 && (
            <>
              <View style={styles.carrosselContador} pointerEvents="none">
                <Text style={styles.carrosselContadorTexto}>{fotoAtual + 1}/{fotos.length}</Text>
              </View>
              <View style={styles.carrosselPontos} pointerEvents="none">
                {fotos.map((uri, indice) => (
                  <View
                    key={`ponto-${uri}-${indice}`}
                    style={[styles.carrosselPonto, indice === fotoAtual && styles.carrosselPontoAtivo]}
                  />
                ))}
              </View>
            </>
          )}
        </View>

        {fotos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.miniaturas}>
            {fotos.map((uri, indice) => (
              <TouchableOpacity
                key={`mini-${uri}-${indice}`}
                style={[styles.miniatura, indice === fotoAtual && styles.miniaturaAtiva]}
                onPress={() => irParaFoto(indice)}
                accessibilityLabel={`Ver foto ${indice + 1} de ${fotos.length}`}
                accessibilityState={{ selected: indice === fotoAtual }}
              >
                <Image source={{ uri }} style={styles.miniaturaImagem} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

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

  // A grade inteira (36 a 45) aparece sempre. Verde = tem par; apagado = a
  // numeração existe no modelo mas zerou; mais apagado ainda e sem toque = a
  // loja não trabalha essa numeração nesta cor.
  const renderChipDeTamanho = (item) => {
    const ativo = item.cadastrado && String(item.tamanho) === String(tamanhoSelecionado);
    const temPar = item.situacao === 'disponivel' || item.situacao === 'baixo';

    const descricao = !item.cadastrado
      ? `Numeração ${item.chave}, não trabalhada neste modelo`
      : temPar
        ? `Numeração ${item.chave}, ${item.estoque} ${item.estoque === 1 ? 'par disponível' : 'pares disponíveis'}`
        : `Numeração ${item.chave}, esgotada`;

    return (
      <TouchableOpacity
        key={item.chave}
        style={[
          styles.tamanhoChip,
          temPar && styles.tamanhoChipDisponivel,
          item.situacao === 'esgotado' && styles.tamanhoChipEsgotado,
          item.situacao === 'indisponivel' && styles.tamanhoChipIndisponivel,
          ativo && styles.tamanhoChipAtivo,
        ]}
        onPress={() => selecionarTamanho(item.tamanho)}
        disabled={!item.cadastrado}
        accessibilityLabel={descricao}
        accessibilityRole="button"
        accessibilityState={{ selected: ativo, disabled: !item.cadastrado }}
      >
        <Text
          style={[
            styles.tamanhoChipTexto,
            temPar && styles.tamanhoChipTextoDisponivel,
            item.situacao === 'esgotado' && styles.tamanhoChipTextoEsgotado,
            item.situacao === 'indisponivel' && styles.tamanhoChipTextoIndisponivel,
            ativo && styles.tamanhoChipTextoAtivo,
          ]}
        >
          {item.chave}
        </Text>
        {/* Só as últimas unidades ganham o selo — em estoque normal ele seria
            ruído em cima de dez chips iguais. */}
        {item.situacao === 'baixo' && !ativo && (
          <View style={styles.tamanhoChipSelo}>
            <Text style={styles.tamanhoChipSeloTexto}>{item.estoque}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderSeletorDeTamanho = () => (
    <View style={styles.opcaoBloco}>
      <View style={styles.opcaoCabecalho}>
        <Text style={styles.opcaoLabel}>Numeração</Text>
        <Text style={[styles.opcaoResumo, totalTamanhosDisponiveis === 0 && styles.opcaoResumoVazio]}>
          {totalTamanhosDisponiveis === 0
            ? 'nenhuma disponível'
            : `${totalTamanhosDisponiveis} ${totalTamanhosDisponiveis === 1 ? 'disponível' : 'disponíveis'}`}
        </Text>
      </View>

      <View style={styles.tamanhoGrade}>{gradeTamanhos.map(renderChipDeTamanho)}</View>

      <View style={styles.legenda}>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaPonto, styles.legendaPontoDisponivel]} />
          <Text style={styles.legendaTexto}>Disponível</Text>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaPonto, styles.legendaPontoEsgotado]} />
          <Text style={styles.legendaTexto}>Esgotada</Text>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.legendaPonto, styles.legendaPontoIndisponivel]} />
          <Text style={styles.legendaTexto}>Não trabalhada</Text>
        </View>
      </View>
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

  const renderOutroProduto = ({ item }) => {
    // O selo de estoque vem sobre a foto porque é ele que decide se vale a
    // pena abrir o produto — o nome sozinho não diz se dá para vender hoje.
    const poucos = classificarEstoque(item.estoque) === 'baixo';
    return (
      <TouchableOpacity
        style={styles.similarCard}
        onPress={() => navigation.push('Produto', { qrCode: item.qrCode })}
        accessibilityRole="button"
        accessibilityLabel={`${item.nome}, numeração ${item.tamanho}, ${item.estoque} em estoque`}
      >
        <View style={styles.similarImageWrapper}>
          {item.imagemUrl ? (
            <Image source={{ uri: item.imagemUrl }} style={styles.productImage} resizeMode="cover" />
          ) : (
            <Ionicons name="footsteps-outline" size={32} color={placeholderIconColor} />
          )}
          <View style={[styles.similarSelo, poucos && styles.similarSeloBaixo]}>
            <Ionicons
              name={poucos ? 'alert-circle' : 'checkmark-circle'}
              size={11}
              color={poucos ? styles.similarSeloTextoBaixo.color : styles.similarSeloTexto.color}
            />
            <Text style={[styles.similarSeloTexto, poucos && styles.similarSeloTextoBaixo]}>
              {poucos ? `últimos ${item.estoque}` : `${item.estoque} em estoque`}
            </Text>
          </View>
        </View>
        <View style={styles.similarInfo}>
          <Text style={styles.similarNome} numberOfLines={2}>{item.nome}</Text>
          <View style={styles.similarMeta}>
            <View style={styles.similarTag}>
              <Text style={styles.similarTagTexto}>Tam {item.tamanho}</Text>
            </View>
            {item.cor && (
              <View style={styles.similarTag}>
                <Text style={styles.similarTagTexto} numberOfLines={1}>{item.cor}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOutrosProdutos = () => (
    <>
      <View style={styles.secaoCabecalho}>
        <Text style={styles.sectionTitle}>Outros produtos disponíveis</Text>
        {!carregandoOutros && outrosProdutos.length > 0 && (
          <View style={styles.secaoContagem}>
            <Text style={styles.secaoContagemTexto}>{outrosProdutos.length}</Text>
          </View>
        )}
      </View>
      <Text style={styles.secaoSubtitulo}>Com par pronto para entrega agora</Text>

      <View style={styles.similaresContainer}>
        {carregandoOutros ? (
          <View style={styles.similaresCarregando}>
            <ActivityIndicator size="small" color="#5865F2" />
            <Text style={styles.similaresCarregandoTexto}>Procurando no estoque…</Text>
          </View>
        ) : outrosProdutos.length === 0 ? (
          <View style={styles.similaresVazio}>
            <Ionicons name="file-tray-outline" size={28} color={placeholderIconColor} />
            <Text style={styles.similaresVazioTexto}>
              Nenhum outro produto com estoque no momento.
            </Text>
          </View>
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
    </>
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

  return (
    <View style={styles.scrollContainer}>
      <Header />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {renderCarrossel()}

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

        {renderOutrosProdutos()}
      </ScrollView>
      <AppAlert {...alert} />
    </View>
  );
}
