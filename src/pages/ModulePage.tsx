import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Download,
  FileBarChart,
  Map,
  Waves,
} from 'lucide-react';
import { lazy, Suspense, useMemo } from 'react';
import { useHydroRegistry } from '../HydroRegistryContext';
import { PanelHeader } from '../components/PanelHeader';
import { categoryMeta, statusLabel } from '../metadata';
import type { HydroRecord } from '../types';

const OperationalLeafletMap = lazy(() => import('../components/OperationalLeafletMap'));

type ModuleVariant = 'monitoramento' | 'manutencao' | 'mapa' | 'relatorios';

type ModuleConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Waves;
};

const moduleConfig: Record<ModuleVariant, ModuleConfig> = {
  monitoramento: {
    eyebrow: 'Monitoramento Operacional',
    title: 'Leituras e indicadores conectados ao cadastro',
    description: 'Acompanhamento de vazão, nível, última medição e situação operacional dos ativos cadastrados.',
    icon: Waves,
  },
  manutencao: {
    eyebrow: 'Manutenção',
    title: 'Triagem técnica dos ativos com pendência',
    description: 'Fila operacional simulada para ativos em atenção, parados ou em manutenção.',
    icon: ClipboardList,
  },
  mapa: {
    eyebrow: 'Mapa Operacional',
    title: 'Distribuição territorial dos ativos cadastrados',
    description: 'Mapa georreferenciado dos ativos, status operacional e rede hídrica cadastrada.',
    icon: Map,
  },
  relatorios: {
    eyebrow: 'Relatórios',
    title: 'Resumo administrativo e operacional',
    description: 'Base inicial para relatórios, auditoria, exportações e prestação de contas.',
    icon: FileBarChart,
  },
};

function ModulePage({ variant }: { variant: ModuleVariant }) {
  const { allRecords } = useHydroRegistry();
  const config = moduleConfig[variant];
  const Icon = config.icon;
  const visibleRecords = useMemo(() => filterRecords(variant, allRecords), [allRecords, variant]);
  const metrics = useMemo(() => makeModuleMetrics(variant, allRecords, visibleRecords), [allRecords, variant, visibleRecords]);

  return (
    <main className="dashboard route-page">
      <section className="page-hero">
        <div>
          <span className="eyebrow">{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <span className="module-route-icon">
          <Icon size={30} />
        </span>
      </section>

      <section className="page-metrics-grid" aria-label="Indicadores do módulo">
        {metrics.map((metric) => (
          <article className="page-metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </article>
        ))}
      </section>

      {variant === 'mapa' ? <MapWorkspace records={allRecords} /> : null}
      {variant === 'relatorios' ? <ReportsWorkspace records={allRecords} /> : null}

      <section className="panel table-panel module-table-panel">
        <PanelHeader title={variant === 'manutencao' ? 'Fila operacional' : 'Registros conectados'} icon={<BarChart3 size={19} />} />
        <div className="asset-table" role="table" aria-label="Registros conectados ao módulo">
          <div className="asset-row table-head" role="row">
            <span>Código</span>
            <span>Nome</span>
            <span>Tipo</span>
            <span>Status</span>
            <span>Vazão</span>
            <span>Última medição</span>
          </div>
          {visibleRecords.map((record) => (
            <div className="asset-row" key={record.id} role="row">
              <span>{record.code}</span>
              <strong>{record.name}</strong>
              <span>{categoryMeta[record.category].label}</span>
              <span>
                <i className={`status-dot status-${record.status}`} />
                {statusLabel[record.status]}
              </span>
              <span>{record.flowRate} m³/h</span>
              <span>{record.lastReading}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function filterRecords(variant: ModuleVariant, records: HydroRecord[]) {
  if (variant === 'manutencao') {
    return records.filter((record) => record.status !== 'operando');
  }

  return records;
}

function makeModuleMetrics(variant: ModuleVariant, allRecords: HydroRecord[], visibleRecords: HydroRecord[]) {
  const totalFlow = visibleRecords.reduce((total, record) => total + Number(record.flowRate || 0), 0);
  const alertCount = allRecords.filter((record) => record.status !== 'operando').length;
  const averageLevelValues = allRecords
    .map((record) => record.reservoirLevel)
    .filter((level): level is number => typeof level === 'number');
  const averageLevel = averageLevelValues.length
    ? Math.round(averageLevelValues.reduce((total, level) => total + level, 0) / averageLevelValues.length)
    : 0;

  if (variant === 'relatorios') {
    return [
      { label: 'Ativos no relatório', value: String(allRecords.length), detail: 'registros locais' },
      { label: 'Ocorrências abertas', value: String(alertCount), detail: 'simuladas pelo status' },
      { label: 'Nível médio', value: `${averageLevel}%`, detail: 'reservatórios e zonas' },
    ];
  }

  return [
    { label: 'Registros do módulo', value: String(visibleRecords.length), detail: 'base do cadastro hídrico' },
    { label: 'Vazão monitorada', value: `${totalFlow} m³/h`, detail: 'somatório local' },
    { label: 'Pontos em alerta', value: String(alertCount), detail: 'atenção, parado ou manutenção' },
  ];
}

function MapWorkspace({ records }: { records: HydroRecord[] }) {
  const markers = records.slice(0, 6);

  return (
    <section className="panel route-map-panel">
      <PanelHeader title="Camada geográfica operacional" icon={<Map size={19} />} />
      <div className="module-map-layout">
        <div className="map-canvas map-canvas-large" aria-label="Mapa operacional ampliado">
          <Suspense fallback={<div className="operational-map-loading">Carregando camada geográfica</div>}>
            <OperationalLeafletMap className="operational-map-large" records={records} />
          </Suspense>
        </div>
        <div className="map-side-list">
          {markers.map((record) => (
            <article key={record.id}>
              <span className={`status-dot status-${record.status}`} />
              <div>
                <strong>{record.name}</strong>
                <small>{record.location}</small>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReportsWorkspace({ records }: { records: HydroRecord[] }) {
  const pendingRecords = records.filter((record) => record.status !== 'operando');

  return (
    <section className="reports-grid">
      <article className="panel report-card">
        <PanelHeader title="Gerar relatório" icon={<Download size={19} />} />
        <p>Baixe o resumo administrativo com indicadores, ativos cadastrados e situação operacional atual.</p>
        <div className="report-actions">
          <button className="primary-action" type="button" onClick={() => downloadReportPdf(records)}>
            Baixar PDF
          </button>
          <button className="secondary-action" type="button" onClick={() => downloadReportWord(records)}>
            Baixar Word
          </button>
          <button className="secondary-action" type="button" onClick={() => downloadRecordsCsv(records, 'sighidro-relatorio-ativos.csv')}>
            Baixar CSV
          </button>
        </div>
      </article>
      <article className="panel report-card">
        <PanelHeader title="Auditoria operacional" icon={<AlertTriangle size={19} />} />
        <p>{pendingRecords.length} registro(s) exigem acompanhamento no cadastro atual.</p>
        <div className="report-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => downloadRecordsCsv(pendingRecords, 'sighidro-auditoria-operacional.csv')}
            disabled={!pendingRecords.length}
          >
            Baixar auditoria
          </button>
        </div>
      </article>
    </section>
  );
}

function downloadRecordsCsv(records: HydroRecord[], filename: string) {
  const headers = ['Codigo', 'Nome', 'Tipo', 'Status', 'Localidade', 'Responsavel', 'Vazao', 'Nivel', 'Energia', 'Ultima medicao'];
  const rows = records.map((record) => [
    record.code,
    record.name,
    categoryMeta[record.category].label,
    statusLabel[record.status],
    record.location,
    record.responsible,
    record.flowRate ?? '',
    resolveLevel(record),
    record.energyType ?? '',
    record.lastReading,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => csvCell(value)).join(';'))
    .join('\n');

  downloadTextFile(`\uFEFF${csv}`, filename, 'text/csv;charset=utf-8');
}

function downloadReportPdf(records: HydroRecord[]) {
  const pdf = buildReportPdf(records);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'sighidro-relatorio-operacional.pdf');
}

function downloadReportWord(records: HydroRecord[]) {
  downloadTextFile(`\uFEFF${buildReportHtml(records)}`, 'sighidro-relatorio-operacional.doc', 'application/msword;charset=utf-8');
}

function buildReportHtml(records: HydroRecord[]) {
  const totalFlow = records.reduce((total, record) => total + Number(record.flowRate || 0), 0);
  const pendingCount = records.filter((record) => record.status !== 'operando').length;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const rows = records
    .map(
      (record) => `
        <tr>
          <td>${escapeHtml(record.code)}</td>
          <td>${escapeHtml(record.name)}</td>
          <td>${escapeHtml(categoryMeta[record.category].label)}</td>
          <td>${escapeHtml(statusLabel[record.status])}</td>
          <td>${escapeHtml(record.location)}</td>
          <td>${escapeHtml(String(record.flowRate ?? '-'))}</td>
          <td>${escapeHtml(String(resolveLevel(record) || '-'))}</td>
          <td>${escapeHtml(record.lastReading)}</td>
        </tr>
      `,
    )
    .join('');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório SIGHIDRO</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
    h1 { margin: 0 0 8px; font-size: 26px; }
    p { margin: 0 0 20px; color: #475569; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
    .metric { border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; }
    .metric span { display: block; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 8px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
    th { background: #f8fafc; color: #334155; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>Relatório administrativo e operacional SIGHIDRO</h1>
  <p>Gerado em ${escapeHtml(generatedAt)} a partir dos registros cadastrados.</p>
  <section class="summary">
    <div class="metric"><span>Ativos</span><strong>${records.length}</strong></div>
    <div class="metric"><span>Ocorrências</span><strong>${pendingCount}</strong></div>
    <div class="metric"><span>Vazão cadastrada</span><strong>${totalFlow} m³/h</strong></div>
  </section>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Nome</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Localidade</th>
        <th>Vazão</th>
        <th>Nível</th>
        <th>Última medição</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  return html;
}

function buildReportPdf(records: HydroRecord[]) {
  const totalFlow = records.reduce((total, record) => total + Number(record.flowRate || 0), 0);
  const pendingCount = records.filter((record) => record.status !== 'operando').length;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const pages: string[][] = [[]];
  let y = 790;

  const currentPage = () => pages[pages.length - 1];
  const addPage = () => {
    pages.push([]);
    y = 790;
  };
  const addLine = (text: string, options: { font?: 'F1' | 'F2'; lineHeight?: number; size?: number; x?: number } = {}) => {
    const { font = 'F1', lineHeight = 16, size = 10, x = 50 } = options;

    if (y < 50) {
      addPage();
    }

    currentPage().push(`BT /${font} ${size} Tf ${x} ${y} Td (${escapePdfText(toPdfText(text))}) Tj ET`);
    y -= lineHeight;
  };

  addLine('Relatorio administrativo e operacional SIGHIDRO', { lineHeight: 26, size: 18 });
  addLine(`Gerado em ${generatedAt}`, { lineHeight: 24, size: 10 });
  addLine(`Ativos: ${records.length} | Ocorrencias: ${pendingCount} | Vazao cadastrada: ${totalFlow} m3/h`, { lineHeight: 28, size: 11 });
  addLine('Codigo     Nome                     Tipo         Status       Vazao     Nivel    Ultima medicao', { font: 'F2', lineHeight: 14, size: 8 });
  addLine('--------------------------------------------------------------------------------------------------', { font: 'F2', lineHeight: 12, size: 8 });

  records.forEach((record) => {
    addLine(
      [
        pdfColumn(record.code, 10),
        pdfColumn(record.name, 24),
        pdfColumn(categoryMeta[record.category].label, 12),
        pdfColumn(statusLabel[record.status], 12),
        pdfColumn(`${record.flowRate ?? '-'} m3/h`, 9),
        pdfColumn(resolveLevel(record) || '-', 8),
        pdfColumn(record.lastReading, 16),
      ].join(' '),
      { font: 'F2', lineHeight: 13, size: 8 },
    );
  });

  return createPdfDocument(pages.map((page) => page.join('\n')));
}

function createPdfDocument(pageContents: string[]) {
  const fontHelveticaId = 3;
  const fontCourierId = 4;
  const pageObjectStartId = 5;
  const maxObjectId = pageObjectStartId + pageContents.length * 2 - 1;
  const kids = pageContents.map((_, index) => `${pageObjectStartId + index * 2} 0 R`).join(' ');
  const objects: Array<{ body: string; id: number }> = [
    { id: 1, body: '<< /Type /Catalog /Pages 2 0 R >>' },
    { id: 2, body: `<< /Type /Pages /Kids [${kids}] /Count ${pageContents.length} >>` },
    { id: fontHelveticaId, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>' },
    { id: fontCourierId, body: '<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>' },
  ];

  pageContents.forEach((content, index) => {
    const pageId = pageObjectStartId + index * 2;
    const contentId = pageId + 1;

    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontHelveticaId} 0 R /F2 ${fontCourierId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    });
    objects.push({
      id: contentId,
      body: `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    });
  });

  const offsets: number[] = [];
  let pdf = '%PDF-1.4\n';

  objects
    .sort((a, b) => a.id - b.id)
    .forEach((object) => {
      offsets[object.id] = pdf.length;
      pdf += `${object.id} 0 obj\n${object.body}\nendobj\n`;
    });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${maxObjectId + 1}\n0000000000 65535 f \n`;

  for (let id = 1; id <= maxObjectId; id += 1) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return pdf;
}

function pdfColumn(value: string | number, width: number) {
  const text = toPdfText(String(value));

  if (text.length > width) {
    return `${text.slice(0, Math.max(0, width - 1))}~`;
  }

  return text.padEnd(width, ' ');
}

function downloadTextFile(content: string, filename: string, type: string) {
  downloadBlob(new Blob([content], { type }), filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function resolveLevel(record: HydroRecord) {
  if (typeof record.reservoirLevel === 'number') {
    return `${record.reservoirLevel}%`;
  }

  if (typeof record.capacityM3 === 'number') {
    return `${record.capacityM3} m³`;
  }

  return '';
}

function csvCell(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function toPdfText(value: string) {
  return value
    .replace(/³/g, '3')
    .replace(/–/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default ModulePage;
