# Como adicionar fotos nos produtos

A tela de detalhes do produto tem um **carrossel**: o cliente arrasta para o lado
e vê várias fotos do mesmo tênis. Este guia é o passo a passo para colocar
fotos novas lá — não precisa mexer em código.

## A regra em uma frase

> Adicione um campo chamado **`imagens`** no Firebase, do tipo **array**, e
> coloque dentro dele **uma URL por linha**. A ordem que você digitar é a ordem
> que aparece no carrossel.

Quem já tem `imagemUrl` cadastrado não precisa fazer nada: o campo antigo
continua funcionando e a foto dele entra no fim do carrossel.

## Onde colocar: no produto ou na variação?

São dois lugares possíveis, e cada um tem um efeito diferente:

| Onde você cadastra | O que acontece | Use quando |
|---|---|---|
| Coleção **`variacoes`** (um documento de cor/numeração) | A foto aparece **só quando aquela cor está escolhida** | A foto mostra a cor específica (o preto, o branco…) |
| Coleção **`produtos`** (o documento do modelo) | A foto aparece em **todas as cores**, depois das fotos da cor | Foto da sola, da etiqueta, da caixa, do tênis no pé |

O carrossel monta a lista assim, nesta ordem:

1. as fotos das variações **da cor escolhida**;
2. as fotos gerais **do produto**;
3. se não houver nenhuma das duas, as fotos das **outras cores** (melhor uma
   foto do modelo em outra cor do que um quadrado vazio).

Fotos repetidas nos dois lugares aparecem uma vez só.

## Passo a passo no console do Firebase

1. Abra o [console do Firebase](https://console.firebase.google.com/) →
   **Firestore Database**.
2. Entre na coleção `variacoes` (foto de uma cor) ou `produtos` (foto do modelo).
3. Abra o documento do tênis que você quer.
4. Clique em **Adicionar campo**.
   - **Nome do campo:** `imagens`
   - **Tipo:** `array`
5. Dentro do array, clique em **Adicionar item**, escolha o tipo `string` e cole
   a URL da foto. Repita para cada foto.
6. Salve. **Não precisa reinstalar nem recompilar o app** — a tela de produto lê
   o estoque em tempo real; basta sair e entrar de novo no produto.

O resultado no Firestore fica assim:

```
produtos/abc123
  nome: "Nike Air Max"
  imagens: ["https://.../frente.jpg", "https://.../sola.jpg"]

variacoes/xyz789
  produto_id: "abc123"
  cor: "Preto"
  tamanho: 40
  estoque: 3
  imagens: ["https://.../preto-lado.jpg", "https://.../preto-tras.jpg"]
```

## Atalhos que também funcionam

Foram aceitos de propósito, porque o cadastro é feito à mão e cada pessoa
digita de um jeito:

- **Colar várias URLs de uma vez.** Se for mais rápido, crie `imagens` como
  `string` e cole as URLs separadas por vírgula, ponto e vírgula ou quebra de
  linha: `foto1.jpg, foto2.jpg, foto3.jpg`.
- **Outros nomes de campo.** Além de `imagens`, valem `fotos` e `galeria` (para
  listas) e `imagemUrl`, `imagem_url`, `imagem` e `foto` (para uma foto só).
- **Espaços sobrando e itens em branco** são descartados sozinhos.

## De onde tirar a URL da foto

A URL precisa ser pública e terminar na imagem em si (`.jpg`, `.png`, `.webp`).

- **Firebase Storage** (recomendado): faça o upload em Storage → abra o arquivo
  → copie o **Download URL**.
- Qualquer outro link público de imagem também funciona.

Se a foto não aparecer, quase sempre é a URL: abra ela no navegador. Se o
navegador não mostrar a imagem sozinha, o app também não vai mostrar.

## Dicas de foto (o que fica bonito no carrossel)

- **Quadradas ou levemente retrato.** A moldura do carrossel é larga e tem 280
  de altura; a foto é cortada pelo centro (`cover`).
- **3 a 5 fotos por cor** é o ponto certo: dá para arrastar sem cansar, e as
  miniaturas embaixo continuam cabendo na tela.
- **A primeira foto é a capa.** Ela é quem aparece no chip da cor, na Sacola e
  nos Relatórios — coloque a melhor foto do tênis inteiro em primeiro lugar.
- **Fundo limpo e mesma distância** em todas as fotos: quando o cliente arrasta,
  o tênis não "pula" de lugar.

## Onde isso está no código

- `dominio/galeria.js` — decide quais fotos entram e em que ordem (é onde os
  nomes de campo aceitos estão listados).
- `testes/galeria.test.mjs` — os testes que travam essas regras.
- `ProdutoScreen.js` (`renderCarrossel`) — desenha o carrossel, os pontinhos,
  o contador e as miniaturas.
