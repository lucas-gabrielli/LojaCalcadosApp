import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { buscarDetalhesDeVariacoes } from './dados/estoqueRepo';
import { detalhesDoItem } from './dominio/variacoes';
import { ThemeContext } from './ThemeContext';
import { getSacolaStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

export default function SacolaScreen({ navigation }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getSacolaStyles(isDarkMode);
  const [sacola, setSacola] = useState([]);
  // Foto e QR Code das variações, por id. Itens adicionados antes desta tela
  // existir não têm a foto gravada — ela é buscada aqui.
  const [detalhesPorVariacao, setDetalhesPorVariacao] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alert, showAlert } = useAppAlert();

  // Recarrega a sacola sempre que o usuário abre esta aba
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      const loadSacola = async () => {
        const dados = await AsyncStorage.getItem('@sacola_pedidos');
        const itens = dados ? JSON.parse(dados) : [];
        if (!ativo) return;
        setSacola(itens);

        const faltantes = itens.filter((i) => !i.imagemUrl || !i.qrCode).map((i) => i.variacao_id);
        if (faltantes.length === 0) return;
        const detalhes = await buscarDetalhesDeVariacoes(faltantes);
        if (ativo) setDetalhesPorVariacao((atual) => ({ ...atual, ...detalhes }));
      };
      loadSacola();
      return () => { ativo = false; };
    }, [])
  );

  const removerItem = async (id_unico) => {
    const novaSacola = sacola.filter(item => item.id_unico !== id_unico);
    setSacola(novaSacola);
    await AsyncStorage.setItem('@sacola_pedidos', JSON.stringify(novaSacola));
  };

  // A Sacola é uma aba, não uma tela da pilha do Início: para chegar no
  // detalhe do produto é preciso entrar na aba Início e empilhar lá dentro.
  const abrirProduto = (qrCode) => {
    if (!qrCode) return;
    navigation.navigate('Início', { screen: 'Produto', params: { qrCode } });
  };

  const enviarPedidos = async () => {
    if (sacola.length === 0) return;
    setIsSubmitting(true);
    try {
      const usuarioLogado = auth.currentUser;
      const logRef = collection(db, 'solicitacoes');

      // Faz um loop enviando todos os itens separadamente para o Firebase
      await Promise.all(sacola.map(async (item) => {
        await addDoc(logRef, {
          produto_id: item.produto_id,
          variacao_id: item.variacao_id,
          qrCode: item.qrCode || detalhesPorVariacao[item.variacao_id]?.qrCode || null,
          nomeProduto: item.nomeProduto,
          // Vai junto para o relatório montar o card do tênis sem reler o banco.
          nomeBase: detalhesDoItem(item).nome,
          imagemUrl: item.imagemUrl || detalhesPorVariacao[item.variacao_id]?.imagemUrl || null,
          tamanho: item.tamanho,
          cor: item.cor,
          dataSolicitacao: Timestamp.now(),
          status: 'pendente',
          usuario_email: usuarioLogado ? usuarioLogado.email : 'Desconhecido',
          quantidade: item.quantidade
        });
      }));

      // Limpa a sacola após o sucesso
      await AsyncStorage.removeItem('@sacola_pedidos');
      setSacola([]);
      showAlert({ type: 'success', title: 'Sucesso!', message: 'Todos os pedidos foram enviados ao estoque.', actions: [{ label: 'OK' }] });
    } catch (e) {
      showAlert({ type: 'danger', title: 'Erro', message: 'Ocorreu um problema ao enviar os pedidos.', actions: [{ label: 'OK' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderItem = ({ item }) => {
    const { nome, cor, tamanho } = detalhesDoItem(item);
    const complemento = detalhesPorVariacao[item.variacao_id] || {};
    const imagemUrl = item.imagemUrl || complemento.imagemUrl;
    const qrCode = item.qrCode || complemento.qrCode;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => abrirProduto(qrCode)}
        disabled={!qrCode}
        accessibilityLabel={`Abrir detalhes de ${nome}`}
      >
        <View style={styles.cardThumb}>
          {imagemUrl ? (
            <Image source={{ uri: imagemUrl }} style={styles.cardThumbImagem} resizeMode="cover" />
          ) : (
            <Ionicons name="footsteps-outline" size={24} color={isDarkMode ? '#555' : '#ccc'} />
          )}
        </View>

        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>{nome}</Text>
          <View style={styles.cardTags}>
            <View style={styles.cardTag}>
              <Ionicons name="color-palette-outline" size={13} color={styles.mutedColor} />
              <Text style={styles.cardTagTexto}>{cor}</Text>
            </View>
            <View style={styles.cardTag}>
              <Ionicons name="resize-outline" size={13} color={styles.mutedColor} />
              <Text style={styles.cardTagTexto}>Tam {tamanho}</Text>
            </View>
            <View style={styles.cardTag}>
              <Ionicons name="layers-outline" size={13} color={styles.mutedColor} />
              <Text style={styles.cardTagTexto}>
                {item.quantidade} {item.quantidade === 1 ? 'par' : 'pares'}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => removerItem(item.id_unico)}
          style={styles.btnRemover}
          accessibilityLabel={`Remover ${nome} da sacola`}
        >
          <Ionicons name="trash-outline" size={22} color={styles.dangerColor} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const totalPares = sacola.reduce((soma, item) => soma + (Number(item.quantidade) || 0), 0);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sacola de Pedidos</Text>

      {sacola.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={60} color={isDarkMode ? '#555' : '#ccc'} />
          <Text style={styles.emptyText}>Sua sacola está vazia.</Text>
        </View>
      ) : (
        <>
          <Text style={styles.resumoTexto}>
            {sacola.length} {sacola.length === 1 ? 'item pronto' : 'itens prontos'} para envio · {totalPares} {totalPares === 1 ? 'par' : 'pares'}
          </Text>
          <FlatList
            data={sacola}
            keyExtractor={(item) => item.id_unico}
            renderItem={renderItem}
          />
          <TouchableOpacity
            style={styles.btnSubmit}
            onPress={enviarPedidos}
            disabled={isSubmitting}
          >
            {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enviar ao Estoque</Text>}
          </TouchableOpacity>
        </>
      )}
      <AppAlert {...alert} />
    </View>
  );
}
