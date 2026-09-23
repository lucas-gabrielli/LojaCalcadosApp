/**
 * Acusa identificadores usados mas nunca declarados/importados — o erro
 * "Property 'X' doesn't exist", que só aparecia em tempo de execução.
 */
import fs from 'fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
const traverse = _traverse.default;

const GLOBAIS = new Set([
  'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'require',
  'module', 'process', 'global', 'Date', 'Math', 'JSON', 'Object', 'Array', 'String',
  'Number', 'Boolean', 'Promise', 'Set', 'Map', 'Error', 'undefined', 'NaN', 'isNaN',
  'parseInt', 'parseFloat', 'fetch', '__DEV__', 'globalThis', 'Infinity', 'Symbol',
]);

const arquivos = [
  ...fs.readdirSync('.').filter((f) => f.endsWith('.js')),
  ...fs.readdirSync('dominio').map((f) => `dominio/${f}`).filter((f) => f.endsWith('.js')),
  ...fs.readdirSync('dados').map((f) => `dados/${f}`).filter((f) => f.endsWith('.js')),
];

let erros = 0;
for (const f of arquivos) {
  const ast = parse(fs.readFileSync(f, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
  traverse(ast, {
    Program(p) {
      for (const [nome, refs] of Object.entries(p.scope.globals)) {
        if (GLOBAIS.has(nome)) continue;
        const linha = refs.loc ? refs.loc.start.line : '?';
        console.log(`ERRO ${f}:${linha} — '${nome}' é usado mas não existe no escopo`);
        erros++;
      }
    },
  });
}
console.log(erros === 0 ? 'ESCOPO: ok' : `ESCOPO: ${erros} erro(s)`);
process.exit(erros === 0 ? 0 : 1);
