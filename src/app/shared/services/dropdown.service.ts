import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ApiResponse, DropdownItem } from '../interfaces/dropdown-data.interface';

@Injectable({
  providedIn: 'root'
})
export class DropdownService {
  private http = inject(HttpClient);

  // Convert a repository URL into a user-friendly display name.
  // Example: 'https://github.com/owner/consumer-service' -> 'Consumer-service'
  private formatRepoDisplayName(repoUrl: string): string {
    if (!repoUrl) return '';
    try {
      // strip query/hash
      const noQuery = repoUrl.split(/[?#]/)[0];
      // remove trailing slashes
      const trimmed = noQuery.replace(/\/+$|\/+$/g, '/').replace(/\/+$/g, '');
      // take last segment after '/'
      const parts = trimmed.split('/').filter(Boolean);
      let last = parts.length ? parts[parts.length - 1] : trimmed;
      // strip .git suffix if present
      if (last.endsWith('.git')) last = last.slice(0, -4);
      last = decodeURIComponent(last);
      return last.length ? last.charAt(0).toUpperCase() + last.slice(1) : last;
    } catch {
      return repoUrl;
    }
  }

  // Fetch repository mapping from external analyzer service, transform to { status, data, details }
  // The external API is expected to return an object where keys are repository URLs and values
  // are maps of fully-qualified-class-name -> source string.
  // Example input:
  // { "https://github.com/owner/repo": { "com.app.A": "package ...", ... }, ... }
  // We transform that into a scalable shape consumed by the UI:
  // { status: 'success', data: [ { id, name }, ... ], details: { id: { id, name, url, description, files } } }
  getDropdownData(): Observable<any> {
    const externalUrl = 'http://localhost:8080/api/v1/impact/metadata/repos';
    return this.http.get<Record<string, Record<string, string>>>(externalUrl).pipe(
      map((raw) => {
        try {
          if (!raw || typeof raw !== 'object') throw new Error('invalid payload');
          const details: Record<string, any> = {};
          const data: DropdownItem[] = [];

          const repoKeys = Object.keys(raw || {});
          if (repoKeys.length === 0) return { status: 'success', data, details };

          let idx = 1;
          const ensureFolder = (childrenArr: any[], folderName: string) => {
            let f = childrenArr.find(c => c.type === 'folder' && c.name === folderName);
            if (!f) {
              f = { name: folderName, type: 'folder', children: [] };
              childrenArr.push(f);
            }
            return f;
          };

          for (const repoUrl of repoKeys) {
            const repoObj = raw[repoUrl] ?? {};
            // dropdown should show a friendly name (last path segment of the repo URL)
            const displayName = this.formatRepoDisplayName(repoUrl);
            // include the original repo URL on the dropdown item so consumers can send the full URL
            data.push({ id: idx, name: displayName, url: repoUrl });

            // Build a package-folder tree from fully-qualified class names for this repo
            const packageRootChildren: any[] = [];
            for (const className of Object.keys(repoObj)) {
              const source = String(repoObj[className]);
              const parts = className.split('.').filter(Boolean);
              if (parts.length === 0) continue;
              let curChildren = packageRootChildren;
              for (let i = 0; i < parts.length - 1; i++) {
                const seg = parts[i];
                const folder = ensureFolder(curChildren, seg);
                curChildren = folder.children;
              }
              const fileName = parts[parts.length - 1] + '.java';
              curChildren.push({ name: fileName, type: 'file', content: source });
            }

            // assign details for this id; files contain the package-root children (e.g., com -> app -> analytics)
            // keep the original URL in the details.url, but store the friendly name for display
            details[String(idx)] = { id: idx, name: displayName, url: repoUrl, description: '', files: packageRootChildren };
            idx++;
          }

          return { status: 'success', data, details };
        } catch (e) {
          // fall through to fallback
          return { status: 'error' };
        }
      }),
      catchError(() => {
        // fallback to local mock /repos endpoint if external service unreachable
        return this.http.get('/repos').pipe(
          catchError(() => of({ data: [ { id: 1, name: 'Repo 1' } ] }))
        );
      })
    );
  }
}