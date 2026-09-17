import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Pressable
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { db, auth } from './firebaseConfig';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  Timestamp,
  orderBy
} from 'firebase/firestore';

import { ThemeContext } from './ThemeContext';
import { getSolicitacoesStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

const formatarTempoDecorrido = (timestamp) => {
  if (!timestamp) return '';
  const segundos = Math.floor((Date.now() - timestamp.seconds * 1000) / 1000);
  if (segundos < 60) return 'agora mesmo';
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas}h${minutos % 60 > 0 ? ` ${minutos % 60}min` : ''}`;
  const dias = Math.floor(horas / 24);
  return `há ${dias} dia${dias > 1 ? 's' : ''}`;
};

export default function SolicitacoesScreen() {
  const [loading, setLoading] = useState(true);
  const [solicitacoesPendentes, setSolicitacoesPendentes] = useState([]);

  const { isDarkMode } = useContext(ThemeContext);
  const styles = getSolicitacoesStyles(isDarkMode);
  const { alert, showAlert } = useAppAlert();

  // 1. BUSCA AS SOLICITAÇÕES PENDENTES EM TEMPO REAL
  useEffect(() => {
    const usuarioLogado = auth.currentUser;
    if (!usuarioLogado) return;

    const solicitacoesRef = collection(db, 'solicitacoes');
    
    const q = query(
      solicitacoesRef,
      where('usuario_email', '==', usuarioLogado.email),
      where('status', '==', 'pendente'),
      orderBy('dataSolicitacao', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dataFormatada = data.dataSolicitacao 
          ? new Date(data.dataSolicitacao.seconds * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          : '--/--/----';
        
        lista.push({
          id: doc.id,
          ...data,
          dataSolicitacaoFormatada: dataFormatada,
          tempoDecorrido: formatarTempoDecorrido(data.dataSolicitacao),
        });
      });
      setSolicitacoesPendentes(lista);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar pendentes: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. FUNÇÃO DE DEVOLVER (CANCELA A SOLICITAÇÃO)
  const handleDevolver = async (solicitacaoId) => {
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
            try {
              const solRef = doc(db, 'solicitacoes', solicitacaoId);
              await updateDoc(solRef, { status: 'cancelada' });
            } catch (error) {
              console.error("Erro ao devolver: ", error);
              showAlert({ type: 'danger', title: 'Erro', message: 'Falha ao devolver o produto.', actions: [{ label: 'OK' }] });
            }
          }
        }
      ],
    });
  };

  // 3. FUNÇÃO DE VENDER (BAIXA NO ESTOQUE)
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
              const solRef = doc(db, 'solicitacoes', solicitacao.id);
              await updateDoc(solRef, { status: 'vendida', dataVenda: Timestamp.now() });

              const varRef = doc(db, 'variacoes', solicitacao.variacao_id);
              await updateDoc(varRef, {
                estoque: increment(-solicitacao.quantidade)
              });

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

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
            <Text style={styles.produtoNome} numberOfLines={1}>{item.nomeProduto}</Text>
            <Text style={styles.produtoDetalhes}>Tam: {item.tamanho}  •  Qtd: {item.quantidade}</Text>
            <View style={styles.tempoDecorridoRow}>
              <Ionicons name="time-outline" size={14} color={styles.tempoDecorridoText.color} />
              <Text style={styles.tempoDecorridoText}>{item.tempoDecorrido}</Text>
            </View>
        </View>
        <Text style={styles.tempoBadge}>{item.dataSolicitacaoFormatada}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable 
            style={[styles.btnAction, styles.btnDevolver]} 
            onPress={() => handleDevolver(item.id)}
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
