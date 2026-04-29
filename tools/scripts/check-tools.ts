import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { workspaceTools } from '../../apps/maya-web/src/domain/workspace/tools';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const corePath = path.join(
  repoRoot,
  'apps',
  'maya-web',
  'src',
  'domain',
  'workspace',
  'core',
  'WorkspaceState.ts'
);
const ignorePath = path.join(__dirname, 'tool-registry-ignore.json');

const readIgnoreList = (): Set<string> => {
  if (!fs.existsSync(ignorePath)) {
    return new Set();
  }
  const raw = fs.readFileSync(ignorePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== 'string')) {
      throw new Error('Ignore file must be a JSON array of command strings.');
    }
    return new Set(parsed);
  } catch (error) {
    throw new Error(`Failed to parse ${path.relative(repoRoot, ignorePath)}: ${(error as Error).message}`);
  }
};

const sourceText = fs.readFileSync(corePath, 'utf8');
const sourceFile = ts.createSourceFile(corePath, sourceText, ts.ScriptTarget.Latest, true);

const commandTypes = new Set<string>();

const collectCommandTypes = (node: ts.Node): void => {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === 'WorkspaceCommand') {
    const visitTypeNode = (typeNode: ts.TypeNode | undefined) => {
      if (!typeNode) {
        return;
      }
      if (ts.isParenthesizedTypeNode(typeNode)) {
        visitTypeNode(typeNode.type);
        return;
      }
      if (ts.isUnionTypeNode(typeNode)) {
        typeNode.types.forEach((child) => visitTypeNode(child));
        return;
      }
      if (ts.isTypeLiteralNode(typeNode)) {
        typeNode.members.forEach((member) => {
          if (!ts.isPropertySignature(member)) {
            return;
          }
          if (member.name && ts.isIdentifier(member.name) && member.name.text === 'type') {
            const literalType = member.type;
            if (!literalType || !ts.isLiteralTypeNode(literalType)) {
              return;
            }
            const literal = literalType.literal;
            if (literal && ts.isStringLiteral(literal)) {
              commandTypes.add(literal.text);
            }
          }
        });
      }
    };
    visitTypeNode(node.type);
  }
  ts.forEachChild(node, collectCommandTypes);
};

collectCommandTypes(sourceFile);

if (!commandTypes.size) {
  console.error('Failed to discover any WorkspaceCommand types. Has the definition moved?');
  process.exit(1);
}

const ignoredCommands = readIgnoreList();

const toolCommandMap = new Map<string, string[]>();
workspaceTools.forEach((tool) => {
  const list = toolCommandMap.get(tool.commandType) ?? [];
  list.push(tool.name);
  toolCommandMap.set(tool.commandType, list);
});

const toolCommandTypes = new Set(toolCommandMap.keys());

const missing = [...commandTypes].filter(
  (commandType) => !toolCommandTypes.has(commandType) && !ignoredCommands.has(commandType)
);

const staleIgnores = [...ignoredCommands].filter((commandType) => !commandTypes.has(commandType));

const unknownToolTargets = [...toolCommandTypes].filter((commandType) => !commandTypes.has(commandType));

const errors: string[] = [];

if (missing.length) {
  errors.push(
    [
      'Missing workspace tools for the following commands:',
      ...missing.map((entry) => `  • ${entry}`),
      'Add corresponding entries to workspaceTools or add to the ignore list if intentional.',
    ].join('\n')
  );
}

if (unknownToolTargets.length) {
  errors.push(
    [
      'workspaceTools references unknown commands:',
      ...unknownToolTargets.map(
        (entry) => `  • ${entry} (tools: ${(toolCommandMap.get(entry) ?? []).join(', ') || 'unknown'})`
      ),
      'Confirm the command type literal matches WorkspaceCommand.',
    ].join('\n')
  );
}

if (staleIgnores.length) {
  errors.push(
    [
      'tool-registry-ignore.json contains invalid command names:',
      ...staleIgnores.map((entry) => `  • ${entry}`),
      'Remove these entries or update the command definitions.',
    ].join('\n')
  );
}

if (errors.length) {
  console.error(errors.join('\n\n'));
  process.exit(1);
}

console.log(
  `✅ Tool registry covers ${toolCommandTypes.size} command types (${commandTypes.size} total, ` +
    `${ignoredCommands.size} ignored).`
);

