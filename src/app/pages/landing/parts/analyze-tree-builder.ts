// Helpers for building analyze/impact trees from analyzer responses.
export function buildAnalyzeTreeFromImpactedModules(
  impactedModules: string[] | any
): Array<{ name: string; children?: any[]; key?: string; count?: number }> {
  const out: any[] = [];
  if (!impactedModules) return out;
  const modules = Array.isArray(impactedModules) ? impactedModules : impactedModules.items ?? [];

  let reposData: any = null;
  try {
    reposData = JSON.parse(sessionStorage.getItem('reposData') || 'null');
  } catch (e) {
    reposData = null;
  }
  const details = reposData?.details ?? {};

  const repoMap: Record<string, string[]> = {};

  const findRepoForClass = (classFullName: string): string | null => {
    const parts = classFullName.split('.').filter(Boolean);
    const classFile = parts[parts.length - 1] + '.java';
    for (const id of Object.keys(details || {})) {
      const files = details[id]?.files ?? [];
      const found = searchFilesForPath(files, parts, classFile);
      if (found) return id;
    }
    return null;
  };

  for (const m of modules) {
    const className = typeof m === 'string' ? m : m.moduleName ?? m.name ?? '';
    if (!className) continue;
    const repoId = findRepoForClass(className) || 'unknown';
    repoMap[repoId] = repoMap[repoId] || [];
    repoMap[repoId].push(className);
  }

  for (const repoId of Object.keys(repoMap)) {
    const name = details[repoId]?.name || (repoId === 'unknown' ? 'Unknown Project' : `Repo ${repoId}`);
    const classes = repoMap[repoId];
    const rootChildren: any[] = [];
    for (const cls of classes) {
      const parts = cls.split('.').filter(Boolean);
      if (parts.length === 0) continue;
      let curChildren = rootChildren;
      for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        let node = curChildren.find((c: any) => c.type === 'folder' && c.name === seg);
        if (!node) {
          node = { name: seg, type: 'folder', children: [] };
          curChildren.push(node);
        }
        curChildren = node.children;
      }
      const fileName = parts[parts.length - 1] + '.java';
      curChildren.push({ name: fileName, type: 'file' });
    }
    out.push({ name, children: rootChildren });
  }

  return out;
}

export function buildAnalyzeTreeFromActionableImpacts(
  respArray: any[]
): Array<{ name: string; children?: any[]; key?: string; count?: number }> {
  const out: any[] = [];
  if (!Array.isArray(respArray) || respArray.length === 0) return out;

  let reposData: any = null;
  try {
    reposData = JSON.parse(sessionStorage.getItem('reposData') || 'null');
  } catch (e) {
    reposData = null;
  }
  const details = reposData?.details ?? reposData?.detail ?? {};

  const findRepoForClass = (classFullName: string): string | null => {
    if (!classFullName) return null;
    const parts = classFullName.split('.').filter(Boolean);
    const classFile = parts[parts.length - 1] + '.java';
    for (const id of Object.keys(details || {})) {
      const files = details[id]?.files ?? [];
      try {
        const found = searchFilesForPath(files, parts, classFile);
        if (found) return id;
      } catch (e) {
        /* ignore */
      }
    }
    return null;
  };

  const repoMap: Record<string, Record<string, any[]>> = {};

  for (const item of respArray) {
    const impacts = Array.isArray(item.actionableImpacts) ? item.actionableImpacts : [];
    for (const imp of impacts) {
      const classFull = imp.moduleName || imp.module || imp.module_full_name || imp.name || '';
      if (!classFull) continue;
      const repoId = findRepoForClass(classFull) || 'unknown';
      repoMap[repoId] = repoMap[repoId] || {};
      repoMap[repoId][classFull] = repoMap[repoId][classFull] || [];
      repoMap[repoId][classFull].push(imp);
    }
  }

  for (const repoId of Object.keys(repoMap)) {
    const projName = details[repoId]?.name || (repoId === 'unknown' ? 'Unknown Project' : `Repo ${repoId}`);
    const classMap = repoMap[repoId];
    const classChildren: any[] = [];
    for (const classFull of Object.keys(classMap)) {
      const impacts = classMap[classFull] || [];
      const parts = classFull.split('.').filter(Boolean);
      const classSimple = parts.length ? parts[parts.length - 1] : classFull;
      const fileName = classSimple + '.java';
      const impactNodes = impacts.map((im: any, idx: number) => {
        const title = `${String(im.impactType ?? im.type ?? 'IMPACT').toUpperCase()} — ${String(
          im.issue ?? im.description ?? im.summary ?? ''
        )}`.trim();
        return { name: title, key: `${repoId}/${classFull}/impact-${idx}`, impact: im };
      });
      classChildren.push({ name: fileName, key: `${repoId}/${classFull}`, children: impactNodes, count: impactNodes.length });
    }
    out.push({ name: projName, key: `proj-${repoId}`, children: classChildren, count: classChildren.reduce((s, c) => s + (c.count || 0), 0) });
  }

  return out;
}

export function searchFilesForPath(nodes: any[], packageParts: string[], fileName: string): boolean {
  if (!nodes || nodes.length === 0) return false;
  const [first, ...rest] = packageParts;
  for (const n of nodes) {
    if (rest.length === 0) {
      if (n.type === 'file' && n.name === fileName) return true;
      if (n.type === 'folder' && n.name === first) {
        if (searchFilesForPath(n.children || [], [], fileName)) return true;
      }
    } else {
      if (n.type === 'folder' && n.name === first) {
        if (searchFilesForPath(n.children || [], rest, fileName)) return true;
      }
    }
    if (n.children && n.children.length) {
      if (searchFilesForPath(n.children, packageParts, fileName)) return true;
    }
  }
  return false;
}
