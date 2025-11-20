import { Component, OnInit, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DropdownService } from '../../shared/services/dropdown.service';
import { DropdownItem } from '../../shared/interfaces/dropdown-data.interface';
import { FileNode } from '../../shared/interfaces/file-tree.interface';
import { ImpactVisualizationComponent } from '../../shared/components/impact-visualization/impact-visualization.component';
import { ProfileMenuComponent } from '../../shared/components/profile-menu/profile-menu.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ImpactVisualizationComponent,
    ProfileMenuComponent,
  ],
  template: `
    <div class="landing-container">
      <div class="ui-click-blocker" *ngIf="isBlockingUI" (click)="$event.stopPropagation()"></div>
      <!-- Main Header -->
      <div class="main-app-header">
        <h1>Echo Lens</h1>
        <app-profile-menu></app-profile-menu>
      </div>
      <div class="content-wrapper">
        <!-- Left sidebar with dropdown and file tree -->
        <div class="left-sidebar">
          <!-- Dropdown section -->
          <div class="panel-header select-repo-header header-text-color">SELECT REPOSITORY</div>
          <div class="dropdown-container">
            <div class="custom-select">
              <div class="select-header" (click)="toggleDropdown()">
                <span>{{
                  selectedItemId ? getSelectedItemName() || 'Select Repo...' : 'Select Repo...'
                }}</span>
                <span class="arrow">{{ isDropdownOpen ? '▾' : '▸' }}</span>
              </div>
              <div class="select-options" *ngIf="isDropdownOpen" (click)="$event.stopPropagation()">
                <div
                  class="option-item"
                  (click)="resetSelection()"
                  [class.selected]="!selectedItemId"
                >
                  Select Repo...
                </div>

                <!-- Normal dropdown list -->
                <div *ngIf="!showRepoDetails">
                  <div
                    class="option-item"
                    *ngFor="let item of dropdownItems"
                    (click)="onOptionSelect(item)"
                    [class.selected]="selectedItemId === item.id.toString()"
                  >
                    {{ item.name }}
                  </div>
                </div>

                <!-- Analyze mode: show checkboxes for multiple repos -->
                <div *ngIf="showRepoDetails">
                  <div class="option-item" *ngFor="let item of dropdownItems">
                    <label class="checkbox-label">
                      <input
                        type="checkbox"
                        [checked]="selectedRepoIds.has(item.id)"
                        (change)="toggleRepoSelection(item, $event)"
                      />
                      <span>{{ item.name }}</span>
                    </label>
                  </div>
                  <div class="dropdown-actions">
                    <button
                      *ngIf="selectedRepoIds.size > 0"
                      type="button"
                      class="apply-btn"
                      (click)="
                        analyzeSelectedRepos(); $event.preventDefault(); $event.stopPropagation()
                      "
                    >
                      Analyze
                    </button>
                    <button
                      type="button"
                      class="cancel-btn"
                      (click)="cancelAnalyze(); $event.preventDefault(); $event.stopPropagation()"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- File tree section -->
          <div class="tree-panel">
            <div class="panel-header header-text-color" [class.no-file]="!selectedFile">
              <div
                style="display:flex; align-items:center; gap:12px; width:100%; justify-content:space-between;"
              >
                <div style="font-weight:600">File Tree</div>
                <div class="panel-controls" style="display:flex; gap:8px;">
                  <button
                    type="button"
                    class="control-btn"
                    (click)="expandAllFolders(); $event.stopPropagation()"
                    title="Expand all"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    class="control-btn"
                    (click)="collapseAllFolders(); $event.stopPropagation()"
                    title="Collapse all"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>
            <div class="tree-content">
              <ng-container *ngIf="fileTree && fileTree.length; else emptyTree">
                <ng-container
                  *ngTemplateOutlet="fileTpl; context: { $implicit: fileTree }"
                ></ng-container>
                <ng-template #fileTpl let-nodes>
                  <ul class="tree-root">
                    <li
                      *ngFor="let node of nodes"
                      [class.folder]="node.type === 'folder'"
                      [class.file]="node.type !== 'folder'"
                    >
                      <div class="an-node-row node-row" (click)="onNodeClick(node)">
                        <button
                          *ngIf="node.type === 'folder'"
                          type="button"
                          class="node-toggle"
                          (click)="$event.stopPropagation(); toggleFolder(node)"
                        >
                          {{ node.isExpanded ? '-' : '+' }}
                        </button>
                        <span class="node-icon">{{ getFileIcon(node) }}</span>
                        <span class="node-name" [class.active]="selectedFile === node">{{
                          node.name
                        }}</span>
                      </div>
                      <div
                        class="tree-children"
                        *ngIf="node.children && node.children.length && node.isExpanded"
                      >
                        <ng-container
                          *ngTemplateOutlet="fileTpl; context: { $implicit: node.children }"
                        ></ng-container>
                      </div>
                    </li>
                  </ul>
                </ng-template>
              </ng-container>
              <ng-template #emptyTree>
                <div class="editor-placeholder">No files loaded</div>
              </ng-template>
            </div>
          </div>
        </div>
        <!-- Main content -->
        <div class="main-content">
          <div class="editor-panel">
            <div class="panel-header main-header">File Comparison</div>
            <div class="editor-actions">
              <div class="left-actions">
                <button type="button" class="editor-toggle" (click)="toggleSplitView()">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    style="margin-right: 4px; vertical-align: text-bottom;"
                  >
                    <path fill="currentColor" d="M3 5v14h18V5H3zm16 12H5V7h14v10z" />
                    <path fill="currentColor" d="M11 7h2v10h-2z" />
                  </svg>
                  {{ isSplitView ? 'Single View' : 'Split Compare' }}
                </button>
                <button
                  type="button"
                  class="editor-sync"
                  (click)="syncEditors()"
                  [disabled]="!isSplitView"
                  [hidden]="isSplitView"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    style="margin-right: 4px; vertical-align: text-bottom;"
                  >
                    <path
                      fill="currentColor"
                      d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"
                    />
                  </svg>
                  Sync
                </button>
                <button
                  type="button"
                  class="undo-btn"
                  (click)="undoCompareChange()"
                  [disabled]="!canUndo"
                  *ngIf="isSplitView"
                  title="Undo last change in compare pane"
                >
                  Undo
                </button>
              </div>
              <button
                type="button"
                class="analyze-impact-btn"
                (click)="startAnalyze(); $event.stopPropagation()"
                [class.active]="analyzePending || selectedRepoIds.size > 0"
                [disabled]="!canAnalyze"
                [hidden]="isSplitView || selectedRepoIds.size === 0"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  style="margin-right:6px; vertical-align:text-bottom;"
                >
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14z"
                  />
                </svg>
                Analyze Impact
              </button>

              <button
                type="button"
                class="check-impact-btn"
                (click)="onCheckImpactClick($event)"
                [disabled]="!isSplitView || isChecking"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  style="margin-right: 4px; vertical-align: text-bottom;"
                >
                  <path
                    fill="currentColor"
                    d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"
                  />
                </svg>
                {{ isChecking ? 'Checking...' : 'Check Impact' }}
              </button>
            </div>
            <div class="editors-container" [class.split]="isSplitView">
              <!-- Analyze Response Modal (read-only JSON only) -->
              <div
                class="impact-modal-backdrop"
                *ngIf="showAnalyzeModal"
                (click)="closeAnalyzeModal()"
              ></div>
              <div class="impact-modal" *ngIf="showAnalyzeModal">
                <div class="impact-modal-header">
                  <div class="modal-title-group">
                    <span>Impacted Files</span>
                    <div class="modal-controls">
                      <button
                        type="button"
                        class="control-btn"
                        (click)="expandAllAnalyze(); $event.stopPropagation()"
                        title="Expand all"
                      >
                        Expand All
                      </button>
                      <button
                        type="button"
                        class="control-btn"
                        (click)="collapseAllAnalyze(); $event.stopPropagation()"
                        title="Collapse all"
                      >
                        Collapse All
                      </button>
                    </div>
                  </div>
                  <button type="button" class="close-modal-btn" (click)="closeAnalyzeModal()">
                    &times;
                  </button>
                </div>
                <div class="impact-modal-content">
                  <ng-container *ngIf="analyzeTreeData && analyzeTreeData.length; else jsonView">
                    <div class="analyze-tree" tabindex="0">
                      <ng-container
                        *ngTemplateOutlet="treeTpl; context: { $implicit: analyzeTreeData }"
                      ></ng-container>
                    </div>
                    <ng-template #treeTpl let-nodes>
                      <ul class="tree-root">
                        <li
                          *ngFor="let node of nodes"
                          [class.folder]="node.children && node.children.length"
                          [class.file]="!node.children || node.children.length === 0"
                          [class.changed]="!node.children || node.children.length === 0"
                          [attr.title]="
                            (node.key || node.name) +
                            (node.count ? ' — ' + node.count + ' changed' : '')
                          "
                        >
                          <div class="analyze-node-row" (click)="onAnalyzeNodeClick(node, $event)">
                            <button
                              *ngIf="node.children && node.children.length"
                              type="button"
                              class="node-toggle"
                              (click)="toggleAnalyzeNode(node.key, $event)"
                            >
                              {{ isAnalyzeNodeExpanded(node.key) ? '▾' : '▸' }}
                            </button>
                            <span class="node-icon">{{
                              node.children && node.children.length ? '📁' : '📄'
                            }}</span>
                            <span class="node-name">{{ node.name }}</span>
                            <span class="node-count" *ngIf="node.count">({{ node.count }})</span>
                          </div>
                          <ng-container
                            *ngIf="
                              node.children &&
                              node.children.length &&
                              isAnalyzeNodeExpanded(node.key)
                            "
                          >
                            <ng-container
                              *ngTemplateOutlet="treeTpl; context: { $implicit: node.children }"
                            ></ng-container>
                          </ng-container>
                        </li>
                      </ul>
                    </ng-template>
                  </ng-container>
                  <ng-template #jsonView>
                    <div class="impact-json" tabindex="0" aria-readonly="true">
                      <div class="json-header">Response (read-only)</div>
                      <pre class="json-pre">{{ analyzeResult | json }}</pre>
                    </div>
                  </ng-template>
                </div>
              </div>

              <!-- Check Impact Modal (visualization) -->
              <div
                class="impact-modal-backdrop fullscreen"
                *ngIf="impactResult"
                (click)="impactResult = null"
              ></div>
              <div class="impact-modal fullscreen" *ngIf="impactResult">
                <div class="impact-modal-header">
                  <div style="display:flex; flex-direction:column; flex:1;">
                    <div style="font-size:20px; font-weight:600; margin-bottom:8px;">
                      Impact Analysis Report for "{{ impactAnalysisTitle }}" Changes
                    </div>
                    <div style="font-size:14px; opacity:0.85;">
                      {{ impactChangedCount }} changed members/constants identified.
                    </div>
                  </div>
                  <div style="display:flex; gap:8px; align-items:center;">
                    <button
                      *ngIf="impactResult"
                      type="button"
                      class="download-btn"
                      (click)="downloadCheckImpactReport()"
                    >
                      Download JSON
                    </button>
                    <button
                      *ngIf="impactResult"
                      type="button"
                      class="download-html-btn"
                      (click)="downloadCheckImpactReportHtml()"
                    >
                      Download HTML
                    </button>
                    <button
                      *ngIf="impactResult"
                      type="button"
                      class="download-svg-btn"
                      (click)="downloadVisualizationSvg()"
                    >
                      Download SVG
                    </button>
                    <button type="button" class="close-modal-btn" (click)="impactResult = null">
                      &times;
                    </button>
                  </div>
                </div>
                <div class="impact-modal-content">
                  <div class="impact-tree-grid">
                    <div class="impact-left">
                      <!-- Critical Risk Badge -->
                      <div class="critical-risk-badge" *ngIf="impactMaxRiskScore >= 8">
                        <div class="risk-icon">🔥</div>
                        <div class="risk-text">
                          <div class="risk-label">Critical ({{ impactMaxRiskScore }}/10)</div>
                        </div>
                      </div>

                      <!-- Changed Members List -->
                      <div class="changed-members-list">
                        <div
                          *ngFor="let member of impactChangedMembers"
                          class="member-item"
                          [class.selected]="selectedChangedMember === member"
                          (click)="selectChangedMember(member, $event)"
                        >
                          <div class="member-header">
                            <span class="member-icon">{{
                              getIconForMemberType(member.memberType)
                            }}</span>
                            <span class="member-name">{{ member.changedMember }}</span>
                          </div>
                          <div class="member-meta">
                            <span class="member-type">({{ member.memberType }})</span>
                            <span class="member-risk" [class]="getRiskBadgeClass(member.riskScore)">
                              Risk: {{ member.riskScore }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div class="impact-right">
                      <!-- Detail Panel showing selected member details -->
                      <div class="detail-pane" *ngIf="selectedChangedMember">
                        <div class="detail-header-new">
                          <div class="method-title-section">
                            <div class="method-label">
                              {{ selectedChangedMember.memberType }} :
                              {{ selectedChangedMember.changedMember }}
                            </div>
                            <div class="risk-score-section">
                              <span class="risk-label">Risk Score:</span>
                              <span class="risk-value">{{ selectedChangedMember.riskScore }}</span>
                              <span class="risk-max">/ 10</span>
                            </div>
                          </div>
                        </div>

                        <div class="detail-body">
                          <!-- Reasoning Section -->
                          <div class="detail-section reasoning-section">
                            <strong>Reasoning:</strong>
                            <div
                              class="detail-text"
                              *ngIf="
                                reasoningBullets && reasoningBullets.length > 0;
                                else noReasoning
                              "
                            >
                              <ol class="reason-list">
                                <li *ngFor="let b of reasoningBullets">{{ b }}</li>
                              </ol>
                            </div>
                            <ng-template #noReasoning>
                              <div class="detail-text">No reasoning provided.</div>
                            </ng-template>
                          </div>

                          <!-- Actionable Impacts Section -->
                          <div class="detail-section impacts-section">
                            <div class="section-header">
                              <span class="impact-icon">🔥</span>
                              <strong>Actionable Impacts</strong>
                            </div>
                            <table
                              class="impacts-table"
                              *ngIf="
                                selectedChangedMember.actionableImpacts &&
                                selectedChangedMember.actionableImpacts.length
                              "
                            >
                              <thead>
                                <tr>
                                  <th>Impact Type</th>
                                  <th>Issue Description</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr
                                  *ngFor="let impact of selectedChangedMember.actionableImpacts"
                                  [class]="
                                    'impact-row-' +
                                    impact.impactType.toLowerCase().replace('_', '-')
                                  "
                                >
                                  <td class="impact-type">
                                    <span
                                      class="impact-badge"
                                      [class]="
                                        'badge-' + impact.impactType.toLowerCase().replace('_', '-')
                                      "
                                    >
                                      {{
                                        impact.impactType === 'SYNTACTIC_BREAK'
                                          ? '⭕'
                                          : impact.impactType === 'SEMANTIC_BREAK'
                                          ? '⭕'
                                          : '⚠️'
                                      }}
                                      {{ impact.moduleName || 'N/A' }}
                                    </span>
                                  </td>
                                  <td class="impact-description">
                                    {{ impact.issue || 'No description' }}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <!-- Suggested Test Strategy Section -->
                          <div
                            class="detail-section test-strategy-section"
                            *ngIf="selectedChangedMember.testStrategy"
                          >
                            <div class="section-header">
                              <span class="strategy-icon">🧪</span>
                              <strong>Suggested Test Strategy</strong>
                              <div class="strategy-download-actions">
                                <button
                                  type="button"
                                  class="download-strategy-btn"
                                  (click)="downloadTestStrategyTable()"
                                  title="Download as Table (CSV)"
                                >
                                  📊 Download as Table
                                </button>
                                <button
                                  type="button"
                                  class="download-strategy-btn"
                                  (click)="downloadTestStrategyHTML()"
                                  title="Download as HTML"
                                >
                                  📄 Download as HTML
                                </button>
                              </div>
                            </div>
                            <div class="strategy-content">
                              <div class="strategy-item">
                                <strong>Scope & Priority:</strong>
                                <div class="strategy-text">
                                  {{ selectedChangedMember.testStrategy.scope || 'N/A' }}
                                </div>
                                <div
                                  class="priority-badge"
                                  *ngIf="selectedChangedMember.testStrategy.priority"
                                >
                                  <span
                                    [class]="
                                      'priority-' +
                                      (
                                        selectedChangedMember.testStrategy.priority || ''
                                      ).toLowerCase()
                                    "
                                  >
                                    {{ selectedChangedMember.testStrategy.priority }}
                                  </span>
                                </div>
                              </div>
                              <div
                                class="strategy-item"
                                *ngIf="
                                  selectedChangedMember.testStrategy.testCasesRequired &&
                                  selectedChangedMember.testStrategy.testCasesRequired.length
                                "
                              >
                                <strong>Test Cases Required:</strong>
                                <ul class="test-cases-list">
                                  <li
                                    *ngFor="
                                      let testCase of selectedChangedMember.testStrategy
                                        .testCasesRequired
                                    "
                                  >
                                    <div class="test-case-module">
                                      {{ testCase.moduleName || 'N/A' }}
                                    </div>
                                    <div class="test-case-type">
                                      {{ testCase.testType || 'N/A' }}
                                    </div>
                                    <div class="test-case-focus">{{ testCase.focus || 'N/A' }}</div>
                                  </li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Placeholder when no member selected -->
                      <div *ngIf="!selectedChangedMember" class="detail-placeholder">
                        Select a changed member from the list to view details
                      </div>

                      <!-- Graph Visualization Section (always visible) -->
                      <div
                        class="viz-section"
                        *ngIf="impactResult && impactTree && impactTree.length"
                      >
                        <div class="viz-header">
                          <h3>Impact Dependency Graph</h3>
                          <p class="viz-description">
                            Interactive visualization showing the impact propagation across modules
                          </p>
                        </div>
                        <div class="viz-compact">
                          <app-impact-visualization
                            [impactData]="impactResult"
                            (nodeClick)="onImpactNodeClick($event)"
                          ></app-impact-visualization>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Main editor or diff view -->
              <div class="editor-section" [class.left-pane]="isSplitView">
                <div class="panel-header header-text-color">
                  {{ selectedFile?.name || 'No file selected' }}
                </div>
                <!-- Show file content -->
                <div class="editor-content" *ngIf="selectedFile" [class.readonly]="isSplitView">
                  <div *ngIf="isSplitView" class="diff-panel">
                    <div class="diff-view">
                      <div *ngFor="let line of diffLines">
                        <pre class="diff-line" [class]="'diff-' + line.type">{{
                          line.content
                        }}</pre>
                      </div>
                    </div>
                  </div>
                  <textarea
                    *ngIf="!isSplitView"
                    class="file-editor"
                    [(ngModel)]="selectedFile.content"
                    [readonly]="!isSplitView"
                    [class.readonly]="!isSplitView"
                  ></textarea>
                </div>
                <!-- Show placeholder when no file selected -->
                <div class="editor-placeholder" *ngIf="!selectedFile">
                  <p>Select a file from the tree to view or edit its content</p>
                </div>
              </div>
              <!-- Compare editor -->
              <div class="editor-section right-pane" *ngIf="isSplitView">
                <div class="panel-header header-text-color">
                  <span>Compare</span>
                </div>
                <div class="editor-content" [class.readonly]="!isSplitView">
                  <textarea
                    class="file-editor"
                    [(ngModel)]="secondaryContent"
                    (ngModelChange)="onSecondaryContentChange($event)"
                    [readonly]="!isSplitView"
                  ></textarea>
                </div>
                <!-- Impact response now shown in slider -->
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="loading" *ngIf="isLoading">Loading...</div>
    </div>
    <!-- Anchored After-Analyze popup (anchored above the button). No backdrop; user must close manually. -->
    <!-- Centered After-Analyze popup (always use centered modal to avoid placement/top-left issues) -->
    <div
      class="after-analyze-backdrop"
      *ngIf="showAfterAnalyzePopup"
      (click)="closeAfterAnalyzePopup()"
    >
      <div class="after-analyze-popup" (click)="$event.stopPropagation()">
        <div class="popup-text">
          File "{{ selectedFile?.name || 'Comparison' }}" selected. Enter input and submit:
        </div>
        <textarea
          class="after-analyze-input"
          [(ngModel)]="afterAnalyzeText"
          rows="6"
          placeholder="Enter input text..."
        ></textarea>
        <div class="popup-actions">
          <button
            type="button"
            class="run-btn"
            (click)="runAfterAnalyzeAction()"
            [disabled]="!afterAnalyzeText || isAfterAnalyzeRunning"
          >
            {{ isAfterAnalyzeRunning ? 'Submitting...' : 'Submit' }}
          </button>
          <button
            *ngIf="afterAnalyzeSuccess && !isAfterAnalyzeRunning"
            type="button"
            class="download-btn"
            (click)="downloadImpactReport()"
          >
            Download JSON
          </button>
          <button
            *ngIf="afterAnalyzeSuccess && !isAfterAnalyzeRunning"
            type="button"
            class="download-html-btn"
            (click)="downloadImpactReportHtml()"
          >
            Download HTML
          </button>
          <button
            *ngIf="afterAnalyzeSuccess && !isAfterAnalyzeRunning"
            type="button"
            class="close-btn"
            (click)="closeAfterAnalyzePopup()"
          >
            Close
          </button>
        </div>
        <div *ngIf="afterAnalyzeSuccess" class="after-analyze-response" style="margin-top:8px;">
          <div class="response-pre">{{ afterAnalyzeResponse | json }}</div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./landing.component.scss', './landing.component.editor.scss'],
})
export class LandingComponent implements OnInit {
  private dropdownService = inject(DropdownService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private sanitizer = inject(DomSanitizer);

  dropdownItems: DropdownItem[] = [];
  selectedItemId: string = '';
  isLoading = false;
  isDropdownOpen = false;

  fileTree: FileNode[] = [];
  selectedFile: FileNode | null = null;
  isSplitView: boolean = false;
  secondaryContent: string = '';
  isScrollSyncing: boolean = false;
  diffLines: { type: 'added' | 'removed' | 'changed' | 'unchanged'; content: string }[] = [];
  isChecking: boolean = false;
  impactResult: any = null;
  reasoningBullets: string[] = [];
  reasoningBulletsHtml: SafeHtml[] = [];
  // UI tree derived from LLM-style impact result
  impactTree: any[] = [];
  impactExpandedKeys: Set<string> = new Set<string>();
  selectedImpact: any = null;
  showRawImpactDetail = false;
  analyzeResult: any = null;
  // secondary content undo history for compare pane
  secondaryHistory: string[] = [];
  secondaryHistoryIndex: number = -1;

  analyzeTreeData: Array<{ name: string; children?: any[]; key?: string; count?: number }> = [];
  analyzeExpandedKeys: Set<string> = new Set<string>();
  showAnalyzeModal = false;
  showAfterAnalyzePopup = false;
  afterAnalyzeText: string = '';
  isAfterAnalyzeRunning = false;
  afterAnalyzeResponse: any = null;
  afterAnalyzeSuccess = false;

  popupLeft = 0;
  popupTop = 0;
  caretLeft = 0;
  popupFlipped = false;
  popupAnchored = false;
  showToast = false;
  toastMessage = '';
  isBlockingUI: boolean = false;
  showRepoDetails: boolean = false;
  selectedRepoIds: Set<number> = new Set<number>();
  selectedRepos: DropdownItem[] = [];
  analyzePending: boolean = false;
  private ignoreNextClick = false;
  private manualCheck = false;

  // Impact Analysis Report UI state
  impactAnalysisTitle: string = '';
  impactChangedCount: number = 0;
  impactMaxRiskScore: number = 0;
  impactChangedMembers: any[] = [];
  selectedChangedMember: any = null;

  get canAnalyze(): boolean {
    const hasRightContent = (this.secondaryContent || '').toString().trim().length > 0;
    const hasChange = this.diffLines && this.diffLines.some((l) => l.type !== 'unchanged');
    return this.isSplitView && hasRightContent && hasChange;
  }

  expandAllFolders() {
    const walk = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (n.type === 'folder') n.isExpanded = true;
        if (n.children && n.children.length) walk(n.children);
      }
    };
    walk(this.fileTree || []);
  }

  collapseAllFolders() {
    const walk = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (n.type === 'folder') n.isExpanded = false;
        if (n.children && n.children.length) walk(n.children);
      }
    };
    walk(this.fileTree || []);
  }

  onAfterAnalyzeClick(event?: MouseEvent) {
    if (!this.selectedFile && !this.isSplitView) return;
    this.afterAnalyzeResponse = null;
    this.afterAnalyzeSuccess = false;
    this.showToast = false;
    this.toastMessage = '';
    this.isAfterAnalyzeRunning = false;
    this.isBlockingUI = false;
    if (this.selectedFile) {
      this.afterAnalyzeText = `Please analyze changes for ${this.selectedFile.name}. Provide a short summary:`;
    } else {
      this.afterAnalyzeText = `Please analyze the current comparison and provide a short summary of the impactful changes:`;
    }
    if (event && event.currentTarget) {
      try {
        const el = event.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const popupWidth = 420;
        let desiredLeft = Math.round(rect.left + rect.width / 2 - popupWidth / 2);
        const maxLeft = Math.max(8, window.innerWidth - popupWidth - 8);
        desiredLeft = Math.min(Math.max(8, desiredLeft), maxLeft);
        this.popupLeft = desiredLeft;
        this.popupTop = Math.round(rect.top);
        const buttonCenter = rect.left + rect.width / 2;
        this.caretLeft = Math.round(buttonCenter - this.popupLeft);
      } catch (e) {
        this.popupLeft = 8;
        this.popupTop = 8;
        this.caretLeft = 20;
      }
    }
    this.popupAnchored = !!(event && event.currentTarget);
    this.showAfterAnalyzePopup = true;
    setTimeout(() => {
      try {
        const el = document.querySelector('.after-analyze-popup.anchored') as HTMLElement | null;
        const buttonEl = event && event.currentTarget ? (event.currentTarget as HTMLElement) : null;
        if (el && buttonEl) {
          const popupRect = el.getBoundingClientRect();
          const rect = buttonEl.getBoundingClientRect();
          const margin = 8;
          const desiredAboveTop = rect.top - popupRect.height - margin;
          const desiredBelowTop = rect.bottom + margin;
          const spaceAbove = rect.top - margin;
          const spaceBelow = window.innerHeight - rect.bottom - margin;

          if (desiredAboveTop >= margin) {
            this.popupTop = Math.round(desiredAboveTop);
            this.popupFlipped = false;
          } else if (desiredBelowTop + popupRect.height <= window.innerHeight - margin) {
            this.popupTop = Math.round(desiredBelowTop);
            this.popupFlipped = true;
          } else {
            if (spaceBelow >= spaceAbove) {
              const maxTop = Math.max(margin, window.innerHeight - popupRect.height - margin);
              this.popupTop = Math.min(Math.round(desiredBelowTop), maxTop);
              this.popupFlipped = true;
            } else {
              const minTop = margin;
              const computedTop = Math.max(minTop, Math.round(desiredAboveTop));
              this.popupTop = computedTop;
              this.popupFlipped = false;
            }
          }
          const buttonCenter = rect.left + rect.width / 2;
          this.caretLeft = Math.round(buttonCenter - this.popupLeft);
        }
        if (this.popupAnchored) {
          try {
            const anchoredEl = document.querySelector(
              '.after-analyze-popup.anchored'
            ) as HTMLElement | null;
            if (anchoredEl) {
              const r = anchoredEl.getBoundingClientRect();
              if (
                (this.popupLeft <= 8 && this.popupTop <= 8) ||
                Number.isNaN(this.popupLeft) ||
                Number.isNaN(this.popupTop)
              ) {
                const centerLeft = Math.round((window.innerWidth - r.width) / 2);
                const centerTop = Math.round((window.innerHeight - r.height) / 2);
                this.popupLeft = Math.max(
                  8,
                  Math.min(centerLeft, Math.max(8, window.innerWidth - r.width - 8))
                );
                this.popupTop = Math.max(
                  8,
                  Math.min(centerTop, Math.max(8, window.innerHeight - r.height - 8))
                );
                this.caretLeft = Math.round(r.width / 2);
              }
            }
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {}
      try {
        (document.querySelector('.after-analyze-input') as HTMLTextAreaElement | null)?.focus();
      } catch (e) {}
    }, 0);
  }

  runAfterAnalyzeAction() {
    if (!this.selectedFile && !this.isSplitView) return;
    if (!this.afterAnalyzeText || this.afterAnalyzeText.trim().length === 0) return;
    this.isAfterAnalyzeRunning = true;
    this.afterAnalyzeResponse = null;
    const payload = {
      file: this.selectedFile?.name ?? (this.isSplitView ? 'comparison' : 'unknown'),
      inputText: this.afterAnalyzeText,
      comparison: !this.selectedFile && this.isSplitView ? this.secondaryContent ?? '' : undefined,
    };

    this.http.post('/after-analyze', payload).subscribe({
      next: (res) => {
        this.afterAnalyzeSuccess = true;
        this.afterAnalyzeResponse = res;
        this.popupAnchored = false;
        this.isAfterAnalyzeRunning = false;
        this.isBlockingUI = false;
        console.log('After-analyze response', res);
        try {
          const r: any = res;
          const messageText = r?.message ?? r?.received ?? null;
          if (messageText && this.isSplitView) {
            this.secondaryContent = String(messageText);
            this.updateDiff();
          }
        } catch (e) {
          /* ignore */
        }
        try {
          this.cdr.detectChanges();
        } catch (e) {}
      },
      error: (err) => {
        this.afterAnalyzeResponse = { error: true, detail: err };
        this.isAfterAnalyzeRunning = false;
        console.error('After-analyze failed', err);
        try {
          this.cdr.detectChanges();
        } catch (e) {}
      },
    });
  }

  closeAfterAnalyzePopup() {
    if (this.isAfterAnalyzeRunning) {
      console.log('Close blocked: request still in progress');
      return;
    }
    this.showAfterAnalyzePopup = false;
    this.afterAnalyzeResponse = null;
    this.afterAnalyzeText = '';
    this.afterAnalyzeSuccess = false;
    this.showToast = false;
  }

  closeAnalyzeModal() {
    this.showAnalyzeModal = false;
    this.analyzeResult = null;
  }

  ngOnInit(): void {
    this.loadDropdownData();
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: Event) {
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (!target.closest || !target.closest('.custom-select')) {
      this.isDropdownOpen = false;
    }
  }

  loadDropdownData() {
    this.isLoading = true;
    this.dropdownService.getDropdownData().subscribe({
      next: (res: any) => {
        // save full response (data + details) into sessionStorage so the app can use repo details later
        try {
          try {
            sessionStorage.setItem('reposData', JSON.stringify(res));
          } catch (e) {
            /* ignore storage errors */
          }
        } catch (err) {
          /* ignore */
        }
        this.dropdownItems = res?.data ?? [];
        // auto-select first repo (first key) so the dropdown shows it and file tree loads
        if (this.dropdownItems && this.dropdownItems.length > 0) {
          const first = this.dropdownItems[0];
          this.selectedItemId = String(first.id);
          // populate file tree from the stored details for this repo
          setTimeout(() => this.onOptionSelect(first), 0);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.dropdownItems = [
          { id: 1, name: 'Project A' },
          { id: 2, name: 'Project B' },
          { id: 3, name: 'Project C' },
        ];
        try {
          sessionStorage.setItem('reposData', JSON.stringify({ data: this.dropdownItems }));
        } catch (e) {
          /* ignore */
        }
      },
    });
  }

  private generateFileTreeForRepo(item: DropdownItem) {
    return [
      {
        name: 'src',
        type: 'folder',
        isExpanded: true,
        children: [
          {
            name: 'app',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'core',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'services',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        name: 'auth.service.ts',
                        type: 'file',
                        content:
                          "import { Injectable } from '" +
                          '@angular/core' +
                          '\';\n\n@Injectable({\n  providedIn: "root"\n})\nexport class AuthService {\n  // Authentication service implementation\n}',
                      },
                      {
                        name: 'api.service.ts',
                        type: 'file',
                        content:
                          "import { Injectable } from '" +
                          '@angular/core' +
                          '\';\n\n@Injectable({\n  providedIn: "root"\n})\nexport class ApiService {\n  // API service implementation\n}',
                      },
                      {
                        name: 'storage.service.ts',
                        type: 'file',
                        content:
                          "import { Injectable } from '" +
                          '@angular/core' +
                          '\';\n\n@Injectable({\n  providedIn: "root"\n})\nexport class StorageService {\n  // Storage service implementation\n}',
                      },
                    ],
                  },
                  {
                    name: 'models',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        name: 'user.model.ts',
                        type: 'file',
                        content:
                          'export interface User {\n  id: number;\n  name: string;\n  email: string;\n  role: string;\n}',
                      },
                      {
                        name: 'config.model.ts',
                        type: 'file',
                        content:
                          'export interface Config {\n  apiUrl: string;\n  version: string;\n  features: string[];\n}',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'features',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'dashboard',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        name: 'dashboard.component.ts',
                        type: 'file',
                        content:
                          "import { Component } from '" +
                          '@angular/core' +
                          '\';\n\n@Component({\n  selector: "app-dashboard",\n  templateUrl: "./dashboard.component.html",\n  styleUrls: ["./dashboard.component.scss"]\n})\nexport class DashboardComponent { }',
                      },
                      {
                        name: 'dashboard.component.html',
                        type: 'file',
                        content:
                          '<div class="dashboard">\n  <h1>Welcome to Dashboard</h1>\n  <div class="widgets">\n    <!-- Dashboard widgets -->\n  </div>\n</div>',
                      },
                      {
                        name: 'dashboard.component.scss',
                        type: 'file',
                        content:
                          '.dashboard {\n  padding: 20px;\n  \n  .widgets {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n    gap: 20px;\n  }\n}',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'assets',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'images',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'logo.svg',
                    type: 'file',
                    content:
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <!-- Logo SVG content -->\n</svg>',
                  },
                  {
                    name: 'icons.svg',
                    type: 'file',
                    content:
                      '<svg xmlns="http://www.w3.org/2000/svg">\n  <!-- Icon sprites -->\n</svg>',
                  },
                ],
              },
              {
                name: 'styles',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'variables.scss',
                    type: 'file',
                    content:
                      '// Colors\n$primary-color: #007bff;\n$secondary-color: #6c757d;\n$success-color: #28a745;\n\n// Typography\n$font-family-base: Arial, sans-serif;\n$font-size-base: 16px;',
                  },
                  {
                    name: 'themes.scss',
                    type: 'file',
                    content:
                      '.theme-light {\n  --bg-color: #ffffff;\n  --text-color: #333333;\n}\n\n.theme-dark {\n  --bg-color: #333333;\n  --text-color: #ffffff;\n}',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'config',
        type: 'folder',
        isExpanded: true,
        children: [
          {
            name: 'environment.ts',
            type: 'file',
            content:
              "export const environment = {\n  production: false,\n  apiUrl: 'http://localhost:3000',\n  version: '1.0.0'\n};",
          },
          {
            name: 'translations',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'en.json',
                type: 'file',
                content:
                  '{\n  "common": {\n    "welcome": "Welcome",\n    "login": "Login",\n    "logout": "Logout"\n  }\n}',
              },
              {
                name: 'es.json',
                type: 'file',
                content:
                  '{\n  "common": {\n    "welcome": "Bienvenido",\n    "login": "Iniciar sesión",\n    "logout": "Cerrar sesión"\n  }\n}',
              },
            ],
          },
        ],
      },
    ];
  }

  toggleDropdown() {
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  startAnalyze() {
    if (!this.canAnalyze) {
      this.analyzePending = false;
      this.showRepoDetails = true;
      this.isDropdownOpen = true;
      this.selectedRepoIds.clear();
      const idNum = parseInt(this.selectedItemId || '', 10);
      if (!isNaN(idNum)) {
        this.selectedRepoIds.add(idNum);
      }
      return;
    }

    this.showRepoDetails = true;
    this.isDropdownOpen = true;
    this.selectedRepoIds.clear();
    const currentId = parseInt(this.selectedItemId || '', 10);
    if (!isNaN(currentId)) {
      this.selectedRepoIds.add(currentId);
    }
  }

  toggleRepoSelection(item: DropdownItem, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedRepoIds.add(item.id);
    } else {
      this.selectedRepoIds.delete(item.id);
    }
  }

  analyzeSelectedRepos() {
    this.selectedRepos = this.dropdownItems.filter((it) => this.selectedRepoIds.has(it.id));
    setTimeout(() => {
      this.isDropdownOpen = false;
      this.showRepoDetails = false;
    }, 0);
    if (!this.selectedFile) {
      this.impactResult = { error: true, message: 'No file selected for analysis' };
      return;
    }

    if (!this.selectedRepos || this.selectedRepos.length === 0) {
      this.impactResult = { error: true, message: 'No repositories selected for analysis' };
      return;
    }

    const compareRepositoryUrls = this.selectedRepos.map((r) => r.name);
    const targetFilename = this.selectedFile.name;
    const localFilePath = this.findPathForSelectedFile() || `/mock/path/${targetFilename}`;

    const payload = {
      status: 'success',
      compareRepositoryUrls,
      localFilePath,
      targetFilename,
    };

    this.ignoreNextClick = true;
    setTimeout(() => {
      this.ignoreNextClick = false;
    }, 450);
    setTimeout(() => {
      try {
        (document.activeElement as HTMLElement)?.blur();
      } catch (e) {
        /* ignore */
      }
    }, 0);
    const sourceRepo =
      this.getSelectedItemName() ||
      (compareRepositoryUrls && compareRepositoryUrls.length ? compareRepositoryUrls[0] : null);

    const postPayload: any = {
      compareRepositoryUrls,
      localFilePath: payload.localFilePath,
      targetFilename: payload.targetFilename,
      // newly requested key: selectedRepository holds the source repository value
      selectedRepository: sourceRepo,
      // include changedCode taken from compare screen (right-side editor)
      changedCode: this.secondaryContent ?? '',
    };

    // For now use a mocked analyzer response (so UI demonstrates the Analyze modal immediately)
    this.isLoading = false;
    this.isBlockingUI = false;
    const mockAnalyzeResponse: any[] = [
      {
        changedMember: 'calculateDiscount',
        memberType: 'METHOD',
        riskScore: 9,
        summaryReasoning:
          'Step 1: Analyze Contractual Change in Module A. The `calculateDiscount` method in `PricingUtility` has changed its return type from `double` to `BigDecimal`.',
        testStrategy: {
          scope:
            'Modules impacted by the `calculateDiscount` return type change (from double to BigDecimal), focusing on compilation fixes, runtime null-safety, and precision validation.',
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.consumer.AuditService',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `printTaxAndInvoiceInfo` compiles after fixing the `BigDecimal` to `double` conversion. Validate the precision of the `calculateDiscount` result when converted back to `double` for audit checks.',
            },
            {
              moduleName: 'com.app.order.OrderProcessor',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `processOrder` compiles after fixing the `BigDecimal` to `double` conversion. Validate the accuracy of the `appliedDiscount` and the final `total - appliedDiscount` calculation, ensuring no unexpected precision loss.',
            },
            {
              moduleName: 'com.app.analytics.AnalyticsEngine',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `logDiscount` correctly handles the `BigDecimal` return type, specifically testing scenarios where `calculateDiscount` might theoretically return `null` (if applicable) to ensure `NullPointerException` is avoided. Validate the precision of the logged discount value.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.consumer.AuditService',
            impactType: 'SYNTACTIC_BREAK',
            issue:
              'The `printTaxAndInvoiceInfo` method calls `pricingUtility.calculateDiscount` which now returns `BigDecimal`.',
          },
          {
            moduleName: 'com.app.order.OrderProcessor',
            impactType: 'SYNTACTIC_BREAK',
            issue:
              'The `processOrder` method calls `pricing.calculateDiscount` which now returns `BigDecimal`.',
          },
          {
            moduleName: 'com.app.analytics.AnalyticsEngine',
            impactType: 'RUNTIME_RISK',
            issue: 'The `logDiscount` method now correctly handles the `BigDecimal` return type.',
          },
        ],
      },
      {
        changedMember: 'getTaxRate',
        memberType: 'METHOD',
        riskScore: 8,
        summaryReasoning:
          'The `getTaxRate()` method in `PricingUtility` (Module A) has been modified.',
        testStrategy: {
          scope:
            "Modules directly consuming the `getTaxRate()` method, focusing on validating the new tax rate's effect on calculations and reporting.",
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.app.invoicing.InvoiceGenerator',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `calculateTotalWithTax` uses the new tax rate (e.g., 8%) correctly and produces the expected total. Test with various subtotals.',
            },
            {
              moduleName: 'com.consumer.AuditService',
              testType: 'Integration Test',
              focus:
                'Verify `printTaxAndInvoiceInfo` correctly reflects the new tax rate in its output and that the `totalWithTax` reported matches the new calculation from `InvoiceGenerator`. Ensure audit logs reflect the updated rate.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.invoicing.InvoiceGenerator',
            impactType: 'SEMANTIC_BREAK',
            issue:
              'The `calculateTotalWithTax` method will now use the new tax rate returned by `PricingUtility.getTaxRate()`.',
          },
          {
            moduleName: 'com.consumer.AuditService',
            impactType: 'SEMANTIC_BREAK',
            issue:
              'The `printTaxAndInvoiceInfo` method retrieves and prints the tax rate from `PricingUtility.getTaxRate()`.',
          },
        ],
      },
      {
        changedMember: 'TAX_RATE',
        memberType: 'FIELD/CONSTANT',
        riskScore: 8,
        summaryReasoning:
          "Step 1: Analyze Contractual Change in Module A: The diff indicates a FIELD_MODIFIED for 'TAX_RATE'. The old declaration was 'private static final double TAX_RATE = 0.05;' and the new declaration is 'private static final double TAX_RATE = 0.08;'.",
        testStrategy: {
          scope:
            "Comprehensive validation of all tax-related calculations within Module A. This includes unit tests for methods directly using 'TAX_RATE' and integration tests for public APIs that expose tax-dependent results.",
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.app.modulea.TaxCalculator',
              testType: 'Unit/Integration',
              focus:
                'Verify all tax calculations correctly reflect the new 8% tax rate, ensuring no regressions and correct application of the updated business logic.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.modulea.TaxCalculator',
            impactType: 'SEMANTIC_BREAK',
            issue: 'The private static final TAX_RATE constant has changed from 0.05 to 0.08.',
          },
        ],
      },
      {
        changedMember: 'PricingUtility',
        memberType: 'CLASS/TYPE',
        riskScore: 9,
        summaryReasoning:
          '1. Analyze Contractual Change in Module A (PricingUtility): The PricingUtility class has been modified.',
        testStrategy: {
          scope:
            'Comprehensive testing is required for modules directly impacted by syntactic breaks, semantic changes, and new runtime risks.',
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.app.order.OrderProcessor',
              testType: 'Unit/Integration',
              focus:
                'Verify successful compilation and correct discount application after fixing the BigDecimal to double conversion.',
            },
            {
              moduleName: 'com.app.invoicing.InvoiceGenerator',
              testType: 'Unit/Integration',
              focus:
                'Validate calculateTotalWithTax correctly applies the new 8% tax rate and that the business logic aligns with the updated tax policy.',
            },
            {
              moduleName: 'com.app.analytics.AnalyticsEngine',
              testType: 'Unit/Integration/Negative',
              focus:
                'Verify logDiscount correctly handles BigDecimal values, including precision, rounding, and robustly handles potential null returns from calculateDiscount (if applicable).',
            },
            {
              moduleName: 'PricingUtility',
              testType: 'Unit',
              focus:
                'Verify calculateDiscount returns BigDecimal with expected precision and rounding.',
            },
            {
              moduleName: 'PricingUtility',
              testType: 'Unit',
              focus: 'Verify getTaxRate returns 0.08.',
            },
            {
              moduleName: 'PricingUtility',
              testType: 'Integration',
              focus:
                'Ensure the removal of getProductCodePrefix has no unintended side effects on the overall system.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.order.OrderProcessor',
            impactType: 'SYNTACTIC_BREAK',
            issue:
              'The calculateDiscount method in PricingUtility now returns BigDecimal instead of double.',
          },
          {
            moduleName: 'com.app.invoicing.InvoiceGenerator',
            impactType: 'SEMANTIC_BREAK',
            issue: 'The TAX_RATE constant in PricingUtility has changed from 0.05 to 0.08.',
          },
          {
            moduleName: 'com.app.analytics.AnalyticsEngine',
            impactType: 'RUNTIME_RISK',
            issue:
              'The calculateDiscount method now returns a BigDecimal object instead of a primitive double.',
          },
          {
            moduleName: 'PricingUtility',
            impactType: 'NO_IMPACT',
            issue: 'The getProductCodePrefix method was removed as it was identified as dead code.',
          },
        ],
      },
      {
        changedMember: 'PricingUtility.java',
        memberType: 'METHOD',
        riskScore: 1,
        summaryReasoning:
          'Step 1: Analyze Contractual Change in Module A. The change involves the removal of the public method `getProductCodePrefix()`.',
        testStrategy: {
          scope:
            'Regression testing for the module where the dead code was removed and general integration tests to ensure no unforeseen side effects.',
          priority: 'LOW',
          testCasesRequired: [
            {
              moduleName: 'com.app.modulea.ProductService',
              testType: 'Integration Test',
              focus:
                'Verify existing functionality of the ProductService module remains intact after dead code removal.',
            },
            {
              moduleName: 'All',
              testType: 'System/Regression Test',
              focus:
                'Ensure no hidden dependencies or unexpected runtime issues arise from the removal of the `getProductCodePrefix` method.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.modulea.ProductService',
            impactType: 'NO_IMPACT',
            issue: 'The method `getProductCodePrefix()` was removed from this module.',
          },
        ],
      },
    ];

    // use the mock response to populate analyzeResult and the tree
    this.analyzeResult = mockAnalyzeResponse;
    try {
      this.analyzeTreeData = this.buildAnalyzeTreeFromActionableImpacts(mockAnalyzeResponse);
    } catch (e) {
      this.analyzeTreeData = [];
    }
    this.showAnalyzeModal = true;
    console.log('Impacted Files (mock)', mockAnalyzeResponse);
  }

  // Build an analyze tree grouped by project name (from sessionStorage.reposData.details)
  buildAnalyzeTreeFromImpactedModules(
    impactedModules: string[] | any
  ): Array<{ name: string; children?: any[]; key?: string; count?: number }> {
    const out: any[] = [];
    if (!impactedModules) return out;
    const modules = Array.isArray(impactedModules) ? impactedModules : impactedModules.items ?? [];

    // load cached repos data
    let reposData: any = null;
    try {
      reposData = JSON.parse(sessionStorage.getItem('reposData') || 'null');
    } catch (e) {
      reposData = null;
    }
    const details = reposData?.details ?? {};

    // map repoId -> list of class full names
    const repoMap: Record<string, string[]> = {};

    const findRepoForClass = (classFullName: string): string | null => {
      const parts = classFullName.split('.').filter(Boolean);
      const classFile = parts[parts.length - 1] + '.java';
      // search details for file path matching package structure
      for (const id of Object.keys(details || {})) {
        const files = details[id]?.files ?? [];
        const found = this.searchFilesForPath(files, parts, classFile);
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

    // build tree nodes per repo
    for (const repoId of Object.keys(repoMap)) {
      const name =
        details[repoId]?.name || (repoId === 'unknown' ? 'Unknown Project' : `Repo ${repoId}`);
      const classes = repoMap[repoId];
      // build nested package structure limited to impacted classes
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

  // Build analyze tree from the newer analyzer response shape that contains actionableImpacts
  private buildAnalyzeTreeFromActionableImpacts(
    respArray: any[]
  ): Array<{ name: string; children?: any[]; key?: string; count?: number }> {
    const out: any[] = [];
    if (!Array.isArray(respArray) || respArray.length === 0) return out;

    // load cached repos data
    let reposData: any = null;
    try {
      reposData = JSON.parse(sessionStorage.getItem('reposData') || 'null');
    } catch (e) {
      reposData = null;
    }
    const details = reposData?.details ?? reposData?.detail ?? {};

    // helper: find repo id for a class full name (e.g. com.app.module.ClassName)
    const findRepoForClass = (classFullName: string): string | null => {
      if (!classFullName) return null;
      const parts = classFullName.split('.').filter(Boolean);
      const classFile = parts[parts.length - 1] + '.java';
      for (const id of Object.keys(details || {})) {
        const files = details[id]?.files ?? [];
        try {
          const found = this.searchFilesForPath(files, parts, classFile);
          if (found) return id;
        } catch (e) {
          /* ignore */
        }
      }
      return null;
    };

    // aggregate impacts per repo -> class
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
      const projName =
        details[repoId]?.name || (repoId === 'unknown' ? 'Unknown Project' : `Repo ${repoId}`);
      const classMap = repoMap[repoId];
      const classChildren: any[] = [];
      for (const classFull of Object.keys(classMap)) {
        const impacts = classMap[classFull] || [];
        const parts = classFull.split('.').filter(Boolean);
        const classSimple = parts.length ? parts[parts.length - 1] : classFull;
        const fileName = classSimple + '.java';
        // impact nodes under this class
        const impactNodes = impacts.map((im: any, idx: number) => {
          const title = `${String(im.impactType ?? im.type ?? 'IMPACT').toUpperCase()} — ${String(
            im.issue ?? im.description ?? im.summary ?? ''
          )}`.trim();
          return { name: title, key: `${repoId}/${classFull}/impact-${idx}`, impact: im };
        });
        classChildren.push({
          name: fileName,
          key: `${repoId}/${classFull}`,
          children: impactNodes,
          count: impactNodes.length,
        });
      }
      out.push({
        name: projName,
        key: `proj-${repoId}`,
        children: classChildren,
        count: classChildren.reduce((s, c) => s + (c.count || 0), 0),
      });
    }

    return out;
  }

  // recursive search to find a file given package parts and fileName
  private searchFilesForPath(nodes: any[], packageParts: string[], fileName: string): boolean {
    if (!nodes || nodes.length === 0) return false;
    const [first, ...rest] = packageParts;
    for (const n of nodes) {
      if (rest.length === 0) {
        // last package segment: find fileName among children or match file node
        if (n.type === 'file' && n.name === fileName) return true;
        if (n.type === 'folder' && n.name === first) {
          // search inside for fileName
          if (this.searchFilesForPath(n.children || [], [], fileName)) return true;
        }
      } else {
        if (n.type === 'folder' && n.name === first) {
          if (this.searchFilesForPath(n.children || [], rest, fileName)) return true;
        }
      }
      // also search recursively in other branches
      if (n.children && n.children.length) {
        if (this.searchFilesForPath(n.children, packageParts, fileName)) return true;
      }
    }
    return false;
  }

  private buildAnalyzeTree(
    res: any
  ): Array<{ name: string; children?: any[]; key?: string; count?: number }> {
    const out: Array<{ name: string; children?: any[]; key?: string; count?: number }> = [];
    if (!res) return out;
    const items = res.affectedClasses ?? res.affected ?? [];

    const convert = (val: any, parentPath = ''): any[] => {
      if (val == null) return [];
      if (Array.isArray(val)) {
        return val
          .map((v) => {
            if (typeof v === 'string')
              return { name: v, key: parentPath ? `${parentPath}/${v}` : v, count: 1 };
            if (typeof v === 'object') {
              const keys = Object.keys(v);
              if (keys.length === 1) {
                const k = keys[0];
                const nodeKey = parentPath ? `${parentPath}/${k}` : k;
                const children = convert(v[k], nodeKey);
                const count =
                  children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) ||
                  (children.length ? children.length : 0);
                return { name: k, key: nodeKey, children, count };
              }
              return keys.map((k) => {
                const nodeKey = parentPath ? `${parentPath}/${k}` : k;
                const children = convert(v[k], nodeKey);
                const count =
                  children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) ||
                  (children.length ? children.length : 0);
                return { name: k, key: nodeKey, children, count };
              });
            }
            return {
              name: String(v),
              key: parentPath ? `${parentPath}/${String(v)}` : String(v),
              count: 1,
            };
          })
          .flat();
      }
      if (typeof val === 'object') {
        return Object.keys(val).map((k) => {
          const nodeKey = parentPath ? `${parentPath}/${k}` : k;
          const children = convert(val[k], nodeKey);
          const count =
            children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) ||
            (children.length ? children.length : 0);
          return { name: k, key: nodeKey, children, count };
        });
      }
      const name = String(val);
      return [{ name, key: parentPath ? `${parentPath}/${name}` : name, count: 1 }];
    };

    if (Array.isArray(items)) {
      for (const it of items) {
        if (typeof it === 'string') {
          out.push({ name: it, key: it, count: 1 });
        } else if (typeof it === 'object') {
          const keys = Object.keys(it);
          if (keys.length === 1) {
            const key = keys[0];
            const nodeKey = key;
            const children = convert(it[key], nodeKey);
            const count =
              children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) ||
              (children.length ? children.length : 0);
            out.push({ name: key, key: nodeKey, children, count });
          } else {
            for (const k of keys) {
              const nodeKey = k;
              const children = convert(it[k], nodeKey);
              const count =
                children.reduce((s: number, c: any) => s + (c.count ?? 0), 0) ||
                (children.length ? children.length : 0);
              out.push({ name: k, key: nodeKey, children, count });
            }
          }
        } else {
          out.push({ name: String(it), key: String(it), count: 1 });
        }
      }
    }

    return out;
  }

  expandAllAnalyze() {
    const keys: string[] = [];
    const collect = (nodes: any[]) => {
      for (const n of nodes || []) {
        if (n.key) keys.push(n.key);
        if (n.children && n.children.length) collect(n.children);
      }
    };
    collect(this.analyzeTreeData);
    this.analyzeExpandedKeys = new Set(keys);
  }

  collapseAllAnalyze() {
    this.analyzeExpandedKeys.clear();
  }

  toggleAnalyzeNode(key: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!key) return;
    if (this.analyzeExpandedKeys.has(key)) this.analyzeExpandedKeys.delete(key);
    else this.analyzeExpandedKeys.add(key);
  }

  isAnalyzeNodeExpanded(key: string) {
    return !!key && this.analyzeExpandedKeys.has(key);
  }

  onAnalyzeNodeClick(node: any, event?: Event) {
    if (event) event.stopPropagation();
    if (node.children && node.children.length) {
      this.toggleAnalyzeNode(node.key);
      return;
    }
    const found = this.findFileByName(node.name);
    if (found) {
      this.selectedFile = found;
      if (this.isSplitView && this.selectedFile?.content) {
        this.secondaryContent = this.selectedFile.content;
        this.updateDiff();
      }
      try {
        (
          document.querySelector('.editor-section .panel-header') as HTMLElement | null
        )?.scrollIntoView({ behavior: 'smooth' });
      } catch (e) {}
    }
  }

  // Handler for changes in the compare (secondary) editor. Maintains undo history.
  public onSecondaryContentChange(value: string) {
    try {
      const v = String(value ?? '');
      // If history is empty or last entry differs from new value, push it
      if (this.secondaryHistoryIndex === -1) {
        // initialize history with current value
        this.secondaryHistory = [v];
        this.secondaryHistoryIndex = 0;
      } else {
        const last = this.secondaryHistory[this.secondaryHistoryIndex] ?? '';
        if (v !== last) {
          // discard any redo entries
          this.secondaryHistory = this.secondaryHistory.slice(0, this.secondaryHistoryIndex + 1);
          this.secondaryHistory.push(v);
          // cap history size
          if (this.secondaryHistory.length > 100) this.secondaryHistory.shift();
          this.secondaryHistoryIndex = this.secondaryHistory.length - 1;
        }
      }
      this.secondaryContent = v;
    } catch (e) {
      this.secondaryContent = String(value ?? '');
    }
    // update diff to reflect new content
    try {
      this.updateDiff();
    } catch (e) {}
  }

  public get canUndo() {
    return this.secondaryHistoryIndex > 0;
  }

  // Undo last change in compare pane
  public undoCompareChange() {
    if (!this.canUndo) return;
    try {
      this.secondaryHistoryIndex = Math.max(0, this.secondaryHistoryIndex - 1);
      const prev = this.secondaryHistory[this.secondaryHistoryIndex] ?? '';
      // set content without pushing new history entry
      this.secondaryContent = prev;
      // ensure textarea and diff update
      try {
        this.updateDiff();
      } catch (e) {}
    } catch (e) {
      /* ignore */
    }
  }

  private findFileByName(name: string): FileNode | null {
    if (!this.fileTree) return null;
    let found: FileNode | null = null;
    const dfs = (nodes: FileNode[]) => {
      for (const n of nodes) {
        if (found) return true;
        if (n.type === 'file' && n.name === name) {
          found = n;
          return true;
        }
        if (n.children) {
          if (dfs(n.children as FileNode[])) return true;
        }
      }
      return false;
    };
    dfs(this.fileTree);
    return found;
  }

  private findPathForSelectedFile(): string | null {
    if (!this.selectedFile || !this.fileTree) return null;
    let foundPath: string[] | null = null;

    const dfs = (nodes: any[], ancestors: string[]) => {
      for (const n of nodes) {
        const nextAnc = [...ancestors, n.name];
        if (
          n === this.selectedFile ||
          (n.name === this.selectedFile?.name && n.type === this.selectedFile?.type)
        ) {
          foundPath = nextAnc;
          return true;
        }
        if (n.children) {
          const stop = dfs(n.children, nextAnc);
          if (stop) return true;
        }
      }
      return false;
    };

    dfs(this.fileTree, []);
    return foundPath ? '/' + (foundPath as string[]).join('/') : null;
  }

  private summarizeAnalyzeResult(res: any): string {
    if (!res) return '';
    const parts: string[] = [];
    const target = res.targetFilename ?? res.file ?? '';
    parts.push(`Analyze result${target ? ' for ' + target : ''}:`);
    if (res.localFilePath) parts.push(`Path: ${res.localFilePath}`);
    const items = res.affectedClasses ?? res.affected ?? [];
    const lines: string[] = [];
    const flatten = (val: any, prefix = '') => {
      if (val == null) return;
      if (Array.isArray(val)) {
        for (const v of val) flatten(v, prefix);
        return;
      }
      if (typeof val === 'string') {
        lines.push(prefix + val);
        return;
      }
      if (typeof val === 'object') {
        for (const k of Object.keys(val)) {
          const child = val[k];
          if (Array.isArray(child)) {
            for (const c of child) {
              if (typeof c === 'string') lines.push(`${k}/${c}`);
              else flatten(c, `${k}/`);
            }
          } else if (typeof child === 'string') {
            lines.push(`${k}/${child}`);
          } else {
            flatten(child, `${k}/`);
          }
        }
      }
    };
    flatten(items);
    if (lines.length === 0) parts.push('(no affected classes listed)');
    else {
      parts.push('Affected classes:');
      for (const l of lines) parts.push('- ' + l);
    }
    return parts.join('\n');
  }

  cancelAnalyze() {
    this.ignoreNextClick = true;
    setTimeout(() => (this.ignoreNextClick = false), 300);
    setTimeout(() => {
      try {
        (document.activeElement as HTMLElement)?.blur();
      } catch (e) {
        /* ignore */
      }
    }, 0);
    setTimeout(() => {
      this.showRepoDetails = false;
      this.isDropdownOpen = false;
      this.selectedRepoIds.clear();
    }, 0);
  }

  /********** Impact Tree helpers for Check Impact popup **********/
  private buildImpactTreeFromResult(res: any): any[] {
    if (!res) return [];
    // If response is an array (LLM-style), build a structured tree for the popup
    const arr = Array.isArray(res) ? res : res.items ?? [];
    const out: any[] = [];
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i] || {};

      // Handle both old format (llmReport) and new format (direct properties)
      const llm = item.llmReport || item;
      const rootKey = `impact-root-${i}`;

      // Get risk score from multiple possible locations
      const riskScore =
        item.riskScore ?? (typeof llm.riskScore === 'number' ? llm.riskScore : llm?.score ?? null);

      const root = {
        key: rootKey,
        title: `🔥 HIGH RISK: ${
          item.changedMember ?? item.changedMethod ?? 'Change'
        } — Risk Score: ${riskScore ?? 'N/A'}/10`,
        subtitle: item.summaryReasoning ?? llm.summary ?? '',
        risk: riskScore,
        children: [] as any[],
      };

      // L1 - Change (analysis)
      const changeKey = `${rootKey}-change`;
      root.children.push({
        key: changeKey,
        titleHtml: `<strong>1. Analyze Contractual Change</strong> — ${
          item.changedMember ?? item.changedMethod ?? ''
        }`,
        detail: item.summaryReasoning ?? llm.reasoning ?? llm.analysis ?? '',
        impactType: 'INFO',
        children: [],
      });

      // L1 - Impacts (list) - Handle both actionableImpacts and impactedModules
      const impactsKey = `${rootKey}-impacts`;
      const impacts = item.actionableImpacts ?? llm.impactedModules ?? [];
      const impactsNode: any = {
        key: impactsKey,
        titleHtml: `<strong>2. Trace Direct Dependencies</strong> — ${
          Array.isArray(impacts) ? impacts.length + ' dependents' : ''
        }`,
        children: [],
        impactType: 'GROUP',
      };

      const mods = Array.isArray(impacts) ? impacts : [];
      for (let j = 0; j < mods.length; j++) {
        const m = mods[j];
        const title = m.moduleName ? `${m.moduleName}` : m.name ?? `Module ${j + 1}`;
        const impactType = m.impactType ?? m.type ?? 'UNKNOWN';
        const key = `${impactsKey}-m-${j}`;
        const titleHtml = `<strong>[${impactType}]</strong> ${this.escapeHtml(title)}`;
        impactsNode.children.push({
          key,
          titleHtml,
          moduleName: m.moduleName,
          impactType,
          description: m.issue ?? m.description ?? '',
          action: m.action ?? m.recommendation ?? '',
          risk: typeof m.riskScore === 'number' ? m.riskScore : riskScore,
          raw: m,
        });
      }
      root.children.push(impactsNode);

      // L1 - Summary
      const summaryKey = `${rootKey}-summary`;
      const conclusion =
        llm.conclusion ??
        llm.summary ??
        item.summaryReasoning ??
        (llm.reasoning ? llm.reasoning.split('\n').slice(0, 2).join(' ') : 'Final assessment');
      root.children.push({
        key: summaryKey,
        titleHtml: `<strong>3. Final Risk Assessment</strong>`,
        detail: conclusion,
        impactType: 'SUMMARY',
      });

      out.push(root);
    }
    return out;
  }

  toggleImpactNode(key: string, event?: Event) {
    if (event) event.stopPropagation();
    if (!key) return;
    if (this.impactExpandedKeys.has(key)) this.impactExpandedKeys.delete(key);
    else this.impactExpandedKeys.add(key);
  }

  isImpactNodeExpanded(key: string) {
    return !!key && this.impactExpandedKeys.has(key);
  }

  selectImpactLeaf(leaf: any, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedImpact = leaf;
    // expand the parent's children if not already
    try {
      if (leaf && leaf.key) this.impactExpandedKeys.add(leaf.key);
    } catch (e) {}
  }

  selectChangedMember(member: any, event?: Event) {
    if (event) event.stopPropagation();
    this.selectedChangedMember = member;
    // Update reasoning bullets for this member
    try {
      const rawReasoning = member?.summaryReasoning ?? '';
      this.reasoningBullets = this.parseReasoningToBullets(String(rawReasoning || ''));
    } catch (e) {
      this.reasoningBullets = [];
    }
  }

  getIconForMemberType(memberType: string): string {
    if (!memberType) return '📝';
    const t = String(memberType).toUpperCase();
    if (t.includes('METHOD')) return '🔧';
    if (t.includes('FIELD') || t.includes('CONSTANT')) return '⚙️';
    if (t.includes('CLASS') || t.includes('TYPE')) return '📦';
    return '📄';
  }

  getRiskBadgeClass(riskScore: number): string {
    if (riskScore >= 8) return 'risk-critical';
    if (riskScore >= 5) return 'risk-medium';
    return 'risk-low';
  }

  getIconForImpactType(type: string) {
    if (!type) return '📝';
    const t = String(type).toUpperCase();
    if (t.includes('SYNTACTIC')) return '❌';
    if (t.includes('SEMANTIC')) return '⚠️';
    if (t.includes('ADAPT')) return '⚠️';
    return '📝';
  }

  getImpactColor(typeOrScore: any) {
    if (typeof typeOrScore === 'number') {
      const s = typeOrScore;
      if (s >= 8) return '#dc3545';
      if (s >= 5) return '#ffc107';
      return '#28a745';
    }
    const t = String(typeOrScore || '').toUpperCase();
    if (t.includes('SYNTACTIC')) return '#c82333';
    if (t.includes('SEMANTIC')) return '#e0a800';
    return '#6c757d';
  }

  public parseReasoningToBullets(text: string): string[] {
    if (!text) return [];
    const t = String(text || '');
    // normalize newlines
    const normalized = t.replace(/\r\n?/g, '\n');

    // Detect numbered sections like "1. ...", "2) ..." and split preserving the numbering
    const hasNumbered = /(^|\n)\s*\d+[\.|\)]/.test(normalized);
    if (hasNumbered) {
      // prepend newline to simplify split boundary at start
      const pref = '\n' + normalized;
      const parts = pref
        .split(/(?=\n\s*\d+[\.|\)])/g)
        .map((p) => p.replace(/^\n/, '').trim())
        .filter((p) => p.length > 0);
      if (parts.length > 0) return parts;
    }

    // If there's a bullet-list style with leading dashes or asterisks, split by lines
    const lines = normalized
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const hasDashBullets = lines.some((l) => /^[-*·]\s+/.test(l));
    if (hasDashBullets && lines.length > 0) {
      // merge contiguous dash blocks into bullets
      const bullets: string[] = [];
      let cur: string[] = [];
      for (const ln of lines) {
        if (/^[-*·]\s+/.test(ln)) {
          if (cur.length) {
            bullets.push(cur.join(' '));
            cur = [];
          }
          bullets.push(ln.replace(/^[-*·]\s+/, '').trim());
        } else {
          // continuation line
          if (bullets.length === 0) {
            cur.push(ln);
          } else {
            bullets[bullets.length - 1] = bullets[bullets.length - 1] + ' ' + ln;
          }
        }
      }
      if (cur.length) bullets.push(cur.join(' '));
      if (bullets.length) return bullets;
    }

    // fallback: split into sentences (simple heuristic)
    const sentences = normalized
      .split(/(?<=[\.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return sentences.length > 0 ? sentences : [t.trim()];
  }

  // (intentionally left blank) previously had helper to strip numeric prefixes; reasoning should remain unchanged

  // Helper to render impact tree as nested HTML for export
  private impactTreeToHtml(nodes: any[]): string {
    if (!nodes || !Array.isArray(nodes) || nodes.length === 0) return '<div>(no impact tree)</div>';
    const escape = (s: any) => this.escapeHtml(String(s ?? ''));
    const renderNode = (n: any): string => {
      const title = escape(n.title ?? n.name ?? n.key ?? '');
      const sub = n.subtitle ? `<div class="node-sub">${escape(n.subtitle)}</div>` : '';
      const details: string[] = [];
      if (n.impactType) details.push(escape(n.impactType));
      if (typeof n.risk !== 'undefined' && n.risk !== null) details.push('Risk: ' + escape(n.risk));
      const meta = details.length
        ? `<div class="node-sub">${escape(details.join(' — '))}</div>`
        : '';
      let childrenHtml = '';
      if (n.children && Array.isArray(n.children) && n.children.length) {
        childrenHtml = '<ul>' + n.children.map((c: any) => renderNode(c)).join('') + '</ul>';
      }
      return `<li><strong>${title}</strong>${sub}${meta}${childrenHtml}</li>`;
    };

    return '<ul>' + nodes.map((n) => renderNode(n)).join('') + '</ul>';
  }

  private highlightQuotesToHtml(text: string): SafeHtml {
    // Return sanitized plain text (no HTML). Reasoning should remain as text only.
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    const esc = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return this.sanitizer.bypassSecurityTrustHtml(esc);
  }

  // Serialize SVG but first clone it and inline computed styles so exported SVG/HTML matches rendered appearance
  private serializeSvgWithInlineStyles(svgEl: SVGElement | null): string {
    try {
      if (!svgEl) return '';
      // clone to avoid mutating the live DOM
      const clone = svgEl.cloneNode(true) as SVGElement;
      // Ensure width/height/viewBox are preserved
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const originalEls = Array.from(svgEl.querySelectorAll('*')) as Element[];
      const cloneEls = Array.from(clone.querySelectorAll('*')) as Element[];

      // Properties to inline — keeps output compact but preserves visual fidelity for most SVGs
      const props = [
        'fill',
        'stroke',
        'stroke-width',
        'stroke-linecap',
        'stroke-linejoin',
        'stroke-dasharray',
        'stroke-opacity',
        'fill-opacity',
        'opacity',
        'font-size',
        'font-family',
        'font-weight',
        'text-anchor',
        'dominant-baseline',
        'color',
        'display',
        'visibility',
        'transform',
        'background-color',
      ];

      for (let i = 0; i < cloneEls.length; i++) {
        const orig = originalEls[i];
        const c = cloneEls[i];
        if (!orig || !c) continue;
        try {
          const cs = window.getComputedStyle(orig as Element);
          let styleText = c.getAttribute('style') || '';
          for (const p of props) {
            try {
              const v = cs.getPropertyValue(p);
              if (v && v !== 'none' && v !== 'normal' && v !== '0px') {
                // Append property if not already present
                if (!new RegExp(`${p}\\s*:`).test(styleText)) styleText += `${p}:${v};`;
              }
            } catch (e) {
              /* ignore property retrieval errors */
            }
          }
          if (styleText) c.setAttribute('style', styleText);
        } catch (e) {
          // ignore per-node errors
        }
      }

      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(clone);
      if (!svgString.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      return svgString;
    } catch (e) {
      try {
        // fallback to naive serialization
        const serializer = new XMLSerializer();
        return svgEl ? serializer.serializeToString(svgEl) : '';
      } catch (er) {
        return '';
      }
    }
  }

  private escapeHtml(s: string) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // visualization emitted node clicked -> try to select the impacted module and open matching file in tree
  onImpactNodeClick(ev: any) {
    if (!ev || !ev.name) return;
    const name = String(ev.name || '');
    // try to find a matching leaf in impactTree
    try {
      for (const root of this.impactTree || []) {
        for (const child of root.children || []) {
          for (const leaf of child.children || []) {
            if (
              leaf.moduleName === name ||
              (leaf.moduleName && leaf.moduleName.endsWith('.' + name)) ||
              leaf.titleHtml?.includes(this.escapeHtml(name))
            ) {
              this.selectImpactLeaf(leaf);
              // attempt to open a file matching this module name
              const candidate =
                this.findFileByName(name) ||
                this.findFileByName((name.split('.').pop() || '') + '.java') ||
                this.findFileByName(name.split('.').pop() || '');
              if (candidate) {
                this.selectedFile = candidate;
                try {
                  if (this.isSplitView && this.selectedFile?.content) {
                    this.secondaryContent = this.selectedFile.content;
                    this.updateDiff();
                  }
                } catch (e) {}
                try {
                  (
                    document.querySelector('.editor-section .panel-header') as HTMLElement | null
                  )?.scrollIntoView({ behavior: 'smooth' });
                } catch (e) {}
              }
              return;
            }
          }
        }
      }
    } catch (e) {}
  }

  onCheckImpactClick(event: MouseEvent) {
    event.preventDefault();
    // event.stopPropagation();
    this.manualCheck = true;
    this.checkImpact();
  }

  resetSelection() {
    this.selectedItemId = '';
    this.fileTree = [];
    this.selectedFile = null;
    this.isDropdownOpen = false;
  }

  onOptionSelect(item: DropdownItem) {
    this.selectedItemId = String(item.id);
    this.selectedFile = null;
    this.isDropdownOpen = false;
    // try to use repo details loaded at startup (stored in sessionStorage under 'reposData')
    let usedTree: any[] | null = null;
    try {
      const stored = sessionStorage.getItem('reposData');
      if (stored) {
        const parsed = JSON.parse(stored);
        const details = parsed?.details ?? parsed?.detail ?? null;
        if (details && details[item.id]) {
          // server mock stores files under details[id].files
          const f = details[item.id].files;
          if (Array.isArray(f)) usedTree = f as any[];
        }
      }
    } catch (e) {
      /* ignore parse errors */
    }

    this.fileTree = usedTree ?? [
      {
        name: 'src',
        type: 'folder',
        isExpanded: true,
        children: [
          {
            name: 'app',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'core',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'services',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        name: 'auth.service.ts',
                        type: 'file',
                        content:
                          "import { Injectable } from '@angular/core';\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class AuthService {\n  // Authentication service implementation\n}",
                      },
                      {
                        name: 'api.service.ts',
                        type: 'file',
                        content:
                          "import { Injectable } from '@angular/core';\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class ApiService {\n  // API service implementation\n}",
                      },
                      {
                        name: 'storage.service.ts',
                        type: 'file',
                        content:
                          "import { Injectable } from '@angular/core';\n\n@Injectable({\n  providedIn: 'root'\n})\nexport class StorageService {\n  // Storage service implementation\n}",
                      },
                    ],
                  },
                  {
                    name: 'models',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        name: 'user.model.ts',
                        type: 'file',
                        content:
                          'export interface User {\n  id: number;\n  name: string;\n  email: string;\n  role: string;\n}',
                      },
                      {
                        name: 'config.model.ts',
                        type: 'file',
                        content:
                          'export interface Config {\n  apiUrl: string;\n  version: string;\n  features: string[];\n}',
                      },
                    ],
                  },
                ],
              },
              {
                name: 'features',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'dashboard',
                    type: 'folder',
                    isExpanded: true,
                    children: [
                      {
                        name: 'dashboard.component.ts',
                        type: 'file',
                        content:
                          "import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-dashboard',\n  templateUrl: './dashboard.component.html',\n  styleUrls: ['./dashboard.component.scss']\n})\nexport class DashboardComponent { }",
                      },
                      {
                        name: 'dashboard.component.html',
                        type: 'file',
                        content:
                          '<div class="dashboard">\n  <h1>Welcome to Dashboard</h1>\n  <div class="widgets">\n    <!-- Dashboard widgets -->\n  </div>\n</div>',
                      },
                      {
                        name: 'dashboard.component.scss',
                        type: 'file',
                        content:
                          '.dashboard {\n  padding: 20px;\n  \n  .widgets {\n    display: grid;\n    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n    gap: 20px;\n  }\n}',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            name: 'assets',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'images',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'logo.svg',
                    type: 'file',
                    content:
                      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <!-- Logo SVG content -->\n</svg>',
                  },
                  {
                    name: 'icons.svg',
                    type: 'file',
                    content:
                      '<svg xmlns="http://www.w3.org/2000/svg">\n  <!-- Icon sprites -->\n</svg>',
                  },
                ],
              },
              {
                name: 'styles',
                type: 'folder',
                isExpanded: true,
                children: [
                  {
                    name: 'variables.scss',
                    type: 'file',
                    content:
                      '// Colors\n$primary-color: #007bff;\n$secondary-color: #6c757d;\n$success-color: #28a745;\n\n// Typography\n$font-family-base: Arial, sans-serif;\n$font-size-base: 16px;',
                  },
                  {
                    name: 'themes.scss',
                    type: 'file',
                    content:
                      '.theme-light {\n  --bg-color: #ffffff;\n  --text-color: #333333;\n}\n\n.theme-dark {\n  --bg-color: #333333;\n  --text-color: #ffffff;\n}',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'config',
        type: 'folder',
        isExpanded: true,
        children: [
          {
            name: 'environment.ts',
            type: 'file',
            content:
              "export const environment = {\n  production: false,\n  apiUrl: 'http://localhost:3000',\n  version: '1.0.0'\n};",
          },
          {
            name: 'translations',
            type: 'folder',
            isExpanded: true,
            children: [
              {
                name: 'en.json',
                type: 'file',
                content:
                  '{\n  "common": {\n    "welcome": "Welcome",\n    "login": "Login",\n    "logout": "Logout"\n  }\n}',
              },
              {
                name: 'es.json',
                type: 'file',
                content:
                  '{\n  "common": {\n    "welcome": "Bienvenido",\n    "login": "Iniciar sesión",\n    "logout": "Cerrar sesión"\n  }\n}',
              },
            ],
          },
        ],
      },
    ];
    try {
      const key = item.name || `repo-${item.id}`;
      sessionStorage.setItem(key, JSON.stringify(this.fileTree));
    } catch (e) {}
  }

  getSelectedItemName(): string {
    const item = this.dropdownItems.find((it) => it.id.toString() === this.selectedItemId);
    return item?.name || '';
  }

  getFileIcon(node: FileNode): string {
    if (node.type === 'folder') {
      return node.isExpanded ? '📂' : '📁';
    }

    const ext = node.name.split('.').pop()?.toLowerCase() || '';

    switch (ext) {
      case 'ts':
        return '📘';
      case 'html':
        return '📄'; // HTML files
      case 'scss':
      case 'css':
        return '🎨'; // Style files
      case 'json':
        return '📋'; // JSON files
      case 'md':
        return '📝'; // Markdown files
      case 'svg':
        return '🖼️'; // Image files
      default:
        return '📄'; // Default file icon
    }
  }

  toggleFolder(node: FileNode) {
    if (node.type !== 'folder') return;
    node.isExpanded = !node.isExpanded;
  }

  onNodeClick(node: FileNode) {
    if (node.type === 'folder') {
      this.toggleFolder(node);
      return;
    }
    this.selectedFile = node;
    if (this.isSplitView && node.content) {
      this.secondaryContent = node.content;
      this.updateDiff();
    }
  }

  toggleSplitView() {
    this.isSplitView = !this.isSplitView;
    if (this.isSplitView) {
      try {
        const afterMsg: any =
          this.afterAnalyzeResponse?.message ?? this.afterAnalyzeResponse?.received ?? null;
        if (afterMsg) {
          this.secondaryContent = String(afterMsg);
        } else {
          const a: any = this.analyzeResult ?? null;
          const analyzeMsg = a?.message ?? a?.summary ?? null;
          if (analyzeMsg) {
            this.secondaryContent = String(analyzeMsg);
          } else if (a) {
            // build a short human-readable summary of affected classes
            try {
              this.secondaryContent = this.summarizeAnalyzeResult(a);
            } catch (e) {
              this.secondaryContent = this.selectedFile?.content ?? '';
            }
          } else {
            this.secondaryContent = this.selectedFile?.content ?? '';
          }
        }
      } catch (e) {
        this.secondaryContent = this.selectedFile?.content ?? '';
      }
      this.updateDiff();
    }
  }

  syncEditors() {
    if (this.selectedFile?.content) {
      this.secondaryContent = this.selectedFile.content;
      this.updateDiff();
    }
  }

  updateDiff() {
    const original = (this.selectedFile?.content ?? '').split('\n');
    const modified = (this.secondaryContent || '').split('\n');

    const m = original.length;
    const n = modified.length;
    // Build LCS matrix (m+1 x n+1)
    const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        if (original[i] === modified[j]) {
          lcs[i][j] = 1 + lcs[i + 1][j + 1];
        } else {
          lcs[i][j] = Math.max(lcs[i + 1][j], lcs[i][j + 1]);
        }
      }
    }

    // Reconstruct diff preserving file order: additions / removals / unchanged
    this.diffLines = [];
    let i = 0,
      j = 0;
    while (i < m || j < n) {
      if (i < m && j < n && original[i] === modified[j]) {
        this.diffLines.push({ type: 'unchanged', content: original[i] });
        i++;
        j++;
      } else if (j < n && (i === m || lcs[i][j + 1] >= lcs[i + 1][j])) {
        // Prefer additions when LCS indicates so
        this.diffLines.push({ type: 'added', content: modified[j] });
        j++;
      } else if (i < m) {
        this.diffLines.push({ type: 'removed', content: original[i] });
        i++;
      } else {
        // Fallback: remaining additions
        if (j < n) {
          this.diffLines.push({ type: 'added', content: modified[j] });
          j++;
        } else break;
      }
    }

    // When there are differing lines but both exist at same index, we already mark them as removed + added in order
    if (this.isSplitView) {
      const hasRightContent = (this.secondaryContent || '').toString().trim().length > 0;
      const hasChange = this.diffLines.some((l) => l.type !== 'unchanged');
      const shouldAnalyze = hasRightContent && hasChange;
      this.analyzePending = shouldAnalyze;
      if (shouldAnalyze && this.selectedItemId) {
        const idNum = parseInt(this.selectedItemId, 10);
        if (!isNaN(idNum)) this.selectedRepoIds.add(idNum);
      }
    } else {
      this.analyzePending = false;
    }
  }

  onEditorScroll(event: Event, editor: 'primary' | 'secondary') {
    if (!this.isSplitView || this.isScrollSyncing) return;
  }

  checkImpact() {
    if (!this.manualCheck) {
      this.manualCheck = false;
      return;
    }
    this.manualCheck = false;
    if (this.ignoreNextClick) {
      this.ignoreNextClick = false;
      return;
    }
    if (!this.isSplitView) return;
    this.isChecking = true;
    this.isBlockingUI = true;
    this.impactResult = null;

    const sourceRepo = this.getSelectedItemName() || null;
    const compareRepoNames = Array.from(this.selectedRepoIds || []).map(
      (id) => this.dropdownItems.find((d) => d.id === id)?.name ?? String(id)
    );

    const afterMsg =
      this.afterAnalyzeResponse &&
      (this.afterAnalyzeResponse?.message ?? this.afterAnalyzeResponse?.received)
        ? this.afterAnalyzeResponse?.message ?? this.afterAnalyzeResponse?.received
        : null;

    const payload = {
      sourceRepo,
      compareRepos: compareRepoNames,
      file: this.selectedFile?.name ?? (this.isSplitView ? 'comparison' : 'untitled'),
      filePath: this.afterAnalyzeResponse?.received ?? null,
      original: this.selectedFile?.content ?? '',
      modified: this.secondaryContent ?? '',
      message: afterMsg,
      timestamp: new Date().toISOString(),
      note: 'mock impact check',
    };

    // Use mock data (replace with actual API call when backend is ready)
    const mockImpactData = [
      {
        changedMember: 'calculateDiscount',
        memberType: 'METHOD',
        riskScore: 9,
        summaryReasoning:
          'Step 1: Analyze Contractual Change in Module A. The `calculateDiscount` method in `PricingUtility` has changed its return type from `double` to `BigDecimal`.',
        testStrategy: {
          scope:
            'Modules impacted by the `calculateDiscount` return type change (from double to BigDecimal), focusing on compilation fixes, runtime null-safety, and precision validation.',
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.consumer.AuditService',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `printTaxAndInvoiceInfo` compiles after fixing the `BigDecimal` to `double` conversion. Validate the precision of the `calculateDiscount` result when converted back to `double` for audit checks.',
            },
            {
              moduleName: 'com.app.order.OrderProcessor',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `processOrder` compiles after fixing the `BigDecimal` to `double` conversion. Validate the accuracy of the `appliedDiscount` and the final `total - appliedDiscount` calculation, ensuring no unexpected precision loss.',
            },
            {
              moduleName: 'com.app.analytics.AnalyticsEngine',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `logDiscount` correctly handles the `BigDecimal` return type, specifically testing scenarios where `calculateDiscount` might theoretically return `null` (if applicable) to ensure `NullPointerException` is avoided. Validate the precision of the logged discount value.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.consumer.AuditService',
            impactType: 'SYNTACTIC_BREAK',
            issue:
              'The `printTaxAndInvoiceInfo` method calls `pricingUtility.calculateDiscount` which now returns `BigDecimal`.',
          },
          {
            moduleName: 'com.app.order.OrderProcessor',
            impactType: 'SYNTACTIC_BREAK',
            issue:
              'The `processOrder` method calls `pricing.calculateDiscount` which now returns `BigDecimal`.',
          },
          {
            moduleName: 'com.app.analytics.AnalyticsEngine',
            impactType: 'RUNTIME_RISK',
            issue: 'The `logDiscount` method now correctly handles the `BigDecimal` return type.',
          },
        ],
      },
      {
        changedMember: 'getTaxRate',
        memberType: 'METHOD',
        riskScore: 8,
        summaryReasoning:
          'The `getTaxRate()` method in `PricingUtility` (Module A) has been modified.',
        testStrategy: {
          scope:
            "Modules directly consuming the `getTaxRate()` method, focusing on validating the new tax rate's effect on calculations and reporting.",
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.app.invoicing.InvoiceGenerator',
              testType: 'Unit/Integration Test',
              focus:
                'Verify `calculateTotalWithTax` uses the new tax rate (e.g., 8%) correctly and produces the expected total. Test with various subtotals.',
            },
            {
              moduleName: 'com.consumer.AuditService',
              testType: 'Integration Test',
              focus:
                'Verify `printTaxAndInvoiceInfo` correctly reflects the new tax rate in its output and that the `totalWithTax` reported matches the new calculation from `InvoiceGenerator`. Ensure audit logs reflect the updated rate.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.invoicing.InvoiceGenerator',
            impactType: 'SEMANTIC_BREAK',
            issue:
              'The `calculateTotalWithTax` method will now use the new tax rate returned by `PricingUtility.getTaxRate()`.',
          },
          {
            moduleName: 'com.consumer.AuditService',
            impactType: 'SEMANTIC_BREAK',
            issue:
              'The `printTaxAndInvoiceInfo` method retrieves and prints the tax rate from `PricingUtility.getTaxRate()`.',
          },
        ],
      },
      {
        changedMember: 'TAX_RATE',
        memberType: 'FIELD/CONSTANT',
        riskScore: 5,
        summaryReasoning:
          "Step 1: Analyze Contractual Change in Module A: The diff indicates a FIELD_MODIFIED for 'TAX_RATE'. The old declaration was 'private static final double TAX_RATE = 0.05;' and the new declaration is 'private static final double TAX_RATE = 0.08;'.",
        testStrategy: {
          scope:
            "Comprehensive validation of all tax-related calculations within Module A. This includes unit tests for methods directly using 'TAX_RATE' and integration tests for public APIs that expose tax-dependent results.",
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.app.modulea.TaxCalculator',
              testType: 'Unit/Integration',
              focus:
                'Verify all tax calculations correctly reflect the new 8% tax rate, ensuring no regressions and correct application of the updated business logic.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.modulea.TaxCalculator',
            impactType: 'SEMANTIC_BREAK',
            issue: 'The private static final TAX_RATE constant has changed from 0.05 to 0.08.',
          },
        ],
      },
      {
        changedMember: 'PricingUtility',
        memberType: 'CLASS/TYPE',
        riskScore: 9,
        summaryReasoning:
          '1. Analyze Contractual Change in Module A (PricingUtility): The PricingUtility class has been modified.',
        testStrategy: {
          scope:
            'Comprehensive testing is required for modules directly impacted by syntactic breaks, semantic changes, and new runtime risks.',
          priority: 'HIGH',
          testCasesRequired: [
            {
              moduleName: 'com.app.order.OrderProcessor',
              testType: 'Unit/Integration',
              focus:
                'Verify successful compilation and correct discount application after fixing the BigDecimal to double conversion.',
            },
            {
              moduleName: 'com.app.invoicing.InvoiceGenerator',
              testType: 'Unit/Integration',
              focus:
                'Validate calculateTotalWithTax correctly applies the new 8% tax rate and that the business logic aligns with the updated tax policy.',
            },
            {
              moduleName: 'com.app.analytics.AnalyticsEngine',
              testType: 'Unit/Integration/Negative',
              focus:
                'Verify logDiscount correctly handles BigDecimal values, including precision, rounding, and robustly handles potential null returns from calculateDiscount (if applicable).',
            },
            {
              moduleName: 'PricingUtility',
              testType: 'Unit',
              focus:
                'Verify calculateDiscount returns BigDecimal with expected precision and rounding.',
            },
            {
              moduleName: 'PricingUtility',
              testType: 'Unit',
              focus: 'Verify getTaxRate returns 0.08.',
            },
            {
              moduleName: 'PricingUtility',
              testType: 'Integration',
              focus:
                'Ensure the removal of getProductCodePrefix has no unintended side effects on the overall system.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.order.OrderProcessor',
            impactType: 'SYNTACTIC_BREAK',
            issue:
              'The calculateDiscount method in PricingUtility now returns BigDecimal instead of double.',
          },
          {
            moduleName: 'com.app.invoicing.InvoiceGenerator',
            impactType: 'SEMANTIC_BREAK',
            issue: 'The TAX_RATE constant in PricingUtility has changed from 0.05 to 0.08.',
          },
          {
            moduleName: 'com.app.analytics.AnalyticsEngine',
            impactType: 'RUNTIME_RISK',
            issue:
              'The calculateDiscount method now returns a BigDecimal object instead of a primitive double.',
          },
          {
            moduleName: 'PricingUtility',
            impactType: 'NO_IMPACT',
            issue: 'The getProductCodePrefix method was removed as it was identified as dead code.',
          },
        ],
      },
      {
        changedMember: 'PricingUtility.java',
        memberType: 'METHOD',
        riskScore: 1,
        summaryReasoning:
          'Step 1: Analyze Contractual Change in Module A. The change involves the removal of the public method `getProductCodePrefix()`.',
        testStrategy: {
          scope:
            'Regression testing for the module where the dead code was removed and general integration tests to ensure no unforeseen side effects.',
          priority: 'LOW',
          testCasesRequired: [
            {
              moduleName: 'com.app.modulea.ProductService',
              testType: 'Integration Test',
              focus:
                'Verify existing functionality of the ProductService module remains intact after dead code removal.',
            },
            {
              moduleName: 'All',
              testType: 'System/Regression Test',
              focus:
                'Ensure no hidden dependencies or unexpected runtime issues arise from the removal of the `getProductCodePrefix` method.',
            },
          ],
        },
        actionableImpacts: [
          {
            moduleName: 'com.app.modulea.ProductService',
            impactType: 'NO_IMPACT',
            issue: 'The method `getProductCodePrefix()` was removed from this module.',
          },
        ],
      },
    ];

    // Simulate API delay
    setTimeout(() => {
      this.impactResult = mockImpactData;

      // Set report header info
      this.impactAnalysisTitle = 'PricingUtility';
      this.impactChangedCount = mockImpactData.length;
      this.impactMaxRiskScore = Math.max(...mockImpactData.map((m) => m.riskScore || 0));
      this.impactChangedMembers = mockImpactData;

      // Auto-select first member
      if (this.impactChangedMembers.length > 0) {
        this.selectedChangedMember = this.impactChangedMembers[0];
      }

      // build hierarchical contract tree for the popup (for graph view)
      try {
        this.impactTree = this.buildImpactTreeFromResult(mockImpactData);
        console.log('Impact Tree built:', this.impactTree);
      } catch (e) {
        console.error('Error building impact tree:', e);
        this.impactTree = [];
      }

      // Log the data being passed to the visualization component
      console.log('Impact Result (data for graph):', mockImpactData);
      console.log('Sample actionableImpacts:', mockImpactData[0]?.actionableImpacts);

      // prepare reasoning bullets from the response
      try {
        const first = mockImpactData[0] ?? {};
        const rawReasoning = first?.summaryReasoning ?? '';
        this.reasoningBullets = this.parseReasoningToBullets(String(rawReasoning || ''));
        this.reasoningBulletsHtml = [];
      } catch (e) {
        this.reasoningBullets = [];
        this.reasoningBulletsHtml = [];
      }

      this.impactExpandedKeys.clear();
      this.selectedImpact = null;
      this.isChecking = false;
      this.isBlockingUI = false;
      console.log('Impact check response', mockImpactData);

      // Trigger change detection
      try {
        this.cdr.detectChanges();
      } catch (e) {
        /* ignore */
      }
    }, 500);

    /*
    // Uncomment this when ready to use actual API
    this.http.post('/check-impact', payload).subscribe(
      (res: any) => {
        this.impactResult = res;
        // build hierarchical contract tree for the popup
        try {
          this.impactTree = this.buildImpactTreeFromResult(res);
        } catch (e) {
          this.impactTree = [];
        }

        // prepare reasoning bullets from the response and sanitize quoted text
        try {
          const anyRes: any = res;
          let rawReasoning = '';
          try {
            if (Array.isArray(anyRes)) {
              const first = anyRes[0] ?? {};
              rawReasoning =
                first?.llmReport?.reasoning ??
                first?.llmReport?.analysis ??
                first?.analysis ??
                first?.reasoning ??
                '';
            } else {
              rawReasoning =
                anyRes?.llmReport?.reasoning ??
                anyRes?.llmReport?.analysis ??
                anyRes?.analysis ??
                anyRes?.reasoning ??
                '';
            }
          } catch (er) {
            rawReasoning = '';
          }
          this.reasoningBullets = this.parseReasoningToBullets(String(rawReasoning || ''));
          // keep reasoning as plain text (no inline styling or HTML)
          this.reasoningBulletsHtml = [];
        } catch (e) {
          this.reasoningBullets = [];
          this.reasoningBulletsHtml = [];
        }

        this.impactExpandedKeys.clear();
        this.selectedImpact = null;
        this.isChecking = false;
        this.isBlockingUI = false;
        console.log('Impact check response', res);
      },
      (err: any) => {
        this.impactResult = { error: true, message: 'Failed to call mock API', detail: err };
        this.isChecking = false;
        this.isBlockingUI = false;
        console.error('Impact check failed', err);
      }
    );
    */
  }

  downloadImpactReport() {
    try {
      const data = this.afterAnalyzeResponse ?? { message: 'no after-analyze response' };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `impact-report-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download impact report', e);
    }
  }

  downloadCheckImpactReport() {
    try {
      // Collect all visible screen data
      const impact = this.impactResult ?? null;
      const screenData: any = {
        timestamp: new Date().toISOString(),
        impactResult: impact,
        impactTree: this.impactTree ?? null,
        selectedImpact: this.selectedImpact ?? null,
        reasoningBullets: this.reasoningBullets ?? [],
        impactSummaryText: (this as any).impactSummaryText ?? null,
        selectedImpactRiskDisplay: (this as any).selectedImpactRiskDisplay ?? null,
        uiState: {
          isSplitView: this.isSplitView,
          selectedFile: this.selectedFile?.name ?? null,
        },
      };
      // try to capture SVG markup of the visualization (if present)
      try {
        const svgEl = document.querySelector('.impact-modal .viz-compact svg') as SVGElement | null;
        if (svgEl) {
          const serializer = new XMLSerializer();
          screenData.visualizationSvg = serializer.serializeToString(svgEl);
        }
      } catch (e) {
        screenData.visualizationSvg = null;
      }

      const json = JSON.stringify(screenData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `check-impact-screen-data-${ts}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download check impact report', e);
    }
  }

  downloadImpactReportHtml() {
    try {
      const after = this.afterAnalyzeResponse ?? { message: 'no after-analyze response' };
      const analyze = this.analyzeResult ?? null;
      const title = 'After Analyze Impact Report';
      const ts = new Date().toISOString();
      const escapeHtml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const body =
        `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}pre{background:#f7f7f9;padding:12px;border-radius:6px;overflow:auto;max-height:60vh}h1,h2{color:#222}</style></head><body><h1>${title}</h1><p>Generated: ${ts}</p><h2>After-Analyze Response</h2><pre>${escapeHtml(
          JSON.stringify(after, null, 2)
        )}</pre>` +
        (analyze
          ? `<h2>Analyze Result</h2><pre>${escapeHtml(JSON.stringify(analyze, null, 2))}</pre>`
          : '') +
        `</body></html>`;
      const blob = new Blob([body], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `after-analyze-report-${ts.replace(/[:.]/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download HTML impact report', e);
    }
  }

  downloadCheckImpactReportHtml() {
    try {
      const impact = this.impactResult ?? { message: 'no impact result' };
      const after = this.afterAnalyzeResponse ?? null;
      const title = 'Check Impact Report';
      const ts = new Date().toISOString();
      const escapeHtml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      // try to capture rendered SVG inside the modal visualization container
      let svgHtml = '';
      try {
        const svgEl = document.querySelector('.impact-modal .viz-compact svg') as SVGElement | null;
        if (svgEl) {
          const serializer = new XMLSerializer();
          let svgString = serializer.serializeToString(svgEl);
          // ensure svg has xmlns
          if (!svgString.match(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
            svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
          }
          svgHtml = `<h2>Visualization</h2><div class="viz-container">${svgString}</div>`;
        }
      } catch (e) {
        svgHtml = '';
      }

      // build reasoning HTML from bullets as plain escaped text (no styling)
      let reasoningHtml = '';
      try {
        if (this.reasoningBullets && this.reasoningBullets.length) {
          const items = this.reasoningBullets
            .map((b) => {
              const raw = String(b || '');
              const esc = escapeHtml(raw);
              return `<li>${esc}</li>`;
            })
            .join('');
          reasoningHtml = `<h2>Reasoning</h2><ol class="reason-list">${items}</ol>`;
        }
      } catch (e) {
        reasoningHtml = '';
      }

      // selected impact details (if any)
      let selectedImpactHtml = '';
      try {
        if (this.selectedImpact) {
          const si = this.selectedImpact;
          selectedImpactHtml = `<h2>Selected Impact</h2><div class="selected-impact"><div><strong>${escapeHtml(
            String(si.moduleName ?? si.title ?? '')
          )}</strong> — <span style=\"color:${this.getImpactColor(
            si.risk || si.impactType
          )}\">Risk: ${escapeHtml(
            String(si.risk ?? this.impactResult?.[0]?.llmReport?.riskScore ?? 'N/A')
          )}/10</span></div><div class=\"detail\">${escapeHtml(
            String(si.description ?? si.detail ?? '')
          )}</div></div>`;
        }
      } catch (e) {
        selectedImpactHtml = '';
      }

      // include other visible state like selected file and secondary content
      const selectedFileName = this.selectedFile?.name ? escapeHtml(this.selectedFile.name) : '';
      const secondary = escapeHtml(String(this.secondaryContent ?? ''));

      // Render impact tree as nested HTML list for human-friendly export
      const impactTreeHtml = this.impactTreeToHtml(this.impactTree || []);

      const body =
        `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}pre{background:#f7f7f9;padding:12px;border-radius:6px;overflow:auto;max-height:60vh}h1,h2{color:#222}.viz-container{border:1px solid #e6e6ea;padding:12px;border-radius:6px;margin:8px 0;background:#fff}.reason-list{padding-left:20px}.impact-tree-export{font-family:inherit;border-radius:6px;padding:12px;background:#f7f7f9;margin-top:12px}.impact-tree-export ul{list-style:circle;margin-left:18px}.impact-tree-export li{margin:6px 0}.impact-tree-export .node-sub{color:#444;font-size:12px;margin-left:6px}</style></head><body><h1>${title}</h1><p>Generated: ${ts}</p>` +
        (after
          ? `<h2>After-Analyze</h2><pre>${escapeHtml(JSON.stringify(after, null, 2))}</pre>`
          : '') +
        (selectedFileName ? `<h2>Selected File</h2><div>${selectedFileName}</div>` : '') +
        (secondary ? `<h2>Comparison / Secondary Content</h2><pre>${secondary}</pre>` : '') +
        svgHtml +
        reasoningHtml +
        selectedImpactHtml +
        `<h2>Impact Result (raw)</h2><pre>${escapeHtml(JSON.stringify(impact, null, 2))}</pre>` +
        `<h2>Impact Tree</h2><div class="impact-tree-export">${impactTreeHtml}</div>` +
        `</body></html>`;
      const blob = new Blob([body], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `check-impact-report-${ts.replace(/[:.]/g, '-')}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download HTML check-impact report', e);
    }
  }

  downloadVisualizationSvg() {
    try {
      const svgEl = document.querySelector('.impact-modal .viz-compact svg') as SVGElement | null;
      if (!svgEl) {
        console.warn('No SVG visualization found to download');
        return;
      }
      const svgString = this.serializeSvgWithInlineStyles(svgEl);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `impact-visualization-${ts}.svg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download SVG', e);
    }
  }

  downloadTestStrategyTable() {
    try {
      if (!this.selectedChangedMember?.testStrategy) {
        console.warn('No test strategy available to download');
        return;
      }

      const strategy = this.selectedChangedMember.testStrategy;
      const memberName = this.selectedChangedMember.changedMember || 'Unknown';

      // Create CSV content with proper escaping
      const escapeCSV = (str: string) => {
        if (str == null) return '';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
      };

      let csv = 'Test Strategy Export\n';
      csv += `Changed Member: ${escapeCSV(memberName)}\n`;
      csv += `Risk Score: ${this.selectedChangedMember.riskScore || 'N/A'}\n\n`;

      csv += 'Scope & Priority\n';
      csv += `Scope,${escapeCSV(strategy.scope || 'N/A')}\n`;
      csv += `Priority,${escapeCSV(strategy.priority || 'N/A')}\n\n`;

      if (strategy.testCasesRequired && strategy.testCasesRequired.length > 0) {
        csv += 'Test Cases Required\n';
        csv += 'Module Name,Test Type,Focus\n';

        strategy.testCasesRequired.forEach((testCase: any) => {
          csv += `${escapeCSV(testCase.moduleName || 'N/A')},${escapeCSV(
            testCase.testType || 'N/A'
          )},${escapeCSV(testCase.focus || 'N/A')}\n`;
        });
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `test-strategy-${memberName.replace(/[^a-zA-Z0-9]/g, '_')}-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download test strategy as table', e);
    }
  }

  downloadTestStrategyHTML() {
    try {
      if (!this.selectedChangedMember?.testStrategy) {
        console.warn('No test strategy available to download');
        return;
      }

      const strategy = this.selectedChangedMember.testStrategy;
      const memberName = this.selectedChangedMember.changedMember || 'Unknown';
      const memberType = this.selectedChangedMember.memberType || 'N/A';
      const riskScore = this.selectedChangedMember.riskScore || 'N/A';
      const ts = new Date().toISOString();

      const escapeHtml = (s: string) => {
        if (s == null) return '';
        return String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      let testCasesHtml = '';
      if (strategy.testCasesRequired && strategy.testCasesRequired.length > 0) {
        const rows = strategy.testCasesRequired
          .map(
            (tc: any) => `
          <tr>
            <td>${escapeHtml(tc.moduleName || 'N/A')}</td>
            <td>${escapeHtml(tc.testType || 'N/A')}</td>
            <td>${escapeHtml(tc.focus || 'N/A')}</td>
          </tr>
        `
          )
          .join('');

        testCasesHtml = `
        <div class="section">
          <h3>📋 Test Cases Required</h3>
          <table class="test-cases-table">
            <thead>
              <tr>
                <th>Module Name</th>
                <th>Test Type</th>
                <th>Focus</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
      }

      const priorityClass = (strategy.priority || '').toLowerCase();
      const priorityColor =
        priorityClass === 'high' ? '#dc3545' : priorityClass === 'medium' ? '#ffc107' : '#28a745';

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Strategy - ${escapeHtml(memberName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      color: #333;
      line-height: 1.6;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    .header .subtitle {
      font-size: 16px;
      opacity: 0.9;
    }
    .meta-info {
      background: #f8f9fa;
      padding: 30px 40px;
      border-bottom: 2px solid #e9ecef;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .meta-item {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid #667eea;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .meta-item .label {
      font-size: 12px;
      text-transform: uppercase;
      color: #6c757d;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .meta-item .value {
      font-size: 18px;
      font-weight: 700;
      color: #495057;
    }
    .content {
      padding: 40px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h3 {
      font-size: 22px;
      margin-bottom: 20px;
      color: #495057;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
    .scope-box {
      background: #fff8e1;
      border-left: 4px solid #ffc107;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .scope-box p {
      margin: 0;
      color: #333;
    }
    .priority-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 14px;
      text-transform: uppercase;
      background: ${priorityColor};
      color: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    table.test-cases-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-radius: 8px;
      overflow: hidden;
    }
    table.test-cases-table thead {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    table.test-cases-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
    }
    table.test-cases-table tbody tr {
      border-bottom: 1px solid #e9ecef;
      transition: background 0.2s;
    }
    table.test-cases-table tbody tr:hover {
      background: #f8f9fa;
    }
    table.test-cases-table tbody tr:last-child {
      border-bottom: none;
    }
    table.test-cases-table td {
      padding: 15px;
      vertical-align: top;
    }
    table.test-cases-table td:first-child {
      font-weight: 600;
      color: #667eea;
    }
    .footer {
      background: #f8f9fa;
      padding: 20px 40px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
      border-top: 2px solid #e9ecef;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🧪 Suggested Test Strategy</h1>
      <div class="subtitle">Impact Analysis Report</div>
    </div>
    
    <div class="meta-info">
      <div class="meta-grid">
        <div class="meta-item">
          <div class="label">Changed Member</div>
          <div class="value">${escapeHtml(memberName)}</div>
        </div>
        <div class="meta-item">
          <div class="label">Member Type</div>
          <div class="value">${escapeHtml(memberType)}</div>
        </div>
        <div class="meta-item">
          <div class="label">Risk Score</div>
          <div class="value">${escapeHtml(String(riskScore))} / 10</div>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="section">
        <h3>🎯 Scope & Priority</h3>
        <div class="scope-box">
          <p>${escapeHtml(strategy.scope || 'N/A')}</p>
        </div>
        <div>
          <strong>Priority:</strong> 
          <span class="priority-badge">${escapeHtml(strategy.priority || 'N/A')}</span>
        </div>
      </div>

      ${testCasesHtml}
    </div>

    <div class="footer">
      Generated on ${escapeHtml(ts)} | Echo Lens - Impact Analyzer
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `test-strategy-${memberName.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      console.error('Failed to download test strategy as HTML', e);
    }
  }
}
