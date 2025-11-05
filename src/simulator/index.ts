import fs from 'fs';
import path from 'path';
import { escapeXml } from '../utils/errors.js';

export interface VisitTemplate { name: string; dayOffset: number; forms: Array<{ oid: string; name: string }>; }

export interface SimulatorOptions {
  intervalMs: number;
  batchPercentage: number; // 0-100
  speedFactor: number; // time acceleration
  sites: number;
  subjectsPerSite: number;
  siteNames?: string[];
  logging?: boolean;
  logGenerator?: boolean;
  progressIncrement?: number;
  persistState?: boolean;
  statePersistencePath?: string;
  freshSeedOnStart?: boolean;
  visits?: {
    templates?: VisitTemplate[];
    probabilities?: { delayed?: number; missed?: number; partial?: number };
    delayMs?: { min?: number; max?: number };
  };
  audit?: { user?: string; fieldOids?: string[]; perPageDefault?: number };
  valueRules?: Record<string, { type?: 'enum'|'number'|'string'; enum?: string[]; range?: { min: number; max: number }; pattern?: string }>;
}

type Subject = {
  key: string; // e.g., 1001
  site: string; // e.g., 001
  siteName?: string;
  status: 'Active' | 'Inactive';
  progress: number; // 0..100 percent progressed
  visitIndex: number; // current visit template index
  visitStatus?: 'Scheduled' | 'Completed' | 'Missed' | 'Delayed' | 'Partial';
  delayedUntil?: Date | null;
  fieldValues: Record<string, string>;
};

type AuditRecord = {
  id: number;
  user: string;
  fieldOID: string;
  oldValue: string;
  newValue: string;
  timestamp: Date;
};

type VisitPlan = {
  key: string;
  name: string;
  dayOffset: number;
  forms: Array<{ oid: string; name: string }>;
};

type VisitSummary = {
  key: string;
  name: string;
  dayOffset: number;
  subjectCount: number;
};

type FormSummary = {
  oid: string;
  name: string;
  subjectCount: number;
  visitKeys: Set<string>;
};

type SerializedSubject = {
  key: string;
  site: string;
  siteName?: string;
  status: Subject['status'];
  progress: number;
  visitIndex: number;
  visitStatus?: Subject['visitStatus'];
  delayedUntil?: string | null;
  fieldValues: Record<string, string>;
};

type SerializedStore = {
  version: number;
  subjects: SerializedSubject[];
  visitPlans: Record<string, VisitPlan[]>;
  visitSummaries: VisitSummary[];
  visitFormMap: Record<string, string[]>;
  formSummaries: Array<{ oid: string; name: string; subjectCount: number; visitKeys: string[] }>;
};

type MaterializeOptions = {
  freshSeed?: boolean;
};

const DATA_STORE_VERSION = 1;

class SimulationDataStore {
  private subjects: Subject[] = [];
  private visitPlans = new Map<string, VisitPlan[]>();
  private visitSummaries = new Map<string, VisitSummary>();
  private visitFormMap = new Map<string, Set<string>>();
  private formSummaries = new Map<string, FormSummary>();
  private readonly persistEnabled: boolean;
  private readonly stateFilePath?: string;
  private lastRestored = false;

  constructor(options: { persistState: boolean; stateFilePath?: string }) {
    this.persistEnabled = !!options.persistState;
    if (this.persistEnabled) {
      this.stateFilePath = options.stateFilePath
        ? path.resolve(options.stateFilePath)
        : path.resolve(process.cwd(), 'simulator-state.json');
    }
  }

  materialize(
    opts: SimulatorOptions,
    templates: VisitTemplate[],
    siteNames?: string[],
    options: MaterializeOptions = {},
  ): Subject[] {
    const freshSeed = options.freshSeed ?? false;
    if (this.persistEnabled && !freshSeed && this.loadFromDisk()) {
      this.lastRestored = true;
      return this.subjects;
    }
    if (this.persistEnabled && freshSeed) {
      this.deletePersistedState();
    }
    this.lastRestored = false;
    this.subjects = [];
    this.visitPlans.clear();
    this.visitSummaries.clear();
    this.visitFormMap.clear();
    this.formSummaries.clear();

    const sites = Math.max(1, Number(opts.sites || 1));
    const perSite = Math.max(1, Number(opts.subjectsPerSite || 1));
    let counter = 1000;

    for (let s = 1; s <= sites; s++) {
      const site = String(s).padStart(3, '0');
      const siteName = siteNames && siteNames[s - 1] ? siteNames[s - 1] : undefined;
      for (let i = 0; i < perSite; i++) {
        counter++;
        const subject: Subject = {
          key: String(counter),
          site,
          siteName,
          status: 'Active',
          progress: 0,
          visitIndex: 0,
          fieldValues: {},
        };
        const plan = this.cloneVisitPlan(templates);
        this.subjects.push(subject);
        this.visitPlans.set(subject.key, plan);
        this.recordVisitUsage(plan);
      }
    }
    if (this.persistEnabled) {
      this.persist();
    }
    return this.subjects;
  }

  wasRestored(): boolean {
    return this.lastRestored;
  }

  persist(): void {
    if (!this.persistEnabled || !this.stateFilePath) return;
    try {
      this.ensureStateDirectory();
      const payload = JSON.stringify(this.serialize(), null, 2);
      fs.writeFileSync(this.stateFilePath, payload, 'utf8');
    } catch (err: any) {
      console.warn(`[SIMULATOR] Failed to persist simulator state: ${err.message}`);
    }
  }

  getVisitPlan(subjectKey: string): VisitPlan[] {
    return this.visitPlans.get(subjectKey) || [];
  }

  getVisitSummaries(): VisitSummary[] {
    return Array.from(this.visitSummaries.values())
      .sort((a, b) => {
        if (a.dayOffset === b.dayOffset) return a.key.localeCompare(b.key);
        return a.dayOffset - b.dayOffset;
      });
  }

  getFormSummaries(): Array<{ oid: string; name: string; subjectCount: number; visitKeys: string[] }> {
    return Array.from(this.formSummaries.values())
      .map(summary => ({
        oid: summary.oid,
        name: summary.name,
        subjectCount: summary.subjectCount,
        visitKeys: Array.from(summary.visitKeys).sort(),
      }))
      .sort((a, b) => a.oid.localeCompare(b.oid));
  }

  getFormsForVisit(visitKey: string): string[] {
    return Array.from(this.visitFormMap.get(visitKey) || []).sort();
  }

  private ensureStateDirectory() {
    if (!this.stateFilePath) return;
    const dir = path.dirname(this.stateFilePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  private deletePersistedState() {
    if (!this.stateFilePath) return;
    try {
      fs.rmSync(this.stateFilePath, { force: true });
    } catch {
      // ignore removal issues
    }
  }

  private loadFromDisk(): boolean {
    if (!this.stateFilePath) return false;
    try {
      if (!fs.existsSync(this.stateFilePath)) return false;
      const raw = fs.readFileSync(this.stateFilePath, 'utf8');
      if (!raw.trim()) return false;
      const parsed = JSON.parse(raw) as SerializedStore;
      if (!parsed || parsed.version !== DATA_STORE_VERSION) return false;
      this.applySerialized(parsed);
      return true;
    } catch (err: any) {
      console.warn(`[SIMULATOR] Failed to load simulator state: ${err.message}`);
      return false;
    }
  }

  private serialize(): SerializedStore {
    const visitPlans: Record<string, VisitPlan[]> = {};
    for (const [key, plan] of this.visitPlans.entries()) {
      visitPlans[key] = plan;
    }
    const visitFormMap: Record<string, string[]> = {};
    for (const [key, forms] of this.visitFormMap.entries()) {
      visitFormMap[key] = Array.from(forms);
    }
    const formSummaries = Array.from(this.formSummaries.values()).map(summary => ({
      oid: summary.oid,
      name: summary.name,
      subjectCount: summary.subjectCount,
      visitKeys: Array.from(summary.visitKeys),
    }));
    return {
      version: DATA_STORE_VERSION,
      subjects: this.subjects.map(subject => ({
        key: subject.key,
        site: subject.site,
        siteName: subject.siteName,
        status: subject.status,
        progress: subject.progress,
        visitIndex: subject.visitIndex,
        visitStatus: subject.visitStatus,
        delayedUntil: subject.delayedUntil ? subject.delayedUntil.toISOString() : null,
        fieldValues: subject.fieldValues,
      })),
      visitPlans,
      visitSummaries: Array.from(this.visitSummaries.values()),
      visitFormMap,
      formSummaries,
    };
  }

  private applySerialized(serialized: SerializedStore) {
    this.subjects = (serialized.subjects || []).map(subject => ({
      key: subject.key,
      site: subject.site,
      siteName: subject.siteName,
      status: subject.status,
      progress: subject.progress,
      visitIndex: subject.visitIndex,
      visitStatus: subject.visitStatus,
      delayedUntil: subject.delayedUntil ? new Date(subject.delayedUntil) : null,
      fieldValues: subject.fieldValues || {},
    }));
    this.visitPlans = new Map(
      Object.entries(serialized.visitPlans || {}).map(([key, plan]) => [key, plan]),
    );
    this.visitSummaries = new Map(
      (serialized.visitSummaries || []).map(summary => [summary.key, summary]),
    );
    this.visitFormMap = new Map(
      Object.entries(serialized.visitFormMap || {}).map(([visitKey, formOids]) => [
        visitKey,
        new Set(formOids),
      ]),
    );
    this.formSummaries = new Map(
      (serialized.formSummaries || []).map(summary => [
        summary.oid,
        { ...summary, visitKeys: new Set(summary.visitKeys || []) },
      ]),
    );
  }

  private cloneVisitPlan(templates: VisitTemplate[]): VisitPlan[] {
    return templates.map((tpl, index) => ({
      key: this.makeVisitKey(index),
      name: tpl.name,
      dayOffset: tpl.dayOffset,
      forms: tpl.forms.map(form => ({ oid: form.oid, name: form.name })),
    }));
  }

  private makeVisitKey(index: number): string {
    return `VISIT-${index + 1}`;
  }

  private recordVisitUsage(plan: VisitPlan[]): void {
    for (const visit of plan) {
      const summary = this.visitSummaries.get(visit.key) ?? {
        key: visit.key,
        name: visit.name,
        dayOffset: visit.dayOffset ?? 0,
        subjectCount: 0,
      };
      summary.subjectCount += 1;
      this.visitSummaries.set(visit.key, summary);

      let formSet = this.visitFormMap.get(visit.key);
      if (!formSet) {
        formSet = new Set<string>();
        this.visitFormMap.set(visit.key, formSet);
      }

      for (const form of visit.forms) {
        formSet.add(form.oid);
        const formSummary = this.formSummaries.get(form.oid) ?? {
          oid: form.oid,
          name: form.name,
          subjectCount: 0,
          visitKeys: new Set<string>(),
        };
        formSummary.subjectCount += 1;
        formSummary.visitKeys.add(visit.key);
        this.formSummaries.set(form.oid, formSummary);
      }
    }
  }
}

export class RwsSimulator {
  private readonly opts: SimulatorOptions;
  private readonly studyOid: string;
  private subjects: Subject[] = [];
  private audit: AuditRecord[] = [];
  private nextAuditId = 1;
  private ticks = 0;
  private timer: NodeJS.Timeout | null = null;
  private visitTemplates: VisitTemplate[] = [];
  private readonly store: SimulationDataStore;

  constructor(studyOid: string, opts: SimulatorOptions) {
    this.studyOid = studyOid;
    this.opts = opts;
    this.visitTemplates = opts.visits?.templates || [
      { name: 'Demographics', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] },
    ];
    const persistState = opts.persistState ?? Boolean(opts.statePersistencePath);
    this.store = new SimulationDataStore({
      persistState,
      stateFilePath: opts.statePersistencePath,
    });
    this.seed(!!opts.freshSeedOnStart);
    if (this.opts.intervalMs > 0) this.start();
  }

  private log(msg: string) {
    if (this.opts.logging) console.log(`[SIMULATOR] ${msg}`);
  }

  private seed(freshSeed: boolean) {
    this.subjects = this.store.materialize(
      this.opts,
      this.visitTemplates,
      this.opts.siteNames,
      { freshSeed },
    );
    const totalSubjects = this.subjects.length;
    const totalSites = Math.max(1, Number(this.opts.sites || 1));
    if (this.store.wasRestored()) {
      this.log(`Restored ${totalSubjects} subjects from persisted state`);
    } else {
      this.log(`Seeded ${totalSubjects} subjects across ${totalSites} sites`);
    }
  }

  private start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.opts.intervalMs);
    this.log(`Auto-ticking every ${this.opts.intervalMs}ms`);
  }

  pause() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.log('Paused');
  }

  resume() { this.start(); }

  reset() {
    this.pause();
    this.subjects = [];
    this.audit = [];
    this.nextAuditId = 1;
    this.ticks = 0;
    this.seed(true);
    if (this.opts.intervalMs > 0) this.start();
  }

  tick() {
    const total = this.subjects.length;
    const batchSize = Math.max(1, Math.floor((this.opts.batchPercentage / 100) * total));
    // Rotate selection per tick for variety
    const offset = (this.ticks * batchSize) % total;
    const selected: Subject[] = [];
    for (let i = 0; i < batchSize; i++) selected.push(this.subjects[(offset + i) % total]);

    const now = new Date(Date.now() * this.opts.speedFactor);
    let created = 0;
    for (const subj of selected) {
      // Respect delay window
      if (subj.delayedUntil && now < subj.delayedUntil) {
        subj.visitStatus = 'Delayed';
        continue;
      }

      const p = this.opts.visits?.probabilities || {};
      const r = Math.random();
      const pMissed = p.missed ?? 0;
      const pDelayed = p.delayed ?? 0;
      const pPartial = p.partial ?? 0;

      const plan = this.store.getVisitPlan(subj.key);
      const planLength = plan.length;
      const fallbackTemplate = this.visitTemplates[this.visitTemplates.length - 1];
      const currentVisit = planLength > 0
        ? (plan[subj.visitIndex] || plan[planLength - 1])
        : undefined;
      const visitForms = (currentVisit?.forms && currentVisit.forms.length > 0)
        ? currentVisit.forms
        : (this.visitTemplates[subj.visitIndex]?.forms || fallbackTemplate?.forms || []);
      const visitCountCeiling = planLength > 0 ? planLength : Math.max(1, this.visitTemplates.length);

      if (r < pMissed) {
        subj.visitStatus = 'Missed';
        if (visitCountCeiling > 0) {
          subj.visitIndex = Math.min(visitCountCeiling - 1, subj.visitIndex + 1);
        }
      } else if (r < pMissed + pDelayed) {
        // schedule a delay
        const min = this.opts.visits?.delayMs?.min ?? 0;
        const max = this.opts.visits?.delayMs?.max ?? 0;
        const delay = Math.max(0, Math.floor(min + Math.random() * Math.max(0, max - min)));
        subj.delayedUntil = new Date(now.getTime() + delay);
        subj.visitStatus = 'Delayed';
      } else {
        // Generate forms; partial may only create subset
        const forms = visitForms;
        const subset = (pPartial > 0 && Math.random() < pPartial)
          ? forms.slice(0, Math.max(1, Math.floor(forms.length / 2)))
          : forms;
        const user = this.opts.audit?.user || 'raveuser';
        const fields = this.opts.audit?.fieldOids && this.opts.audit.fieldOids.length > 0
          ? this.opts.audit.fieldOids
          : ['DM.SEX'];
        for (const f of subset) {
          const field = fields[Math.floor(Math.random() * fields.length)];
          const oldV = subj.fieldValues[field] ?? this.initialValue(field);
          const newV = this.nextValue(field, oldV);
          this.audit.push({
            id: this.nextAuditId++,
            user,
            fieldOID: field,
            oldValue: oldV,
            newValue: newV,
            timestamp: now,
          });
          subj.fieldValues[field] = newV;
          created++;
        }
        subj.visitStatus = subset.length < forms.length ? 'Partial' : 'Completed';
        subj.delayedUntil = null;
        if (subj.visitStatus === 'Completed') {
          if (visitCountCeiling > 0) {
            subj.visitIndex = Math.min(visitCountCeiling - 1, subj.visitIndex + 1);
          }
        }
      }

      const inc = Math.max(0, this.opts.progressIncrement ?? 10);
      subj.progress = Math.min(100, subj.progress + inc);
      if (subj.progress === 100 && Math.random() < 0.1) {
        subj.status = 'Inactive';
      }
    }
    this.ticks++;
    this.log(`Tick #${this.ticks}: processed ${batchSize} subjects, created ${created} audit events`);
    if (this.opts.logGenerator) {
      console.log(`[GENERATOR] Processed ${batchSize} subjects; audits +${created}`);
    }
    this.store.persist();
  }

  statusXml(): string {
    return [
      `<SimulatorStatus mode="simulator" ticks="${this.ticks}" totalSubjects="${this.subjects.length}">`,
      `  <Auto intervalMs="${this.opts.intervalMs}" running="${this.timer ? 'true' : 'false'}"/>`,
      `</SimulatorStatus>`,
    ].join('\n');
  }

  subjectsXml(): string {
    const rows = this.subjects.map(s => {
      const plan = this.store.getVisitPlan(s.key);
      const planLength = plan.length;
      const fallbackVisit = this.visitTemplates.length > 0
        ? (this.visitTemplates[Math.min(s.visitIndex, this.visitTemplates.length - 1)] || this.visitTemplates[this.visitTemplates.length - 1])
        : undefined;
      const planVisit = planLength > 0
        ? (plan[s.visitIndex] || plan[planLength - 1])
        : undefined;
      const currentVisitName = planVisit?.name || fallbackVisit?.name || 'Visit';
      const attrs = [
        `SubjectKey="${escapeXml(s.key)}"`,
        `Status="${escapeXml(s.status)}"`,
        `SiteNumber="${escapeXml(s.site)}"`,
        `Progress="${s.progress}"`,
        `CurrentVisit="${escapeXml(currentVisitName)}"`,
      ];
      if (s.siteName) attrs.push(`SiteName="${escapeXml(s.siteName)}"`);
      if (s.visitStatus) attrs.push(`VisitStatus="${escapeXml(s.visitStatus)}"`);
      if (s.delayedUntil) attrs.push(`DelayedUntil="${s.delayedUntil.toISOString()}"`);
      return `  <Subject ${attrs.join(' ')} />`;
    });
    return [
      '<Subjects>',
      ...rows,
      '</Subjects>'
    ].join('\n');
  }

  auditXml(perPage = 500, startId = 1): string {
    const items = this.audit.filter(a => a.id >= startId).slice(0, perPage);
    const rows = items.map(a =>
      `      <AuditRecord ID="${a.id}" User="${escapeXml(a.user)}" FieldOID="${escapeXml(a.fieldOID)}" OldValue="${escapeXml(a.oldValue)}" NewValue="${escapeXml(a.newValue)}" DateTimeStamp="${a.timestamp.toISOString()}"/>`
    );
    return [
      '<ODM FileType="Snapshot" ODMVersion="1.3">',
      `  <ClinicalData StudyOID="${escapeXml(this.studyOid)}">`,
      ...rows,
      '  </ClinicalData>',
      '</ODM>'
    ].join('\n');
  }

  metadataXml(studyOid?: string): string {
    const ts = new Date().toISOString();
    const oid = studyOid || this.studyOid;
    const visitSummaries = this.store.getVisitSummaries();
    const visitDefs = visitSummaries.map(visit => {
      const plannedDay = Number.isFinite(visit.dayOffset) ? visit.dayOffset : 0;
      const formRefs = this.store.getFormsForVisit(visit.key).map(formOid =>
        `        <FormRef FormOID="${escapeXml(formOid)}" Mandatory="Yes"/>`
      );
      return [
        `      <StudyEventDef OID="${escapeXml(visit.key)}" Name="${escapeXml(visit.name)}" SampleSize="${visit.subjectCount}" PlannedDay="${plannedDay}">`,
        ...formRefs,
        '      </StudyEventDef>',
      ].join('\n');
    });
    const formSummaries = this.store.getFormSummaries();
    const formDefs = formSummaries.map(form =>
      `      <FormDef OID="${escapeXml(form.oid)}" Name="${escapeXml(form.name)}" UsageCount="${form.subjectCount}"/>`
    );
    // Keep at least one ItemDef for compatibility; later we can derive ItemDefs from forms if needed
    const itemDefs = [
      '      <ItemDef OID="DM.SEX" Name="Sex" DataType="text"/>'
    ];
    return [
      '<ODM FileType="Snapshot" ODMVersion="1.3">',
      `  <Study OID="${escapeXml(oid)}">`,
      `    <MetaDataVersion OID="${escapeXml(ts)}">`,
      ...visitDefs,
      ...formDefs,
      ...itemDefs,
      '    </MetaDataVersion>',
      '  </Study>',
      '</ODM>'
    ].join('\n');
  }

  private initialValue(fieldOID: string): string {
    const rule = this.opts.valueRules?.[fieldOID];
    if (rule?.type === 'enum' && rule.enum && rule.enum.length > 0) return rule.enum[0];
    if (rule?.type === 'number' && rule.range) return String(rule.range.min);
    if (rule?.type === 'string' && rule.pattern) return rule.pattern.replace('{n}', '0');
    if (fieldOID === 'DM.SEX') return 'M';
    return '';
  }

  private nextValue(fieldOID: string, prev: string): string {
    const rule = this.opts.valueRules?.[fieldOID];
    if (rule?.type === 'enum' && rule.enum && rule.enum.length > 0) {
      const idx = (rule.enum.indexOf(prev) + 1) % rule.enum.length;
      return rule.enum[idx];
    }
    if (rule?.type === 'number' && rule.range) {
      const { min, max } = rule.range;
      let candidate = Math.floor(min + Math.random() * (max - min + 1));
      if (String(candidate) === prev && max > min) candidate = candidate === max ? candidate - 1 : candidate + 1;
      return String(candidate);
    }
    if (rule?.type === 'string' && rule.pattern) {
      const n = parseInt(prev || '0', 10) + 1;
      return rule.pattern.replace('{n}', String(isNaN(n) ? 1 : n));
    }
    if (fieldOID === 'DM.SEX') return prev === 'M' ? 'F' : 'M';
    return prev === '1' ? '0' : '1';
  }
}
