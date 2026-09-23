import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';
import SideMenu from './SideMenu';
import AppAlert, { useAppAlert } from './AppAlert';
// A regra de quando o menu abre/reabre vive no domínio e é coberta por
// testes/menu-lateral.test.mjs — aqui só ligamos a UI nela.
import { ESTADO_INICIAL, reduzir } from './dominio/menuLateral';

const MenuLateralContext = createContext({
  aberto: false,
  instantaneo: false,
  abrirPeloAvatar: () => {},
  fechar: () => {},
  aoFocarInicio: () => {},
});

export const useMenuLateral = () => useContext(MenuLateralContext);

const formatarNomeDoEmail = (email) => {
  const prefixo = email.split('@')[0].split(/[._0-9]/)[0];
  if (!prefixo) return 'Vendedor';
  return prefixo.charAt(0).toUpperCase() + prefixo.slice(1);
};

/** Estado do menu, guardado na raiz do app — não dentro de uma tela. */
export function MenuLateralProvider({ children }) {
  const [estado, despachar] = useReducer(reduzir, ESTADO_INICIAL);

  const abrirPeloAvatar = useCallback(() => despachar('abrirPeloAvatar'), []);
  const fechar = useCallback(() => despachar('fechar'), []);
  const escolherItem = useCallback(() => despachar('escolherItem'), []);
  const aoFocarInicio = useCallback(() => despachar('aoFocarInicio'), []);
  const sairDaConta = useCallback(() => despachar('sairDaConta'), []);

  const valor = useMemo(
    () => ({
      aberto: estado.aberto,
      instantaneo: estado.instantaneo,
      abrirPeloAvatar,
      fechar,
      escolherItem,
      aoFocarInicio,
      sairDaConta,
    }),
    [estado.aberto, estado.instantaneo, abrirPeloAvatar, fechar, escolherItem, aoFocarInicio, sairDaConta]
  );

  return <MenuLateralContext.Provider value={valor}>{children}</MenuLateralContext.Provider>;
}

/**
 * Camada visual do menu. Renderizada DENTRO da tela que a hospeda, como irmã
 * do conteúdo rolável — não na raiz do app.
 *
 * Motivo: na raiz, a camada era renderizada mas nunca desenhada (confirmado em
 * teste no Android: `visible=true` no log, nada na tela, nem um marcador
 * estático). Dentro da tela, `position:absolute` se resolve contra a própria
 * tela e o desenho é previsível.
 *
 * O menu roda dentro de um Modal, que fica acima de tudo — inclusive da barra
 * flutuante. Não é preciso escondê-la.
 */
export function MenuLateralOverlay({ navegar }) {
  const { aberto, instantaneo, fechar, escolherItem, sairDaConta } = useMenuLateral();
  const { alert, showAlert } = useAppAlert();

  const usuario = auth.currentUser;
  const nome = usuario?.email ? formatarNomeDoEmail(usuario.email) : 'Vendedor';

  const irPara = (rota) => () => {
    escolherItem();
    navegar(rota);
  };

  const handleLogout = () => {
    sairDaConta();
    showAlert({
      type: 'danger',
      title: 'Sair da Conta',
      message: 'Tem certeza que deseja sair do sistema?',
      actions: [
        { label: 'Cancelar', style: 'cancel' },
        { label: 'Sair', style: 'destructive', onPress: () => signOut(auth) },
      ],
    });
  };

  const secoes = [
    {
      title: 'Minha Conta',
      items: [
        { icon: 'trending-up-outline', label: 'Desempenho do Mês', onPress: irPara('Metas') },
        { icon: 'document-text-outline', label: 'Relatórios', onPress: irPara('Relatorio') },
        { icon: 'time-outline', label: 'Histórico de Escaneamento', onPress: irPara('Historico') },
      ],
    },
    {
      title: 'Loja',
      items: [
        { icon: 'alert-circle-outline', label: 'Estoque Baixo', onPress: irPara('EstoqueBaixo') },
      ],
    },
    {
      title: 'Aplicativo',
      items: [
        { icon: 'settings-outline', label: 'Configurações', onPress: irPara('Configuracoes') },
      ],
    },
  ];

  return (
    <>
      <SideMenu
        visible={aberto}
        instantaneo={instantaneo}
        onClose={fechar}
        nome={nome}
        email={usuario?.email || ''}
        sections={secoes}
        onLogout={handleLogout}
      />
      <AppAlert {...alert} />
    </>
  );
}
