/**
 * Domínio da galeria de fotos — mesmo padrão do ADR-001: sem React, sem
 * Firebase, sem I/O. Só decide QUAIS fotos a tela mostra e em que ordem.
 *
 * O passo a passo de cadastro está em docs/como-adicionar-imagens.md. Em uma
 * linha: qualquer documento (produto OU variação) pode ganhar um campo
 * `imagens` com uma lista de URLs. O campo antigo `imagemUrl`, de foto única,
 * continua valendo e entra no fim da lista — nada que já está cadastrado
 * precisa ser mexido.
 *
 * Este arquivo não importa ninguém de propósito: quem conhece "cor" é o
 * dominio/variacoes.js, e é ele que importa daqui (nunca o contrário).
 */

// Nomes aceitos para uma LISTA de fotos. Mais de um porque o cadastro é feito
// à mão no console do Firebase e cada pessoa batiza o campo de um jeito.
const CAMPOS_DE_LISTA = ['imagens', 'fotos', 'galeria'];

// Nomes aceitos para UMA foto só — o formato antigo, que segue funcionando.
const CAMPOS_DE_FOTO_UNICA = ['imagemUrl', 'imagem_url', 'imagem', 'foto'];

/** Aceita "url", { url }, { uri } ou { imagemUrl } e devolve sempre uma string. */
function limparUrl(valor) {
  if (typeof valor === 'string') return valor.trim();
  if (valor && typeof valor === 'object') {
    const bruto = valor.url ?? valor.uri ?? valor.imagemUrl ?? valor.src;
    return typeof bruto === 'string' ? bruto.trim() : '';
  }
  return '';
}

/** Tira as repetidas mantendo a ordem de chegada. */
function semRepetir(urls) {
  const vistas = new Set();
  return urls.filter((url) => {
    if (vistas.has(url)) return false;
    vistas.add(url);
    return true;
  });
}

/**
 * Todas as fotos de um documento (produto ou variação), na ordem cadastrada.
 * Uma string com várias URLs coladas (separadas por vírgula, ponto e vírgula
 * ou quebra de linha) também vale: é o jeito mais rápido de colar vários
 * links de uma vez no console do Firebase.
 * @returns {string[]}
 */
export function extrairImagens(fonte) {
  if (!fonte || typeof fonte !== 'object') return [];

  const urls = [];
  const adicionar = (valor) => {
    const url = limparUrl(valor);
    if (url) urls.push(url);
  };

  CAMPOS_DE_LISTA.forEach((campo) => {
    const valor = fonte[campo];
    if (Array.isArray(valor)) valor.forEach(adicionar);
    else if (typeof valor === 'string') valor.split(/[\n,;]+/).forEach(adicionar);
  });

  CAMPOS_DE_FOTO_UNICA.forEach((campo) => adicionar(fonte[campo]));

  return semRepetir(urls);
}

/** A foto que representa uma cor nos chips do seletor (a primeira que houver). */
export function capaDaCor(variacoesDaCor) {
  for (const variacao of variacoesDaCor || []) {
    const [primeira] = extrairImagens(variacao);
    if (primeira) return primeira;
  }
  return null;
}

/**
 * O carrossel da cor escolhida: as fotos daquela cor primeiro (é o par que o
 * vendedor está mostrando ao cliente), depois as fotos gerais do produto.
 * Se a cor escolhida não tiver foto nenhuma e o produto também não, cai para
 * as fotos das outras cores — uma foto do modelo em outra cor ainda ajuda
 * mais que um quadrado vazio.
 *
 * @param {object|null} produto  documento do produto
 * @param {object|null} grupo    o grupo de cor em destaque (de agruparPorCor)
 * @param {Array} grupos         todos os grupos, usados só como último recurso
 * @returns {string[]} lista pronta para o carrossel (pode vir vazia)
 */
export function galeriaDoGrupo(produto, grupo, grupos = []) {
  const fotosDaVariacao = (lista) => (lista || []).flatMap((v) => extrairImagens(v));

  const combinadas = semRepetir([
    ...fotosDaVariacao(grupo?.tamanhos),
    ...extrairImagens(produto),
  ]);
  if (combinadas.length > 0) return combinadas;

  const reservas = (grupos || [])
    .filter((outro) => outro !== grupo)
    .flatMap((outro) => fotosDaVariacao(outro.tamanhos));
  return semRepetir(reservas);
}
