import React, { useState, useEffect, useContext } from 'react'; 
import { 
  Text, 
  View, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  Alert,
  Pressable,
  Modal,
  TouchableOpacity
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons'; // NOVO: Ícones para a interface

import { db, auth } from './firebaseConfig';
import { 
  collection, 
  query, 
  getDocs, 
  orderBy, 
  where, 
  Timestamp 
} from 'firebase/firestore';

import { ThemeContext } from './ThemeContext';

const gerarConteudoHTML = (solicitacoes, filtroTempo, filtroStatus) => {
  let totalSolicitacoes = solicitacoes.length;
  
  const mapTempo = { dia: 'Diário', semana: 'Últimos 7 dias', mes: 'Últimos 30 dias', todos: 'Desde o início' };
  const mapStatus = { todos: 'Todos os Status', pendente: 'Apenas Pendentes', vendida: 'Apenas Vendidas', cancelada: 'Apenas Devolvidas' };
  
  let tableRows = `
    <tr style="background-color: #5865F2; color: white;">
      <th style="padding: 10px; border: 1px solid #ddd;">Data/Hora</th>
      <th style="padding: 10px; border: 1px solid #ddd;">Produto</th>
      <th style="padding: 10px; border: 1px solid #ddd;">Tam</th>
      <th style="padding: 10px; border: 1px solid #ddd;">Status</th>
    </tr>
  `;

  solicitacoes.forEach(sol => {
    let corStatus = sol.status === 'vendida' ? '#23A559' : sol.status === 'cancelada' ? '#DA373C' : '#FEE75C';
    let corTextoStatus = sol.status === 'pendente' ? '#000' : '#fff';
    
    tableRows += `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd;">${sol.dataSolicitacaoFormatada}</td>
        <td style="padding: 10px; border: 1px solid #ddd;">${sol.nomeProduto}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${sol.tamanho}</td>
        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
          <span style="background-color: ${corStatus}; color: ${corTextoStatus}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
            ${sol.status || 'N/A'}
          </span>
        </td>
      </tr>
    `;
  });

  return `
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 20px; }
          h1 { color: #111; border-bottom: 2px solid #5865F2; padding-bottom: 10px; }
          .filtros-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .filtros-info p { margin: 5px 0; font-size: 14px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { text-align: left; }
          tr:nth-child(even) { background-color: #f8f9fa; }
        </style>
      </head>
      <body>
        <h1>Relatório de Desempenho</h1>
        <div class="filtros-info">
          <p><strong>Período:</strong> ${mapTempo[filtroTempo]}</p>
          <p><strong>Status:</strong> ${mapStatus[filtroStatus]}</p>
          <p><strong>Total de Registros:</strong> ${totalSolicitacoes}</p>
        </div>
        <table>
          ${tableRows}
        </table>
      </body>
    </html>
  `;
};

export default function RelatorioScreen() {
  const [loading, setLoading] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const isFocused = useIsFocused();
  
  // ESTADOS DOS FILTROS
  const [filtroTempo, setFiltroTempo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);
  
  const [isGerandoPDF, setIsGerandoPDF] = useState(false);

  const { isDarkMode } = useContext(ThemeContext);
  const styles = getDynamicStyles(isDarkMode);

  const fetchSolicitacoes = async () => {
    setLoading(true);
    try {
      const solicitacoesRef = collection(db, 'solicitacoes');
      const usuarioLogado = auth.currentUser; 
      
      if (!usuarioLogado) {
        setLoading(false); return;
      }

      const now = new Date();
      let dataInicio = null;
      
      if (filtroTempo === 'dia') {
        dataInicio = new Date(now);
        dataInicio.setHours(0, 0, 0, 0);
      } else if (filtroTempo === 'semana') {
        dataInicio = new Date(now);
        dataInicio.setDate(now.getDate() - 7); // Últimos 7 dias exatos
      } else if (filtroTempo === 'mes') {
        dataInicio = new Date(now);
        dataInicio.setDate(now.getDate() - 30); // Últimos 30 dias exatos
      }

      // MONTANDO A QUERY DINAMICAMENTE
      let condicoes = [where('usuario_email', '==', usuarioLogado.email)];
      
      // Se houver filtro de status, adiciona na query
      if (filtroStatus !== 'todos') {
        condicoes.push(where('status', '==', filtroStatus));
      }
      
      // Se houver filtro de tempo, adiciona na query
      if (dataInicio) {
        condicoes.push(where('dataSolicitacao', '>=', Timestamp.fromDate(dataInicio)));
      }
      
      // Sempre ordena por data (mais recente primeiro)
      condicoes.push(orderBy('dataSolicitacao', 'desc'));

      const q = query(solicitacoesRef, ...condicoes);
      const querySnapshot = await getDocs(q);
      
      const listaSolicitacoes = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const dataFormatada = data.dataSolicitacao 
          ? new Date(data.dataSolicitacao.seconds * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
          : '--/--/----';
        listaSolicitacoes.push({ id: doc.id, ...data, dataSolicitacaoFormatada: dataFormatada });
      });
      setSolicitacoes(listaSolicitacoes);
    } catch (e) {
      console.error("Erro ao buscar solicitações: ", e);
      Alert.alert('Erro', 'Não foi possível carregar o relatório. Verifique o console para criar o Índice no Firebase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchSolicitacoes();
    }
  }, [isFocused, filtroTempo, filtroStatus]);

  const handleGerarPDF = async () => {
    if (solicitacoes.length === 0) {
      Alert.alert('Relatório Vazio', 'Não há dados para gerar um PDF com os filtros atuais.');
      return;
    }
    setIsGerandoPDF(true);
    try {
      const html = gerarConteudoHTML(solicitacoes, filtroTempo, filtroStatus);
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Baixar Relatório',
        });
      } else {
        Alert.alert('Erro', 'O compartilhamento não está disponível neste dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setIsGerandoPDF(false);
    }
  };

  // COMPONENTES DE INTERFACE
  const getStatusCor = (status) => {
    if (status === 'vendida') return styles.statusVendida;
    if (status === 'cancelada') return styles.statusCancelada;
    return styles.statusPendente;
  };

  const renderItemSolicitacao = ({ item }) => (
    <View style={styles.solicitacaoItem}>
      <View style={styles.itemCabecalho}>
        <Text style={styles.solicitacaoProduto} numberOfLines={1}>{item.nomeProduto}</Text>
        <Text style={[styles.statusBadge, getStatusCor(item.status)]}>
          {item.status ? item.status.toUpperCase() : 'N/A'}
        </Text>
      </View>
      
      <View style={styles.itemDetalhes}>
        <View style={styles.detalheInfo}>
            <Ionicons name="resize-outline" size={16} color={isDarkMode ? '#aaa' : '#666'} />
            <Text style={styles.detalheTexto}>Tam: {item.tamanho}</Text>
        </View>
        <View style={styles.detalheInfo}>
            <Ionicons name="time-outline" size={16} color={isDarkMode ? '#aaa' : '#666'} />
            <Text style={styles.detalheTexto}>{item.dataSolicitacaoFormatada}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Meus Relatórios</Text>
        <TouchableOpacity 
            style={styles.btnAbrirFiltro} 
            onPress={() => setModalFiltroVisible(true)}
            accessibilityLabel="Abrir filtros avançados"
        >
            <Ionicons name="filter" size={20} color="#fff" />
            <Text style={styles.btnAbrirFiltroText}>Filtros</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.resumoFiltro}>
          <Text style={styles.resumoTexto}>
              Mostrando: {filtroStatus === 'todos' ? 'Tudo' : filtroStatus} / {filtroTempo === 'todos' ? 'Desde o início' : filtroTempo === 'dia' ? 'Hoje' : filtroTempo === 'semana' ? '7 dias' : '30 dias'}
          </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#5865F2" style={{ marginTop: 40 }}/>
      ) : (
        <FlatList
          data={solicitacoes}
          renderItem={renderItemSolicitacao}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={60} color={isDarkMode ? '#444' : '#ccc'} />
                <Text style={styles.listaVazia}>Nenhum registro encontrado para este filtro.</Text>
            </View>
          }
        />
      )}

      {/* BOTÃO PDF FLUTUANTE */}
      <Pressable
        style={[styles.pdfFab, isGerandoPDF && styles.pdfButtonDisabled]}
        onPress={handleGerarPDF}
        disabled={isGerandoPDF || loading}
        accessibilityLabel="Baixar relatório em PDF"
      >
        <Ionicons name="download-outline" size={24} color="#fff" />
        <Text style={styles.pdfFabText}>
          {isGerandoPDF ? 'Gerando...' : 'Exportar PDF'}
        </Text>
      </Pressable>

      {/* MODAL BOTTOM SHEET DE FILTROS */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalFiltroVisible}
        onRequestClose={() => setModalFiltroVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Filtros Avançados</Text>
                <TouchableOpacity onPress={() => setModalFiltroVisible(false)} padding={10}>
                    <Ionicons name="close" size={28} color={isDarkMode ? '#F2F3F5' : '#333'} />
                </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Situação da Solicitação</Text>
            <View style={styles.chipContainer}>
                {['todos', 'pendente', 'vendida', 'cancelada'].map(status => (
                    <TouchableOpacity 
                        key={status}
                        style={[styles.chip, filtroStatus === status && styles.chipActive]}
                        onPress={() => setFiltroStatus(status)}
                    >
                        <Text style={[styles.chipText, filtroStatus === status && styles.chipTextActive]}>
                            {status === 'todos' ? 'Todos' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.filterSectionTitle}>Período</Text>
            <View style={styles.chipContainer}>
                {[
                    { id: 'todos', label: 'Todo o Período' },
                    { id: 'dia', label: 'Hoje' },
                    { id: 'semana', label: 'Últimos 7 dias' },
                    { id: 'mes', label: 'Últimos 30 dias' }
                ].map(tempo => (
                    <TouchableOpacity 
                        key={tempo.id}
                        style={[styles.chip, filtroTempo === tempo.id && styles.chipActive]}
                        onPress={() => setFiltroTempo(tempo.id)}
                    >
                        <Text style={[styles.chipText, filtroTempo === tempo.id && styles.chipTextActive]}>
                            {tempo.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity 
                style={styles.btnAplicarFiltro}
                onPress={() => setModalFiltroVisible(false)}
            >
                <Text style={styles.btnAplicarText}>Ver Resultados</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const getDynamicStyles = (isDarkMode) => {
  const colors = {
    background: isDarkMode ? '#313338' : '#F2F3F5',
    text: isDarkMode ? '#F2F3F5' : '#111827',
    textMuted: isDarkMode ? '#B5BAC1' : '#6B7280',
    card: isDarkMode ? '#2B2D31' : '#FFFFFF',
    border: isDarkMode ? '#1E1F22' : '#E5E7EB',
    primary: '#5865F2',
    primaryLight: isDarkMode ? 'rgba(88, 101, 242, 0.2)' : '#E0E7FF',
    successBg: isDarkMode ? 'rgba(35, 165, 89, 0.2)' : '#DCFCE7',
    successText: isDarkMode ? '#4ADE80' : '#166534',
    dangerBg: isDarkMode ? 'rgba(218, 55, 60, 0.2)' : '#FEE2E2',
    dangerText: isDarkMode ? '#F87171' : '#991B1B',
    warningBg: isDarkMode ? 'rgba(254, 231, 92, 0.2)' : '#FEF9C3',
    warningText: isDarkMode ? '#FDE047' : '#854D0E',
  };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: Constants.statusBarHeight + 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
    },
    btnAbrirFiltro: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    btnAbrirFiltroText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 6,
    },
    resumoFiltro: {
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    resumoTexto: {
        color: colors.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    },
    list: { 
        paddingHorizontal: 20,
    },
    solicitacaoItem: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 15,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0 : 0.05,
      shadowRadius: 3,
      elevation: isDarkMode ? 0 : 2,
    },
    itemCabecalho: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    solicitacaoProduto: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      marginRight: 10,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 'bold',
      overflow: 'hidden',
    },
    statusVendida: { backgroundColor: colors.successBg, color: colors.successText },
    statusCancelada: { backgroundColor: colors.dangerBg, color: colors.dangerText },
    statusPendente: { backgroundColor: colors.warningBg, color: colors.warningText },
    
    itemDetalhes: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    detalheInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detalheTexto: {
        marginLeft: 6,
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    listaVazia: {
      marginTop: 15,
      fontSize: 16,
      color: colors.textMuted,
      textAlign: 'center',
    },
    
    // FAB (Floating Action Button) para o PDF
    pdfFab: {
        position: 'absolute',
        bottom: 25,
        right: 20,
        backgroundColor: '#23A559',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    pdfButtonDisabled: { opacity: 0.5 },
    pdfFabText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 8,
    },

    // ESTILOS DO BOTTOM SHEET DE FILTROS
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheet: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.text,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textMuted,
        marginBottom: 12,
        marginTop: 10,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    chip: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
    },
    chipActive: {
        backgroundColor: colors.primaryLight,
        borderColor: colors.primary,
    },
    chipText: {
        color: colors.textMuted,
        fontWeight: '600',
        fontSize: 14,
    },
    chipTextActive: {
        color: colors.primary,
    },
    btnAplicarFiltro: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    btnAplicarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18,
    }
  });
};