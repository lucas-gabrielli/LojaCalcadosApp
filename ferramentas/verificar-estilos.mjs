import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;

const ler = (f) => fs.readFileSync(f, 'utf8');
const ast = (f) => parse(ler(f), { sourceType: 'module', plugins: ['jsx'] });

// 1) Quais chaves cada get*Styles define?
const estilos = {};
traverse(ast('styles.js'), {
  VariableDeclarator(p) {
    const nome = p.node.id.name;
    if (!nome || !nome.startsWith('get')) return;
    const chaves = new Set();
    p.traverse({
      ObjectProperty(op) {
        const k = op.node.key;
        const parentFn = op.getFunctionParent();
        chaves.add(k.name || k.value);
      },
    });
    estilos[nome] = chaves;
  },
});

// 2) Cada tela: qual factory usa e quais styles.X referencia?
const arquivos = fs.readdirSync('.').filter((f) => f.endsWith('.js') && !['index.js', 'styles.js'].includes(f));
let problemas = 0;
for (const f of arquivos) {
  const a = ast(f);
  let factory = null;
  const usados = new Set();
  traverse(a, {
    ImportDeclaration(p) {
      if (p.node.source.value !== './styles') return;
      for (const e of p.node.specifiers) {
        if (e.imported && e.imported.name.startsWith('get')) factory = e.imported.name;
      }
    },
    MemberExpression(p) {
      if (p.node.object.name === 'styles' && p.node.property.name) usados.add(p.node.property.name);
    },
  });
  if (!factory) continue;
  const definidos = estilos[factory];
  if (!definidos) { console.log(`ERRO ${f}: factory ${factory} não existe`); problemas++; continue; }
  for (const u of usados) {
    if (!definidos.has(u)) { console.log(`ERRO ${f}: styles.${u} não existe em ${factory}`); problemas++; }
  }
}
console.log(problemas === 0 ? 'ESTILOS: ok' : `ESTILOS: ${problemas} problema(s)`);
