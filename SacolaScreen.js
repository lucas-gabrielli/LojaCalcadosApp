import React, { useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { db, auth } from './firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { ThemeContext } from './ThemeContext';
import { getSacolaStyles } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

export default function SacolaScreen() {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getSacolaStyles(isDarkMode);
  const [sacola, setSacola] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { alert, showAlert } = useAppAlert();

  // Recarrega a sacola sempre que o usuário abre esta aba
  useFocusEffect(
    useCallback(() => {
      const loadSacola = async () => {
        const dados = await AsyncStorage.getItem('@sacola_pedidos');
        if (dados) setSacola(JSON.parse(dados));
      };
      loadSacola();
    }, [])
  );

  const removerItem = async (id_unico) => {
    const novaSacola = sacola.filter(item => item.id_unico !== id_unico);
    setSacola(novaSacola);
    await AsyncStorage.setItem('@sacola_pedidos', JSON.stringify(novaSacola));
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
          qrCode: item.qrCode,
          nomeProduto: item.nomeProduto,
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
            {sacola.length} {sacola.length === 1 ? 'item pronto' : 'itens prontos'} para envio
          </Text>
          <FlatList
            data={sacola}
            keyExtractor={(item) => item.id_unico}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.nomeProduto}</Text>
                  <Text style={styles.cardSubtitle}>Qtd: {item.quantidade}</Text>
                </View>
                <TouchableOpacity onPress={() => removerItem(item.id_unico)}>
                  <Ionicons name="trash-outline" size={24} color={styles.dangerColor} />
                </TouchableOpacity>
              </View>
            )}
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
