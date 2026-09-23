import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;

const ast = (f) => parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });

// Rotas registradas no App.js (Stack.Screen / Tab.Screen name="...")
const registradas = new Set();
traverse(ast('App.js'), {
  JSXOpeningElement(p) {
    const n = p.node.name;
    const tag = n.object ? `${n.object.name}.${n.property.name}` : n.name;
    if (tag !== 'Stack.Screen' && tag !== 'Tab.Screen') return;
    for (const attr of p.node.attributes) {
      if (attr.name?.name === 'name' && attr.value?.type === 'StringLiteral') registradas.add(attr.value.value);
    }
  },
});

// Alvos de navigate(...) em todos os arquivos
const arquivos = fs.readdirSync('.').filter((f) => f.endsWith('.js'));
let erros = 0;
const alvos = new Set();
for (const f of arquivos) {
  traverse(ast(f), {
    CallExpression(p) {
      const cal = p.node.callee;
      if (cal.type !== 'MemberExpression' || cal.property.name !== 'navigate') return;
      const arg = p.node.arguments[0];
      if (arg?.type !== 'StringLiteral') return;
      alvos.add(`${f}|${arg.value}`);
      if (!registradas.has(arg.value)) {
        console.log(`ERRO ${f}: navigate('${arg.value}') não é uma rota registrada`);
        erros++;
      }
    },
  });
}
console.log('Rotas registradas:', [...registradas].join(', '));
console.log(erros === 0 ? 'NAVEGACAO: ok' : `NAVEGACAO: ${erros} erro(s)`);
