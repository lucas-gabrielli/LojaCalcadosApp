import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Pressable
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { auth } from './firebaseConfig';
// ADR-001: esta tela não fala mais com o Firestore nem contém regra de negócio.
import {
  assinarPendentesDoVendedor,
  buscarVariacao,
  aplicarEscritas
} from './dados/solicitacoesRepo';
import { planejarVenda, planejarCancelamento, calcularMinutosDesde, classificarUrgencia } from './dominio/solicitacao';

import { ThemeContext } from './ThemeContext';
import { getSolicitacoesStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

const formatarTempoDecorrido = (data, agora = new Date()) => {
  if (!data) return '';
  const segundos = Math.floor((agora.getTime() - data.getTime()) / 1000);
  if (segundos < 60) return 'agora mesmo';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h${minutos % 60 > 0 ? ` ${minutos % 60}min` : ''}`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias > 1 ? 's' : ''}`;
};

const INTERVALO_TICK_MS = 30000;

export default function SolicitacoesScreen() {
  const [loading, setLoading] = useState(true);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState([]);
  // Sem este tick, "há X min" e a cor de urgência ficavam congelados no valor
  // calculado quando o Firestore mandou a lista — um pedido parado nunca
  // esquentava sozinho.
  const [agora, setAgora] = useState(() => new Date());

  const { isDarkMode } = useContext(ThemeContext);
  const styles = getSolicitacoesStyles(isDarkMode);
  const { alert, showAlert } = useAppAlert();

  // 1. BUSCA AS SOLICITAÇÕES PENDENTES EM TEMPO REAL
  useEffect(() => {
    const usuarioLogado = auth.currentUser;
    if (!usuarioLogado) return;

    const unsubscribe = assinarPendentesDoVendedor(
      usuarioLogado.email,
      (lista) => {
        setSolicitacoesPendentes(
          lista.map((sol) => ({
            ...sol,
            dataSolicitacaoFormatada: sol.dataSolicitacao
              ? sol.dataSolicitacao.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
              : '--/--/----',
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), INTERVALO_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // 2. DEVOLVER — quem decide é dominio/solicitacao.js, quem grava é o repositório.
  const handleDevolver = async (solicitacao) => {
    showAlert({
      type: 'danger',
      title: 'Devolver Tênis',
      message: 'O cliente desistiu? Isso irá cancelar a solicitação.',
      actions: [
        { label: 'Voltar', style: 'cancel' },
        {
          label: 'Devolver',
          style: 'destructive',
          onPress: async () => {
            const plano = planejarCancelamento(solicitacao);
            if (!plano.ok) {
              showAlert({ type: 'warning', title: 'Não é possível devolver', message: plano.mensagem, actions: [{ label: 'OK' }] });
              return;
            }
            try {
              await aplicarEscritas(plano.escritas);
            } catch (error) {
              console.error("Erro ao devolver: ", error);
              showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao devolver o produto.', actions: [{ label: 'OK' }] });
            }
          }
        }
      ],
    });
  };

  // 3. VENDER — a regra (e a revalidação de estoque) vive no domínio.
  const handleVender = async (solicitacao) => {
    showAlert({
      type: 'success',
      title: 'Confirmar Venda',
      message: `Finalizar a venda de ${solicitacao.nomeProduto} (Tam: ${solicitacao.tamanho})?`,
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        {
          label: 'Vender',
          onPress: async () => {
            try {
              const variacao = await buscarVariacao(solicitacao.variacao_id);
              const plano = planejarVenda(solicitacao, variacao);
              if (!plano.ok) {
                showAlert({ type: 'warning', title: 'Não é possível vender', message: plano.mensagem, actions: [{ label: 'OK' }] });
                return;
              }
              await aplicarEscritas(plano.escritas);
              showAlert({ type: 'success', title: 'Sucesso', message: 'Venda finalizada e estoque atualizado!', actions: [{ label: 'OK' }] });
            } catch (error) {
              console.error("Erro ao vender: ", error);
              showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao processar a venda.', actions: [{ label: 'OK' }] });
            }
          }
        }
      ],
    });
  };

  const renderItem = ({ item }) => {
    const urgencia = classificarUrgencia(calcularMinutosDesde(item.dataSolicitacao, agora));
    const tempoDecorrido = formatarTempoDecorrido(item.dataSolicitacao, agora);
    return (
    <View style={[
      styles.card,
      urgencia === 'atencao' && styles.cardAtencao,
      urgencia === 'critico' && styles.cardCritico,
    ]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
            <Text style={styles.produtoNome} numberOfLines={1}>{item.nomeProduto}</Text>
            <Text style={styles.produtoDetalhes}>Tam: {item.tamanho}  •  Qtd: {item.quantidade}</Text>
            <View style={styles.tempoDecorridoRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={urgencia === 'critico' ? styles.tempoDecorridoTextCritico.color : styles.tempoDecorridoText.color}
              />
              <Text style={[styles.tempoDecorridoText, urgencia === 'critico' && styles.tempoDecorridoTextCritico]}>
                {tempoDecorrido}
              </Text>
            </View>
        </View>
        <Text style={styles.tempoBadge}>{item.dataSolicitacaoFormatada}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable 
            style={[styles.btnAction, styles.btnDevolver]} 
            onPress={() => handleDevolver(item)}
        >
            <Ionicons name="close-circle-outline" size={20} color={styles.btnDevolverText.color} />
            <Text style={styles.btnDevolverText}>Devolver</Text>
        </Pressable>

        <Pressable 
            style={[styles.btnAction, styles.btnVender]} 
            onPress={() => handleVender(item)}
        >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.btnVenderText}>Vender</Text>
        </Pressable>
      </View>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Solicitações Ativas</Text>
      <Text style={styles.subtitle}>Produtos separados aguardando finalização</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#5865F2" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={solicitacoesPendentes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          extraData={agora}
          contentContainerStyle={{ paddingBottom: 130 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="bag-check-outline" size={60} color={isDarkMode ? '#444' : '#ccc'} />
                <Text style={styles.listaVazia}>Você não tem nenhuma separação pendente.</Text>
            </View>
          }
        />
      )}
      <AppAlert {...alert} />
    </View>
  );
}
