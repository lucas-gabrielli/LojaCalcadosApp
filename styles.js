import { StyleSheet } from 'react-native';
import Constants from 'expo-constants';

// ===================== Paleta unificada =====================
export const colors = (isDarkMode) => ({
  background: isDarkMode ? '#313338' : '#F2F3F5',
  card: isDarkMode ? '#2B2D31' : '#FFFFFF',
  border: isDarkMode ? '#1E1F22' : '#E5E7EB',
  text: isDarkMode ? '#F2F3F5' : '#111827',
  textMuted: isDarkMode ? '#B5BAC1' : '#6B7280',

  primary: '#5865F2',
  primaryLight: isDarkMode ? 'rgba(88, 101, 242, 0.2)' : '#E0E7FF',

  success: isDarkMode ? '#23A559' : '#16A34A',
  successBg: isDarkMode ? 'rgba(35, 165, 89, 0.2)' : '#DCFCE7',
  successText: isDarkMode ? '#4ADE80' : '#166534',

  danger: isDarkMode ? '#DA373C' : '#DC2626',
  dangerBg: isDarkMode ? 'rgba(218, 55, 60, 0.2)' : '#FEE2E2',
  dangerText: isDarkMode ? '#F87171' : '#991B1B',

  warning: isDarkMode ? '#FEE75C' : '#CA8A04',
  warningBg: isDarkMode ? 'rgba(254, 231, 92, 0.2)' : '#FEF9C3',
  warningText: isDarkMode ? '#FDE047' : '#854D0E',

  secondary: isDarkMode ? '#4E5058' : '#E5E7EB',
  badgeBg: isDarkMode ? '#1E1F22' : '#F3F4F6',
});

// ===================== LoginScreen =====================
export const getLoginStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      padding: 20,
    },
    formContainer: {
      backgroundColor: c.card,
      padding: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0 : 0.1,
      shadowRadius: 4,
      elevation: isDarkMode ? 0 : 3,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: c.text,
      textAlign: 'center',
      marginBottom: 30,
    },
    input: {
      height: 50,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 15,
      marginBottom: 15,
      color: c.text,
      fontSize: 16,
    },
    button: {
      backgroundColor: c.primary,
      height: 50,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: 'bold',
    }
  });
};

// ===================== ScannerScreen =====================
export const getScannerStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: c.background,
      paddingTop: 10,
      paddingHorizontal: 20,
      paddingBottom: 130,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Constants.statusBarHeight + 20,
      paddingHorizontal: 20,
      paddingBottom: 10,
      backgroundColor: c.background,
    },
    backButton: { padding: 5, marginLeft: -5 },
    containerCenter: {
      flex: 1,
      backgroundColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      marginBottom: 25,
    },
    textMuted: {
      color: c.textMuted,
      fontSize: 16,
    },
    cameraWrapper: {
      width: '100%',
      height: 350,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 20,
      borderWidth: 2,
      borderColor: c.border,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
    },
    camera: {
      width: '100%',
      height: '100%',
    },
    miraVisual: {
      position: 'absolute',
      width: 200,
      height: 200,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.6)',
      borderRadius: 16,
      borderStyle: 'dashed',
    },
    cameraPlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      color: c.textMuted,
      marginTop: 10,
      fontSize: 16,
      fontWeight: 'bold',
    },
    btnPrimary: {
      flexDirection: 'row',
      backgroundColor: c.primary,
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
    },
    btnPrimaryText: {
      color: '#FFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: c.border,
    },
    dividerText: {
      color: c.textMuted,
      paddingHorizontal: 15,
      fontWeight: '600',
    },
    manualContainer: {
      width: '100%',
    },
    label: {
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 10,
      textAlign: 'center',
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 16,
      color: c.text,
      fontSize: 16,
      marginBottom: 15,
      textAlign: 'center',
    },
    btnManual: {
      backgroundColor: c.secondary,
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    btnManualText: {
      color: isDarkMode ? '#FFF' : '#111',
      fontSize: 16,
      fontWeight: 'bold',
    }
  });
};

// ===================== ProdutoScreen =====================
export const getProdutoStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    scrollContainer: { flex: 1, backgroundColor: c.background },
    container: { alignItems: 'center', padding: 20, paddingBottom: 40 },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingTop: Constants.statusBarHeight + 20,
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    backButton: { padding: 5, marginLeft: -5 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: c.text },

    errorText: { fontSize: 18, color: c.danger, textAlign: 'center', marginBottom: 15 },

    // Imagem em destaque
    imageWrapper: {
      width: '100%',
      height: 280,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    productImage: { width: '100%', height: '100%' },
    imagePlaceholderText: {
      marginTop: 10,
      fontSize: 14,
      fontWeight: '600',
      color: c.textMuted,
    },

    // Título + badge de estoque
    titleRow: { width: '100%', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800', color: c.text, marginBottom: 8 },
    estoqueBadge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.successBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
    },
    estoqueBadgeText: { color: c.successText, fontWeight: 'bold', fontSize: 13, marginLeft: 5 },
    estoqueBadgeZerado: { backgroundColor: c.dangerBg },
    estoqueBadgeTextZerado: { color: c.dangerText },

    sectionTitle: {
      width: '100%',
      fontSize: 13,
      fontWeight: 'bold',
      color: c.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase',
    },

    // Lista de variações
    list: { width: '100%' },
    variacaoItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
      backgroundColor: c.card,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: 12,
      marginBottom: 10,
    },
    variacaoTamanho: { fontSize: 16, fontWeight: 'bold', color: c.text },
    estoqueDisponivel: { fontSize: 14, color: c.success, marginTop: 4 },
    estoqueIndisponivel: { fontSize: 14, color: c.danger, marginTop: 4 },
    btnAdicionar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
    },
    btnAdicionarDisabled: { backgroundColor: c.secondary },
    btnAdicionarText: { color: '#fff', fontWeight: 'bold', marginLeft: 6, fontSize: 13 },

    // Solicitações concorrentes
    concorrentesContainer: {
      width: '100%',
      marginTop: 10,
      marginBottom: 20,
      padding: 15,
      backgroundColor: c.warningBg,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: c.warning,
    },
    concorrentesTitle: { fontSize: 15, fontWeight: 'bold', color: c.text, marginBottom: 10 },
    concorrenteItem: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 12 },
    concorrenteInfo: { marginBottom: 10 },
    concorrenteTexto: { fontSize: 14, color: c.text, marginBottom: 2 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
    actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    btnDevolver: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.danger, marginRight: 5 },
    btnDevolverText: { color: c.danger, fontWeight: 'bold' },
    btnVender: { backgroundColor: c.success, marginLeft: 5 },
    btnVenderText: { color: '#fff', fontWeight: 'bold' },
    aguardandoTexto: { fontSize: 12, color: c.danger, fontStyle: 'italic', marginTop: 5 },

    // Outros produtos disponíveis
    similaresContainer: { width: '100%', marginTop: 10 },
    similaresList: { paddingRight: 20 },
    similarCard: {
      width: 130,
      marginRight: 12,
      backgroundColor: c.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    similarImageWrapper: {
      width: '100%',
      height: 90,
      backgroundColor: c.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
    similarInfo: { padding: 10 },
    similarNome: { fontSize: 13, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    similarEstoque: { fontSize: 12, color: c.textMuted },
    similaresVazio: { color: c.textMuted, fontSize: 14, fontStyle: 'italic' },

    voltarButton: { marginTop: 25, width: '100%' },
  });
};

// ===================== ConfiguracoesScreen =====================
export const getConfiguracoesStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 20, paddingTop: Constants.statusBarHeight + 20 },
    profileSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 20, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: c.border },
    avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: isDarkMode ? '#1E1F22' : '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 4 },
    profileEmail: { fontSize: 14, color: c.textMuted },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: c.textMuted, marginBottom: 10, marginLeft: 5, textTransform: 'uppercase' },

    menuContainer: { backgroundColor: c.card, borderRadius: 12, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: c.border },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: c.border },
    menuIconText: { flexDirection: 'row', alignItems: 'center' },
    iconColor: { color: isDarkMode ? '#aaa' : '#555' },
    icon: { marginRight: 15 },
    menuText: { fontSize: 16, color: c.text, fontWeight: '500' },

    logoutButton: { flexDirection: 'row', backgroundColor: c.danger, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    iconLogout: { marginRight: 10 },
    logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  });
};

// ===================== SacolaScreen =====================
export const getSacolaStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 20, paddingBottom: 120, paddingTop: Constants.statusBarHeight + 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: c.text, marginBottom: 20, textAlign: 'center' },
    resumoTexto: { color: c.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 15, marginTop: -10, fontWeight: '600' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: c.textMuted, fontSize: 16, marginTop: 10 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.card, padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: c.border },
    cardTitle: { color: c.text, fontSize: 14, fontWeight: 'bold' },
    cardSubtitle: { color: c.textMuted, fontSize: 12, marginTop: 5 },
    dangerColor: c.danger,
    btnSubmit: { backgroundColor: c.primary, padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
  });
};

// ===================== SolicitacoesScreen =====================
export const getSolicitacoesStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: Constants.statusBarHeight + 20,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: c.text,
    },
    subtitle: {
      fontSize: 14,
      color: c.textMuted,
      marginBottom: 20,
      marginTop: 5,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDarkMode ? 0 : 0.05,
      shadowRadius: 3,
      elevation: isDarkMode ? 0 : 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 15,
    },
    produtoNome: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      marginBottom: 4,
    },
    produtoDetalhes: {
      fontSize: 14,
      color: c.textMuted,
      fontWeight: '500',
    },
    tempoDecorridoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    tempoDecorridoText: {
      marginLeft: 5,
      fontSize: 13,
      color: c.warningText,
      fontWeight: '700',
    },
    tempoBadge: {
      backgroundColor: c.badgeBg,
      color: c.textMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 'bold',
      overflow: 'hidden',
    },
    actionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    btnAction: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 8,
    },
    btnDevolver: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.danger,
    },
    btnDevolverText: {
      color: c.danger,
      fontWeight: 'bold',
      marginLeft: 6,
    },
    btnVender: {
      backgroundColor: c.success,
    },
    btnVenderText: {
      color: '#fff',
      fontWeight: 'bold',
      marginLeft: 6,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 80,
    },
    listaVazia: {
      marginTop: 15,
      fontSize: 16,
      color: c.textMuted,
      textAlign: 'center',
    }
  });
};

// ===================== SegurancaScreen =====================
export const getSegurancaStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Constants.statusBarHeight + 20, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    backButton: { padding: 5, marginLeft: -5 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: c.textMuted, marginBottom: 10, textTransform: 'uppercase' },

    card: { backgroundColor: c.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: c.border },
    optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    optionIconText: { flexDirection: 'row', alignItems: 'center' },
    icon: { marginRight: 15 },
    text: { fontSize: 16, color: c.text, fontWeight: '500' },
    description: { fontSize: 13, color: c.textMuted, lineHeight: 20, marginTop: 5 },
  });
};

// ===================== RelatorioScreen =====================
export const getRelatorioStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingTop: Constants.statusBarHeight + 20,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 10,
    },
    headerTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    backButton: { padding: 5, marginLeft: -5, marginRight: 4 },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: c.text,
    },
    statsRow: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 15,
      gap: 10,
    },
    statBadge: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: 'center',
    },
    statNumber: { fontSize: 18, fontWeight: '800' },
    statLabel: { fontSize: 11, color: c.textMuted, marginTop: 2, fontWeight: '600' },
    statBadgeVendida: { backgroundColor: c.successBg },
    statNumberVendida: { color: c.successText },
    statBadgePendente: { backgroundColor: c.warningBg },
    statNumberPendente: { color: c.warningText },
    statBadgeCancelada: { backgroundColor: c.dangerBg },
    statNumberCancelada: { color: c.dangerText },
    btnAbrirFiltro: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.primary,
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
      color: c.textMuted,
      fontSize: 14,
      fontStyle: 'italic',
    },
    list: {
      paddingHorizontal: 20,
    },
    solicitacaoItem: {
      backgroundColor: c.card,
      borderColor: c.border,
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
      color: c.text,
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
    statusVendida: { backgroundColor: c.successBg, color: c.successText },
    statusCancelada: { backgroundColor: c.dangerBg, color: c.dangerText },
    statusPendente: { backgroundColor: c.warningBg, color: c.warningText },

    itemDetalhes: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 12,
    },
    detalheInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detalheTexto: {
      marginLeft: 6,
      fontSize: 14,
      color: c.textMuted,
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
      color: c.textMuted,
      textAlign: 'center',
    },

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

    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    bottomSheet: {
      backgroundColor: c.background,
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
      color: c.text,
    },
    filterSectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: c.textMuted,
      marginBottom: 12,
      marginTop: 10,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 10,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 20,
      marginRight: 10,
      marginBottom: 10,
    },
    chipDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 6,
    },
    chipActive: {
      backgroundColor: c.primaryLight,
      borderColor: c.primary,
    },
    chipText: {
      color: c.textMuted,
      fontWeight: '600',
      fontSize: 14,
    },
    chipTextActive: {
      color: c.primary,
    },
    btnAplicarFiltro: {
      backgroundColor: c.primary,
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

// ===================== MetasScreen =====================
export const getMetasStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, padding: 20, paddingTop: Constants.statusBarHeight + 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backButton: { padding: 5 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    subtitle: { fontSize: 14, color: c.textMuted, marginBottom: 20, textAlign: 'center' },

    goalCard: { backgroundColor: c.card, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    goalText: { fontWeight: 'bold', color: c.text, fontSize: 16 },
    goalCount: { color: c.primary, fontWeight: '900', fontSize: 16 },
    progressBarBg: { height: 12, backgroundColor: isDarkMode ? '#1E1F22' : '#eee', borderRadius: 6, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: c.primary, borderRadius: 6 },
    goalSubtext: { fontSize: 14, color: c.textMuted, marginTop: 15, textAlign: 'center', fontWeight: '500' },

    tempoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      padding: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      marginTop: 16,
    },
    tempoCardIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    tempoCardIcon: { color: c.primary },
    tempoCardTextWrapper: { marginLeft: 14 },
    tempoCardLabel: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    tempoCardValue: { fontSize: 20, color: c.text, fontWeight: '800', marginTop: 2 },
  });
};

// ===================== HistoricoScreen =====================
export const getHistoricoStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Constants.statusBarHeight + 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 },
    backButton: { padding: 5 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: c.border
    },
    itemContent: { flexDirection: 'row', alignItems: 'center' },
    itemText: { marginLeft: 15, fontSize: 16, color: c.text, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { marginTop: 20, fontSize: 16, color: c.textMuted, textAlign: 'center', paddingHorizontal: 40 }
  });
};

// ===================== AparenciaScreen =====================
export const getAparenciaStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background, paddingTop: Constants.statusBarHeight + 20, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 30 },
    backButton: { padding: 5 },
    title: { fontSize: 20, fontWeight: 'bold', color: c.text },
    sectionTitle: { fontSize: 13, fontWeight: 'bold', color: c.textMuted, marginBottom: 15, textTransform: 'uppercase' },

    menuContainer: { backgroundColor: c.card, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.border },
    menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: c.border },
    menuIconText: { flexDirection: 'row', alignItems: 'center', flex: 1 },

    iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: isDarkMode ? '#1E1F22' : '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    iconCircleActive: { backgroundColor: c.primary },

    menuText: { fontSize: 16, color: c.text, fontWeight: '600' },
    menuTextActive: { color: c.primary },
    menuDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },

    previewCard: { flexDirection: 'row', marginTop: 30, padding: 15, backgroundColor: isDarkMode ? 'rgba(88, 101, 242, 0.1)' : '#EEF2FF', borderRadius: 12, alignItems: 'center' },
    previewText: { flex: 1, marginLeft: 10, fontSize: 13, color: isDarkMode ? '#B5BAC1' : '#4F46E5', fontStyle: 'italic' }
  });
};

// ===================== HomeScreen =====================
export const getHomeStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: c.background,
      paddingTop: Constants.statusBarHeight + 20,
      paddingHorizontal: 20,
      paddingBottom: 130,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24,
    },
    greeting: { fontSize: 22, fontWeight: '800', color: c.text },
    greetingSubtitle: { fontSize: 14, color: c.textMuted, marginTop: 2 },
    avatarButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      justifyContent: 'center',
      alignItems: 'center',
    },

    heroCard: {
      backgroundColor: c.primary,
      borderRadius: 24,
      padding: 24,
      marginBottom: 24,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 14,
      elevation: 8,
    },
    heroIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    heroTextWrapper: { flex: 1 },
    heroTitle: { fontSize: 19, fontWeight: '800', color: '#fff' },
    heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 4 },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statTile: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    statTileValue: { fontSize: 24, fontWeight: '800', color: c.text },
    statTileLabel: { fontSize: 12, color: c.textMuted, marginTop: 4, fontWeight: '600' },

    sectionTitle: {
      fontSize: 13,
      fontWeight: 'bold',
      color: c.textMuted,
      marginBottom: 12,
      textTransform: 'uppercase',
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    gridItem: {
      width: '47%',
      backgroundColor: c.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      alignItems: 'flex-start',
    },
    gridIconWrapper: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
    },
    gridLabel: { fontSize: 14, fontWeight: '700', color: c.text },
  });
};

// ===================== AppAlert =====================
export const getAppAlertStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 10,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      color: c.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    message: {
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 22,
    },
    actionsRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
    },
    actionsColumn: {
      flexDirection: 'column',
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionBtnCancel: {
      backgroundColor: c.secondary,
    },
    actionText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 15,
    },
    actionTextCancel: {
      color: c.text,
    },
  });
};

// ===================== FloatingTabBar =====================
export const getFloatingTabBarStyles = (isDarkMode) => {
  const c = colors(isDarkMode);

  return StyleSheet.create({
    wrapper: {
      position: 'absolute',
      left: 20,
      right: 20,
      alignItems: 'center',
    },
    bar: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: c.card,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDarkMode ? 0.4 : 0.15,
      shadowRadius: 12,
      elevation: 12,
      overflow: 'hidden',
    },
    indicator: {
      position: 'absolute',
      top: 6,
      bottom: 6,
      left: 6,
      backgroundColor: c.primaryLight,
      borderRadius: 20,
    },
    tabButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
    },
    tabLabel: {
      fontSize: 10,
      fontWeight: '700',
      marginTop: 3,
    },
  });
};
