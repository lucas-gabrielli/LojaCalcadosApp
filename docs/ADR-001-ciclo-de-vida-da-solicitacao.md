# ADR-001 — Extrair o ciclo de vida da solicitação para um módulo de domínio

**Status:** Aceito · 17/09/2026
**Projeto:** CeleRun / LojaCalcadosApp — Projeto Integrador
**Autores:** Phelipe, João Pedro Ferro, Lucas Gabrielli

## Contexto

O diagnóstico do Bloco 1 mediu 3.457 linhas em 19 arquivos `.js`, todos na raiz, sem
nenhuma pasta e sem nenhum teste.

A regra central do produto — confirmar a venda, que passa a solicitação de `pendente`
para `vendida` e dá baixa no estoque — estava escrita **duas vezes, nenhuma exportada**:
`ProdutoScreen.js:183–199` (17 linhas) e `SolicitacoesScreen.js:113–141` (29 linhas).
Para alcançá-la seria preciso abrir **6 arquivos e 1.841 linhas** e, ainda assim, só se
chegava a renderizar a tela e apertar o botão.

Nenhuma das cópias era atômica: dois `updateDoc` em sequência, sem transação. Se o
segundo falhasse, a solicitação ficava vendida com o estoque intacto — exatamente a
ruptura de dados que o CeleRun existe para evitar.

Ao todo, **136 linhas de regra** já estavam escritas mais de uma vez, e o vocabulário de
status aparecia **21 vezes em 6 arquivos**.

A próxima funcionalidade do backlog é o **Módulo Runner**, que insere estados
intermediários no ciclo. Hoje, acrescentar um único estado obrigava a abrir
**5 arquivos e 1.180 linhas**.

## Decisão

O ciclo de vida da solicitação passa a viver num módulo de domínio puro
(`dominio/solicitacao.js`, sem React, sem Firebase e sem I/O, que decide e devolve um
plano de escritas) e um repositório (`dados/solicitacoesRepo.js`) passa a ser o único
lugar do app que fala com o SDK do Firestore; as telas apenas chamam os dois.

## Alternativas descartadas

**1. Reescrever do zero, já com o Runner e camadas.**
Descartada: o app funciona e o Projeto Integrador tem prazo. Uma reescrita troca um
sistema com dois defeitos conhecidos por um sistema com defeitos desconhecidos — e não
existia um único teste para dizer se o resultado ficou equivalente. Custo alto, risco
alto, benefício adiado para depois da entrega.

**2. Só deduplicar: mover a função para um arquivo de utilitários.**
Descartada: tira a duplicação e deixa o acoplamento. A função continuaria chamando
`updateDoc` direto, continuaria intestável sem Firebase, e o Runner continuaria
precisando do SDK dentro da tela. Resolve o sintoma mais visível e nenhum dos três
custos medidos.

**3. Atacar primeiro a Pergunta 1 (isolar toda a persistência).**
Descartada: é a mudança mais cara que medimos (1.942 linhas em 13 arquivos) e não
desbloqueia nada do backlog. Cabe depois, em fatias, apoiada no repositório que nasce
aqui.

**4. Adotar TypeScript para o compilador vigiar a máquina de estados.**
Descartada por tamanho e por ser ortogonal: não cabe em 90 minutos, e a regra
continuaria dentro do componente — só que tipada.

## Consequências

### O que melhora

- A regra de venda vira chamável sem servidor, banco ou interface: `npm test` roda no
  test runner nativo do Node, sem instalar nada.
- As duas escritas da venda passam a ir num `writeBatch`: status e estoque não podem
  mais divergir.
- Acrescentar um estado ao ciclo vira uma edição em um arquivo, não em cinco.
- O lead time — o indicador do artigo — passa a ser conferível com números escolhidos
  por nós.

### O que piora (o custo desta decisão)

- **Duas indireções novas.** Entender a venda agora exige abrir três arquivos em vez de
  um. Para quem chega no código, ficou menos óbvio.
- **Convivem dois jeitos de gravar.** As telas migradas usam o repositório;
  `HomeScreen`, `SacolaScreen` e `RelatorioScreen` seguem no SDK direto. É dívida
  assumida, com prazo, não resolvida.
- **O "plano de escritas" é uma abstração nossa.** Se virar um repasse de chamadas, vira
  camada morta.
- Mais 2 arquivos de produção e ~270 linhas num projeto de 3.457.

### O que passa a ser possível

- O Módulo Runner consome o mesmo domínio: os estados novos entram no módulo e as telas
  existentes os herdam. O gancho da fila do depósito
  (`assinarFilaDoDeposito`) já está no repositório.
- O painel web gerencial importa a mesma regra em vez de recopiá-la.
- Escrever um teste de regressão para qualquer bug que apareça na banca leva minutos.

## Fora de escopo hoje

Sabemos que seria bom fazer. Não vamos fazer nesta sessão.

- Os estados novos do Runner (em separação, a caminho, entregue) e o alerta de ruptura.
- A tela do Runner e o uso da fila do depósito — hoje sai só o gancho.
- Migrar `HomeScreen`, `SacolaScreen` e `RelatorioScreen` para o repositório.
- Encapsular o AsyncStorage — sacola, histórico e biometria ficam como estão.
- Reorganizar os 19 arquivos da raiz em pastas por camada.
- Tirar as credenciais do Firebase de dentro de `firebaseConfig.js` e escrever regras de
  segurança no Firestore.
- Quebrar `styles.js` — 1.131 linhas, 33% do projeto.
- TypeScript, lint, integração contínua e qualquer troca de banco.

---

## Antes e depois (critério de pronto do Bloco 3)

| Métrica                                           | Antes            | Depois                    |
|---------------------------------------------------|------------------|---------------------------|
| Abrir para acrescentar um estado ao ciclo          | 5 arq · 1.180 ln | 1 arq · 134 ln            |
| Chamar a regra de venda sem renderizar             | impossível       | `npm test` — 15 testes    |
| Cópias da regra de confirmação de venda            | 2                | 1                         |
| Telas que gravam no Firestore                      | 3                | 0                         |
| Escritas da venda são atômicas                     | não              | sim (`writeBatch`)        |
| Arquivos de teste                                  | 0                | 2 (15 casos)              |
