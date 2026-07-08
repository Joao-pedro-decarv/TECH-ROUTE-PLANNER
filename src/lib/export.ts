import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export interface ExportColumn { header: string; key: string; }

export function exportToPDF(title: string, columns: ExportColumn[], rows: any[], filename: string) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(new Date().toLocaleString("pt-BR"), 14, 21);
  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => r[c.key] ?? "")),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 76, 92], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function exportToExcel(title: string, columns: ExportColumn[], rows: any[], filename: string) {
  const data = rows.map((r) => {
    const o: Record<string, any> = {};
    columns.forEach((c) => { o[c.header] = r[c.key] ?? ""; });
    return o;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

export interface RotaSeparacaoItem {
  numero: string;
  cliente: string;
  cidade?: string;
  bairro?: string;
  patrimonio?: string;
  modelo?: string;
  tecnico?: string;
  tipo: string; // OS | ENTREGA
  peca: string;
  qtd: number;
}

export function exportRotaSeparacaoPDF(data: string, tecnicoNome: string | null, itens: RotaSeparacaoItem[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 76, 92);
  doc.rect(0, 0, w, 22, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("ROMANEIO DE SEPARAÇÃO — ROTA DO DIA", 14, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`Data: ${new Date(data + "T00:00").toLocaleDateString("pt-BR")}${tecnicoNome ? `   ·   Técnico: ${tecnicoNome}` : "   ·   Todos os técnicos"}`, 14, 18);
  doc.setFontSize(9);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, w - 14, 11, { align: "right" });

  doc.setTextColor(0);

  autoTable(doc, {
    startY: 28,
    head: [["OS/Entrega", "Tipo", "Cliente", "Cidade/Bairro", "Equipamento", "Técnico", "Peça / Item", "Qtd.", "Separado", "Devolvido"]],
    body: itens.map((i) => [
      i.numero,
      i.tipo,
      i.cliente,
      [i.cidade, i.bairro].filter(Boolean).join(" / "),
      [i.patrimonio, i.modelo].filter(Boolean).join(" · "),
      i.tecnico ?? "—",
      i.peca,
      String(i.qtd),
      "", // Separado — preenchimento manual
      "", // Devolvido — preenchimento manual
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5, lineWidth: 0.1, lineColor: [180, 180, 180] },
    headStyles: { fillColor: [15, 76, 92], textColor: 255, halign: "center" },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 20, halign: "center" },
      6: { cellWidth: 55, fontStyle: "bold" },
      7: { cellWidth: 14, halign: "center" },
      8: { cellWidth: 22, halign: "center", fillColor: [252, 252, 240] },
      9: { cellWidth: 22, halign: "center", fillColor: [252, 252, 240] },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 10, right: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9); doc.setTextColor(60);
  doc.text(`Total de itens: ${itens.length}`, 14, finalY);

  doc.setDrawColor(120);
  doc.line(14, finalY + 22, 90, finalY + 22);
  doc.line(w - 90, finalY + 22, w - 14, finalY + 22);
  doc.setFontSize(8); doc.setTextColor(90);
  doc.text("Separado por", 52, finalY + 26, { align: "center" });
  doc.text("Conferido por", w - 52, finalY + 26, { align: "center" });

  doc.save(`romaneio-rota-${data}${tecnicoNome ? `-${tecnicoNome.replace(/\s+/g, "_")}` : ""}.pdf`);
}

export interface TechnicalReport {
  numero: string;
  tipo: string;
  data_agendada: string;
  iniciada_em?: string | null;
  finalizada_em?: string | null;
  cliente?: string;
  cliente_endereco?: string;
  cliente_cidade?: string;
  cliente_telefone?: string;
  cliente_contato?: string;
  patrimonio?: string;
  numero_serie?: string;
  modelo?: string;
  problema?: string;
  servico?: string;
  tecnico?: string;
  acompanhante?: string;
  resultado?: string;
  custo?: number | null;
  tempo_deslocamento_min?: number | null;
  tempo_execucao_min?: number | null;
  contador_mono?: number | null;
  contador_color?: number | null;
  contador_total?: number | null;
  satisfacao_nota?: number | null;
  satisfacao_observacao?: string | null;
  assinatura_cliente?: string | null;
  observacoes_finais?: string;
  pecas: { descricao: string; quantidade: number }[];
  mauUso?: {
    troca?: string; defeito?: string; como?: string;
    responsavel?: string; contato?: string;
  } | null;
}

const BRAND: [number, number, number] = [15, 76, 92];
const ACCENT: [number, number, number] = [230, 240, 244];

export function exportTechnicalReportPDF(r: TechnicalReport) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // ============ CABEÇALHO ============
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, w, 26, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text("RELATÓRIO TÉCNICO DE ATENDIMENTO", 14, 12);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`OS ${r.numero}  ·  Tipo: ${r.tipo}`, 14, 19);
  doc.setFontSize(9);
  doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`, w - 14, 12, { align: "right" });

  doc.setTextColor(0);
  let y = 32;

  const section = (title: string) => {
    doc.setFillColor(...ACCENT);
    doc.rect(14, y - 4, w - 28, 6, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...BRAND);
    doc.text(title, 16, y);
    doc.setTextColor(0); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    y += 6;
  };

  const kv = (label: string, val: any, col = 0) => {
    if (val === undefined || val === null || val === "") return;
    const colW = (w - 28) / 2;
    const x = 14 + col * colW;
    doc.setFont("helvetica", "bold"); doc.text(`${label}:`, x, y);
    doc.setFont("helvetica", "normal");
    const txt = doc.splitTextToSize(String(val), colW - 28);
    doc.text(txt, x + 28, y);
    if (col === 1 || !arguments.length) y += Math.max(5, txt.length * 4.5);
  };
  const kvRow = (l1: string, v1: any, l2?: string, v2?: any) => {
    const hasL = (v1 !== undefined && v1 !== null && v1 !== "");
    const hasR = (v2 !== undefined && v2 !== null && v2 !== "");
    if (!hasL && !hasR) return;
    const colW = (w - 28) / 2;
    doc.setFont("helvetica", "bold");
    if (hasL) doc.text(`${l1}:`, 14, y);
    if (hasR && l2) doc.text(`${l2}:`, 14 + colW, y);
    doc.setFont("helvetica", "normal");
    const t1 = hasL ? doc.splitTextToSize(String(v1), colW - 30) : [""];
    const t2 = hasR ? doc.splitTextToSize(String(v2), colW - 30) : [""];
    if (hasL) doc.text(t1, 14 + 28, y);
    if (hasR) doc.text(t2, 14 + colW + 28, y);
    y += Math.max(5, Math.max(t1.length, t2.length) * 4.5);
  };
  const kvFull = (label: string, val: any) => {
    if (val === undefined || val === null || val === "") return;
    doc.setFont("helvetica", "bold"); doc.text(`${label}:`, 14, y);
    doc.setFont("helvetica", "normal");
    const t = doc.splitTextToSize(String(val), w - 28 - 32);
    doc.text(t, 14 + 32, y);
    y += Math.max(5, t.length * 4.5);
  };

  // ============ CLIENTE ============
  section("Dados do Cliente");
  kvRow("Cliente", r.cliente, "Cidade", r.cliente_cidade);
  kvRow("Contato", r.cliente_contato, "Telefone", r.cliente_telefone);
  kvFull("Endereço do atendimento", r.cliente_endereco);
  y += 3;

  // ============ EQUIPAMENTO ============
  section("Equipamento");
  kvRow("Patrimônio", r.patrimonio, "Nº de série", r.numero_serie);
  kvFull("Modelo", r.modelo);
  y += 3;

  // ============ ATENDIMENTO ============
  section("Atendimento");
  kvRow(
    "Data agendada", new Date(r.data_agendada + "T00:00").toLocaleDateString("pt-BR"),
    "Data conclusão", r.finalizada_em ? new Date(r.finalizada_em).toLocaleString("pt-BR") : "—"
  );
  kvRow(
    "Início", r.iniciada_em ? new Date(r.iniciada_em).toLocaleString("pt-BR") : "—",
    "Tempo execução", r.tempo_execucao_min != null ? `${r.tempo_execucao_min} min` : "—"
  );
  kvRow("Técnico responsável", r.tecnico, "Acompanhante", r.acompanhante);
  kvFull("Problema relatado", r.problema);
  y += 3;

  // ============ SERVIÇO ============
  section("Laudo / Serviço realizado");
  const svc = doc.splitTextToSize(r.servico || "—", w - 28);
  doc.text(svc, 14, y); y += svc.length * 4.5 + 3;

  // ============ CONTADORES ============
  if (r.contador_mono != null || r.contador_color != null || r.contador_total != null) {
    section("Contadores do equipamento");
    kvRow("Mono", r.contador_mono, "Color", r.contador_color);
    kvRow("Total", r.contador_total);
    y += 3;
  }

  // ============ PEÇAS ============
  if (r.pecas.length) {
    section("Peças utilizadas");
    autoTable(doc, {
      startY: y,
      head: [["Peça", "Quantidade"]],
      body: r.pecas.map((p) => [p.descricao, String(p.quantidade)]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: BRAND, textColor: 255 },
      margin: { left: 14, right: 14 },
      theme: "striped",
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  // ============ RESULTADO ============
  section("Resultado");
  const resultadoLabel: Record<string, string> = {
    OK_COM_PECA: "OK com peça", OK_SEM_PECA: "OK sem peça", NECESSARIO_RETORNO: "Necessário retorno",
  };
  kvRow(
    "Status", r.resultado ? (resultadoLabel[r.resultado] ?? r.resultado) : "—",
    "Custo", r.custo != null ? `R$ ${Number(r.custo).toFixed(2)}` : undefined
  );
  if (r.observacoes_finais) kvFull("Observações", r.observacoes_finais);
  y += 3;

  // ============ SATISFAÇÃO ============
  if (r.satisfacao_nota != null || r.satisfacao_observacao) {
    section("Pesquisa de satisfação");
    if (r.satisfacao_nota != null) {
      doc.setFont("helvetica", "bold"); doc.text("Nota:", 14, y);
      doc.setFont("helvetica", "normal");
      const stars = "★".repeat(Number(r.satisfacao_nota)) + "☆".repeat(5 - Number(r.satisfacao_nota));
      doc.text(`${r.satisfacao_nota}/5   ${stars}`, 30, y);
      y += 5;
    }
    if (r.satisfacao_observacao) kvFull("Observação", r.satisfacao_observacao);
    y += 3;
  }

  // ============ MAU USO ============
  if (r.mauUso) {
    section("Registro de Mau Uso");
    kvRow("Peça trocada?", r.mauUso.troca, "Responsável", r.mauUso.responsavel);
    kvFull("Defeito", r.mauUso.defeito);
    kvFull("Como ocorreu", r.mauUso.como);
    kvFull("Contato", r.mauUso.contato);
    y += 3;
  }

  // ============ ASSINATURAS ============
  // reserva espaço; se não couber, nova página
  if (y > h - 55) { doc.addPage(); y = 20; }
  y = Math.max(y + 8, h - 55);

  // assinatura do cliente (imagem)
  if (r.assinatura_cliente) {
    try {
      doc.addImage(r.assinatura_cliente, "PNG", w - 90, y - 25, 70, 22);
    } catch { /* ignore invalid image */ }
  }

  doc.setDrawColor(60);
  doc.line(20, y, 90, y);
  doc.line(w - 90, y, w - 20, y);
  doc.setFontSize(9); doc.setTextColor(90);
  doc.text(r.tecnico ?? "Técnico responsável", 55, y + 5, { align: "center" });
  doc.text(r.cliente ?? "Cliente", w - 55, y + 5, { align: "center" });
  doc.setFontSize(7); doc.setTextColor(140);
  doc.text("Assinatura do técnico", 55, y + 9, { align: "center" });
  doc.text("Assinatura do cliente", w - 55, y + 9, { align: "center" });

  // rodapé
  doc.setFontSize(7); doc.setTextColor(150);
  doc.text(`OS ${r.numero} · Gerado em ${new Date().toLocaleString("pt-BR")}`, w / 2, h - 8, { align: "center" });

  doc.save(`relatorio-tecnico-OS-${r.numero}.pdf`);
}
