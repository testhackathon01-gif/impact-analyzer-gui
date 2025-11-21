export function computeDiff(
  originalContent: string,
  modifiedContent: string
): { diffLines: { type: 'added' | 'removed' | 'changed' | 'unchanged'; content: string }[]; analyzePending: boolean } {
  const original = (originalContent ?? '').split('\n');
  const modified = (modifiedContent ?? '').split('\n');

  const origNorm = original.map((l) => String(l ?? '').replace(/\s+$/g, ''));
  const modNorm = modified.map((l) => String(l ?? '').replace(/\s+$/g, ''));

  const m = original.length;
  const n = modified.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (origNorm[i] === modNorm[j]) lcs[i][j] = 1 + lcs[i + 1][j + 1];
      else lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const diffLines: { type: 'added' | 'removed' | 'changed' | 'unchanged'; content: string }[] = [];
  let i = 0,
    j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && origNorm[i] === modNorm[j]) {
      diffLines.push({ type: 'unchanged', content: original[i] });
      i++;
      j++;
    } else if (j < n && (i === m || lcs[i][j + 1] >= lcs[i + 1][j])) {
      diffLines.push({ type: 'added', content: modified[j] });
      j++;
    } else if (i < m) {
      diffLines.push({ type: 'removed', content: original[i] });
      i++;
    } else {
      if (j < n) {
        diffLines.push({ type: 'added', content: modified[j] });
        j++;
      } else break;
    }
  }

  const hasRightContent = String(modifiedContent ?? '').trim().length > 0;
  const hasChange = diffLines.some((l) => l.type !== 'unchanged');
  const analyzePending = hasRightContent && hasChange;

  return { diffLines, analyzePending };
}
