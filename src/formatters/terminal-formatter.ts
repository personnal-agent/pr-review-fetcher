import { PRReviewReport, ReviewComment, CodeModification } from '../types';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  underline: '\x1b[4m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  gray: '\x1b[90m'
};

function formatSeverityBadge(severity?: string): string {
  if (!severity) return '';
  const s = severity.toUpperCase();
  if (s === 'P0' || s === 'P1') {
    return `${ANSI.bgRed}${ANSI.white}${ANSI.bold} ${s} CRITIQUE ${ANSI.reset}`;
  }
  if (s === 'P2') {
    return `${ANSI.bgYellow}${ANSI.white}${ANSI.bold} ${s} IMPORTANT ${ANSI.reset}`;
  }
  if (s === 'P3') {
    return `${ANSI.bgBlue}${ANSI.white}${ANSI.bold} ${s} MINEUR ${ANSI.reset}`;
  }
  return `${ANSI.bgBlue}${ANSI.white}${ANSI.bold} ${s} ${ANSI.reset}`;
}

function formatAuthorBadge(comment: ReviewComment): string {
  const botName = comment.botMetadata?.botName;
  if (botName === 'greptile') {
    return `${ANSI.cyan}${ANSI.bold}[${comment.author} (Greptile)]${ANSI.reset}`;
  }
  if (botName === 'coderabbit') {
    return `${ANSI.magenta}${ANSI.bold}[${comment.author} (CodeRabbit)]${ANSI.reset}`;
  }
  if (botName === 'deepsource') {
    return `${ANSI.blue}${ANSI.bold}[${comment.author} (DeepSource)]${ANSI.reset}`;
  }
  if (comment.isBot) {
    return `${ANSI.yellow}[${comment.author} (Bot)]${ANSI.reset}`;
  }
  return `${ANSI.green}[${comment.author}]${ANSI.reset}`;
}

export function formatDiffHunk(diffHunk: string, side?: string): string {
  const lines = diffHunk.split('\n');
  let currentOldLine = 0;
  let currentNewLine = 0;
  const isLeft = side === 'LEFT';

  return lines
    .map(line => {
      const headerMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
      if (headerMatch) {
        currentOldLine = parseInt(headerMatch[1], 10);
        currentNewLine = parseInt(headerMatch[2], 10);
        return `  ${ANSI.cyan}${ANSI.dim}${line}${ANSI.reset}`;
      }
      if (line.startsWith('+')) {
        const lineNum = currentNewLine > 0 ? String(currentNewLine++).padStart(4, ' ') : '    ';
        const content = line.slice(1);
        const suffix = content.length > 0 ? ` ${content}` : '';
        return `${ANSI.green}${lineNum} +${suffix}${ANSI.reset}`;
      }
      if (line.startsWith('-')) {
        const lineNum = currentOldLine > 0 ? String(currentOldLine++).padStart(4, ' ') : '    ';
        const content = line.slice(1);
        const suffix = content.length > 0 ? ` ${content}` : '';
        return `${ANSI.red}${lineNum} -${suffix}${ANSI.reset}`;
      }
      if (line.startsWith(' ')) {
        const num = isLeft ? currentOldLine : currentNewLine;
        const lineNum = num > 0 ? String(num).padStart(4, ' ') : '    ';
        if (currentOldLine > 0) currentOldLine++;
        if (currentNewLine > 0) currentNewLine++;
        const content = line.slice(1);
        const suffix = content.length > 0 ? ` ${content}` : '';
        return `${ANSI.gray}${lineNum}  ${suffix}${ANSI.reset}`;
      }
      // Gérer le repli si codeContext pré-formaté est passé
      const preAdd = line.match(/^(\s*\d+\s+)\+(.*)$/);
      if (preAdd) {
        return `${ANSI.green}${preAdd[1]}+${preAdd[2]}${ANSI.reset}`;
      }
      const preDel = line.match(/^(\s*\d+\s+)\-(.*)$/);
      if (preDel) {
        return `${ANSI.red}${preDel[1]}-${preDel[2]}${ANSI.reset}`;
      }
      const preCtx = line.match(/^(\s*\d+\s+) (.*)$/);
      if (preCtx) {
        return `${ANSI.gray}${preCtx[1]} ${preCtx[2]}${ANSI.reset}`;
      }
      return `${ANSI.gray}     ${line}${ANSI.reset}`;
    })
    .join('\n');
}

function formatModifications(mods: CodeModification[]): string {
  if (mods.length === 0) return '';
  const out: string[] = [];

  for (const mod of mods) {
    const header = `  ┌── ${ANSI.bold}${ANSI.green}MODIFICATION RECOMMANDÉE (${mod.type})${ANSI.reset} ─────────────────────────────┐`;
    const lines = mod.content.split('\n').map(l => `  │ ${ANSI.green}${l}${ANSI.reset}`);
    const footer = `  └─────────────────────────────────────────────────────────────────┘`;
    out.push([header, ...lines, footer].join('\n'));
  }

  return out.join('\n\n');
}

export function formatTerminal(report: PRReviewReport): string {
  const out: string[] = [];

  // En-tête général
  const lineBar = '═'.repeat(70);
  out.push(`${ANSI.cyan}${lineBar}${ANSI.reset}`);
  out.push(
    `${ANSI.bold}Pull Request #${report.target.pullNumber} : ${report.title}${ANSI.reset}`
  );
  out.push(
    `${ANSI.dim}Dépôt : ${report.target.owner}/${report.target.repo} | Auteur : ${report.author} | Branche : ${report.head} -> ${report.base}${ANSI.reset}`
  );
  out.push(
    `${ANSI.dim}URL : ${report.target.url} | Total commentaires : ${report.totalComments}${ANSI.reset}`
  );
  out.push(`${ANSI.cyan}${lineBar}${ANSI.reset}\n`);

  if (report.comments.length === 0) {
    out.push(`${ANSI.yellow}Aucun commentaire de revue trouvé sur cette Pull Request.${ANSI.reset}\n`);
    return out.join('\n');
  }

  // Commentaires détaillés
  for (let i = 0; i < report.comments.length; i++) {
    const c = report.comments[i];
    const linesRange = c.startLine && c.startLine !== c.line ? `${c.startLine}-${c.line}` : `${c.line ?? 'N/A'}`;
    const fileHeader = `\n${ANSI.bold}📁 ${c.path} (ligne ${linesRange})${ANSI.reset}`;
    const authorAndBadge = `${formatAuthorBadge(c)} ${formatSeverityBadge(c.botMetadata?.severity)}`;

    out.push(`${fileHeader}`);
    out.push(`  ${authorAndBadge}`);

    if (c.botMetadata?.title) {
      out.push(`  ${ANSI.bold}${c.botMetadata.title}${ANSI.reset}`);
    }

    if (c.diffHunk || c.codeContext) {
      out.push(`\n  ${ANSI.dim}--- Contexte du code ---${ANSI.reset}`);
      const textToFormat = c.diffHunk || c.codeContext || '';
      const indentedDiff = formatDiffHunk(textToFormat, c.side)
        .split('\n')
        .map(l => `  ${l}`)
        .join('\n');
      out.push(indentedDiff);
    }

    if (c.explanation) {
      out.push(`\n  ${ANSI.dim}--- Explication ---${ANSI.reset}`);
      const indentedExp = c.explanation
        .split('\n')
        .map(l => `  ${l}`)
        .join('\n');
      out.push(indentedExp);
    }

    if (c.botMetadata?.artifacts && c.botMetadata.artifacts.length > 0) {
      out.push(`\n  ${ANSI.dim}--- Artefacts ---${ANSI.reset}`);
      for (const art of c.botMetadata.artifacts) {
        out.push(`  • ${ANSI.yellow}${art}${ANSI.reset}`);
      }
    }

    if (c.modifications.length > 0) {
      out.push('\n' + formatModifications(c.modifications));
    }

    out.push(`${ANSI.gray}  Lien : ${c.url}${ANSI.reset}`);
    out.push(`${ANSI.gray}${'-'.repeat(70)}${ANSI.reset}`);
  }

  out.push(
    `\n${ANSI.green}✔ ${report.comments.length} commentaire(s) de revue analysé(s) avec succès.${ANSI.reset}\n`
  );

  return out.join('\n');
}
