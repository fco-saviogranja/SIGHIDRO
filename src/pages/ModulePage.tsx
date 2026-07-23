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
    <main className="dashboard route-page" id="main-content" tabIndex={-1}>
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
            <span role="columnheader">Código</span>
            <span role="columnheader">Nome</span>
            <span role="columnheader">Tipo</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Vazão</span>
            <span role="columnheader">Última medição</span>
          </div>
          {!visibleRecords.length ? <div className="empty-state" role="status">Nenhum registro disponível neste módulo.</div> : null}
          {visibleRecords.map((record) => (
            <div className="asset-row" key={record.id} role="row">
              <span role="cell" data-label="Código">{record.code}</span>
              <strong role="cell" data-label="Nome" data-card-title>{record.name}</strong>
              <span role="cell" data-label="Tipo">{categoryMeta[record.category].label}</span>
              <span role="cell" data-label="Status">
                <i className={`status-dot status-${record.status}`} />
                {statusLabel[record.status]}
              </span>
              <span role="cell" data-label="Vazão">{record.flowRate} m³/h</span>
              <span role="cell" data-label="Última medição">{record.lastReading}</span>
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
  downloadNamedFile([pdf], 'sighidro-relatorio-operacional.pdf', 'application/pdf');
}

function downloadReportWord(records: HydroRecord[]) {
  downloadNamedFile(
    [buildReportDocx(records)],
    'sighidro-relatorio-operacional.docx',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  );
}

function buildReportDocx(records: HydroRecord[]) {
  const totalFlow = records.reduce((total, record) => total + Number(record.flowRate || 0), 0);
  const pendingCount = records.filter((record) => record.status !== 'operando').length;
  const generatedAt = new Date().toLocaleString('pt-BR');
  const tableRows = records.map((record) =>
    wordTableRow([
      record.code,
      record.name,
      categoryMeta[record.category].label,
      statusLabel[record.status],
      record.location,
      `${record.flowRate ?? '-'} m3/h`,
      resolveLevel(record) || '-',
      record.lastReading,
    ]),
  );

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>Relatório administrativo e operacional SIGHIDRO</w:t></w:r></w:p>
    <w:p><w:r><w:t>Gerado em ${escapeXml(generatedAt)} a partir dos registros cadastrados.</w:t></w:r></w:p>
    <w:p><w:r><w:t>Ativos: ${records.length} | Ocorrências: ${pendingCount} | Vazão cadastrada: ${totalFlow} m3/h</w:t></w:r></w:p>
    <w:p/>
    <w:tbl>
      <w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tblBorders></w:tblPr>
      ${wordTableRow(['Código', 'Nome', 'Tipo', 'Status', 'Localidade', 'Vazão', 'Nível', 'Última medição'])}
      ${tableRows.join('')}
    </w:tbl>
    <w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/></w:sectPr>
  </w:body>
</w:document>`;

  return createZip([
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    },
    { path: 'word/document.xml', content: documentXml },
  ]);
}

function wordTableRow(cells: Array<string | number>) {
  return `<w:tr>${cells.map((cell) => `<w:tc><w:tcPr><w:tcW w:w="1500" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>${escapeXml(String(cell))}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
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

function createZip(entries: Array<{ content: string | Uint8Array; path: string }>) {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  entries.forEach((entry) => {
    const filename = encoder.encode(entry.path);
    const data = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crc = crc32(data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, filename.length, true);
    localView.setUint16(28, 0, true);

    chunks.push(localHeader, filename, data);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, filename.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralChunks.push(centralHeader, filename);

    offset += localHeader.length + filename.length + data.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concatBytes([...chunks, centralDirectory, endRecord]);
}

function concatBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;

  data.forEach((byte) => {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function downloadTextFile(content: string, filename: string, type: string) {
  downloadNamedFile([content], filename, type);
}

function downloadNamedFile(parts: BlobPart[], filename: string, type: string) {
  const blob = typeof File === 'function' ? new File(parts, filename, { type }) : new Blob(parts, { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.setAttribute('download', filename);
  link.rel = 'noopener';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 1000);
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

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default ModulePage;
