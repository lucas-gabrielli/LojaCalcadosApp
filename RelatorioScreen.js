import React, { useState, useEffect, useContext } from 'react';
import {
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Pressable,
  Modal,
  TouchableOpacity
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
import { getRelatorioStyles, colors } from './styles';
import AppAlert, { useAppAlert } from './AppAlert';

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

export default function RelatorioScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const isFocused = useIsFocused();

  // ESTADOS DOS FILTROS
  const [filtroTempo, setFiltroTempo] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [modalFiltroVisible, setModalFiltroVisible] = useState(false);

  const [isGerandoPDF, setIsGerandoPDF] = useState(false);

  const { isDarkMode } = useContext(ThemeContext);
  const styles = getRelatorioStyles(isDarkMode);
  const c = colors(isDarkMode);
  const { alert, showAlert } = useAppAlert();

  const STATUS_DOT_COLOR = { pendente: c.warning, vendida: c.success, cancelada: c.danger };

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
      showAlert({ type: 'danger', title: 'Erro', message: 'Não foi possível carregar o relatório. Verifique o console para criar o Índice no Firebase.', actions: [{ label: 'OK' }] });
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
      showAlert({ type: 'warning', title: 'Relatório Vazio', message: 'Não há dados para gerar um PDF com os filtros atuais.', actions: [{ label: 'OK' }] });
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
        showAlert({ type: 'danger', title: 'Erro', message: 'O compartilhamento não está disponível neste dispositivo.', actions: [{ label: 'OK' }] });
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showAlert({ type: 'danger', title: 'Erro', message: 'Não foi possível gerar o PDF.', actions: [{ label: 'OK' }] });
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

  const totalVendidas = solicitacoes.filter((s) => s.status === 'vendida').length;
  const totalPendentes = solicitacoes.filter((s) => s.status === 'pendente').length;
  const totalCanceladas = solicitacoes.filter((s) => s.status === 'cancelada').length;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={isDarkMode ? '#F2F3F5' : '#111'} />
          </TouchableOpacity>
          <Text style={styles.title}>Meus Relatórios</Text>
        </View>
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

      <View style={styles.statsRow}>
        <View style={[styles.statBadge, styles.statBadgeVendida]}>
          <Text style={[styles.statNumber, styles.statNumberVendida]}>{totalVendidas}</Text>
          <Text style={styles.statLabel}>Vendidas</Text>
        </View>
        <View style={[styles.statBadge, styles.statBadgePendente]}>
          <Text style={[styles.statNumber, styles.statNumberPendente]}>{totalPendentes}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={[styles.statBadge, styles.statBadgeCancelada]}>
          <Text style={[styles.statNumber, styles.statNumberCancelada]}>{totalCanceladas}</Text>
          <Text style={styles.statLabel}>Canceladas</Text>
        </View>
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
                        {STATUS_DOT_COLOR[status] && (
                          <View style={[styles.chipDot, { backgroundColor: STATUS_DOT_COLOR[status] }]} />
                        )}
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
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color={filtroTempo === tempo.id ? c.primary : c.textMuted}
                          style={{ marginRight: 6 }}
                        />
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

      <AppAlert {...alert} />
    </View>
  );
}
