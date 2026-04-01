// Report PDF service — generates PDF documents for any report data
import { Injectable } from '@nestjs/common';

interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: 'currency' | 'number' | 'date';
}

interface ReportData {
  title: string;
  company_name: string;
  date_range?: string;
  as_of?: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  totals?: Record<string, number>;
}

@Injectable()
export class ReportPdfService {
  async generateReportPdf(data: ReportData): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50, bufferPages: true });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const headerColor = '#1B4332';
      const textColor = '#5C4033';
      const altRowColor = '#E8DCC8';
      const pageWidth = doc.page.width - 100; // margins

      // ─── Header ──────────────────────────────────────────────────────
      doc.fontSize(18).fillColor(headerColor).text(data.company_name, { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).fillColor(headerColor).text(data.title, { align: 'center' });
      doc.moveDown(0.3);

      if (data.date_range) {
        doc.fontSize(10).fillColor(textColor).text(`Period: ${data.date_range}`, { align: 'center' });
      }
      if (data.as_of) {
        doc.fontSize(10).fillColor(textColor).text(`As of: ${data.as_of}`, { align: 'center' });
      }
      doc.moveDown(0.5);

      // ─── Divider line ────────────────────────────────────────────────
      doc.strokeColor(headerColor).lineWidth(1)
        .moveTo(50, doc.y).lineTo(50 + pageWidth, doc.y).stroke();
      doc.moveDown(0.5);

      // ─── Table ───────────────────────────────────────────────────────
      const columns = data.columns;
      const colCount = columns.length;
      const colWidth = pageWidth / colCount;
      const startX = 50;

      // Table header
      const headerY = doc.y;
      doc.fontSize(9).fillColor(headerColor);

      // Header background
      doc.rect(startX, headerY - 2, pageWidth, 16).fill(headerColor);
      doc.fillColor('#FFFFFF');

      for (let i = 0; i < colCount; i++) {
        const col = columns[i];
        const x = startX + i * colWidth;
        const align = col.align ?? 'left';
        if (align === 'right') {
          doc.text(col.label, x, headerY, { width: colWidth - 4, align: 'right' });
        } else {
          doc.text(col.label, x + 4, headerY, { width: colWidth - 4, align: 'left' });
        }
      }

      doc.y = headerY + 18;

      // Table rows
      doc.fillColor(textColor).fontSize(8);
      for (let rowIdx = 0; rowIdx < data.rows.length; rowIdx++) {
        const row = data.rows[rowIdx];
        const rowY = doc.y;

        // Check for page break
        if (rowY > doc.page.height - 80) {
          doc.addPage();
          doc.y = 50;
        }

        const currentY = doc.y;

        // Alternating row background
        if (rowIdx % 2 === 1) {
          doc.rect(startX, currentY - 2, pageWidth, 14).fill(altRowColor);
          doc.fillColor(textColor);
        }

        for (let i = 0; i < colCount; i++) {
          const col = columns[i];
          const x = startX + i * colWidth;
          const rawVal = row[col.key];
          const formatted = this.formatValue(rawVal, col.format);
          const align = col.align ?? 'left';

          if (align === 'right') {
            doc.text(formatted, x, currentY, { width: colWidth - 4, align: 'right' });
          } else {
            doc.text(formatted, x + 4, currentY, { width: colWidth - 4, align: 'left' });
          }
        }

        doc.y = currentY + 14;
      }

      // ─── Totals row ──────────────────────────────────────────────────
      if (data.totals) {
        doc.moveDown(0.3);
        const totalsY = doc.y;
        doc.strokeColor(headerColor).lineWidth(0.5)
          .moveTo(startX, totalsY - 2).lineTo(startX + pageWidth, totalsY - 2).stroke();

        doc.fontSize(9).fillColor(headerColor);
        for (let i = 0; i < colCount; i++) {
          const col = columns[i];
          const x = startX + i * colWidth;
          if (i === 0) {
            doc.text('TOTAL', x + 4, totalsY, { width: colWidth - 4, align: 'left' });
          } else if (data.totals[col.key] !== undefined) {
            const formatted = this.formatValue(data.totals[col.key], col.format);
            doc.text(formatted, x, totalsY, { width: colWidth - 4, align: col.align ?? 'right' });
          }
        }
        doc.y = totalsY + 16;
      }

      // ─── Footer ──────────────────────────────────────────────────────
      const now = new Date();
      const timestamp = `Generated: ${now.toISOString().slice(0, 10)} ${now.toTimeString().slice(0, 8)}`;

      // Add footer to all pages
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(7).fillColor('#999999');
        doc.text(
          timestamp,
          50,
          doc.page.height - 30,
          { width: pageWidth / 2, align: 'left' },
        );
        doc.text(
          `Page ${i + 1} of ${pages.count}`,
          50 + pageWidth / 2,
          doc.page.height - 30,
          { width: pageWidth / 2, align: 'right' },
        );
      }

      doc.end();
    });
  }

  private formatValue(val: unknown, format?: 'currency' | 'number' | 'date'): string {
    if (val === null || val === undefined) return '';
    if (format === 'currency') {
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    if (format === 'number') {
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (format === 'date') {
      return String(val).slice(0, 10);
    }
    return String(val);
  }
}
