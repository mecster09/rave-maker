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

export class RwsSimulator {
  private readonly opts: SimulatorOptions;
  private readonly studyOid: string;
  private subjects: Subject[] = [];
  private audit: AuditRecord[] = [];
  private nextAuditId = 1;
  private ticks = 0;
  private timer: NodeJS.Timeout | null = null;
  private visitTemplates: VisitTemplate[] = [];

  constructor(studyOid: string, opts: SimulatorOptions) {
    this.studyOid = studyOid;
    this.opts = opts;
    this.visitTemplates = opts.visits?.templates || [
      { name: 'Demographics', dayOffset: 0, forms: [{ oid: 'DM', name: 'Demographics' }] },
    ];
    this.seed();
    if (this.opts.intervalMs > 0) this.start();
  }

  private log(msg: string) {
    if (this.opts.logging) console.log(`[SIMULATOR] ${msg}`);
  }

  private seed() {
    const total = this.opts.sites * this.opts.subjectsPerSite;
    let counter = 1000;
    for (let s = 1; s <= this.opts.sites; s++) {
      const site = String(s).padStart(3, '0');
      const siteName = this.opts.siteNames && this.opts.siteNames[s - 1] ? this.opts.siteNames[s - 1] : undefined;
      for (let i = 0; i < this.opts.subjectsPerSite; i++) {
        counter++;
        this.subjects.push({ key: String(counter), site, siteName, status: 'Active', progress: 0, visitIndex: 0, fieldValues: {} });
      }
    }
    this.log(`Seeded ${total} subjects across ${this.opts.sites} sites`);
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
    this.seed();
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

      const vt = this.visitTemplates[subj.visitIndex] || this.visitTemplates[this.visitTemplates.length - 1];

      if (r < pMissed) {
        subj.visitStatus = 'Missed';
        subj.visitIndex = Math.min(this.visitTemplates.length - 1, subj.visitIndex + 1);
      } else if (r < pMissed + pDelayed) {
        // schedule a delay
        const min = this.opts.visits?.delayMs?.min ?? 0;
        const max = this.opts.visits?.delayMs?.max ?? 0;
        const delay = Math.max(0, Math.floor(min + Math.random() * Math.max(0, max - min)));
        subj.delayedUntil = new Date(now.getTime() + delay);
        subj.visitStatus = 'Delayed';
      } else {
        // Generate forms; partial may only create subset
        const forms = vt.forms;
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
          subj.visitIndex = Math.min(this.visitTemplates.length - 1, subj.visitIndex + 1);
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
      const attrs = [
        `SubjectKey="${escapeXml(s.key)}"`,
        `Status="${escapeXml(s.status)}"`,
        `SiteNumber="${escapeXml(s.site)}"`,
        `Progress="${s.progress}"`,
        `CurrentVisit="${escapeXml((this.visitTemplates[s.visitIndex]?.name) || this.visitTemplates[this.visitTemplates.length - 1].name)}"`,
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
    const formDefs = this.visitTemplates.flatMap(t => t.forms).map(f =>
      `      <FormDef OID="${escapeXml(f.oid)}" Name="${escapeXml(f.name)}"/>`
    );
    // Keep at least one ItemDef for compatibility; later we can derive ItemDefs from forms if needed
    const itemDefs = [
      '      <ItemDef OID="DM.SEX" Name="Sex" DataType="text"/>'
    ];
    return [
      '<ODM FileType="Snapshot" ODMVersion="1.3">',
      `  <Study OID="${escapeXml(oid)}">`,
      `    <MetaDataVersion OID="${escapeXml(ts)}">`,
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
