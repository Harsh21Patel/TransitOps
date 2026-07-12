const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');

/**
 * Converts a list of records to CSV format.
 * @param {Object[]} rows - Data rows
 * @param {string[]} fields - Field column keys to include
 * @returns {string} CSV content
 */
const toCSV = (rows, fields) => {
  const json2csvParser = new Parser({ fields });
  return json2csvParser.parse(rows);
};

/**
 * Streams a tabular data report as a PDF directly to an Express response stream.
 * Auto-scales columns to fit A4 layout margins.
 * 
 * @param {Object} res - Express response stream
 * @param {Object} options - PDF formatting options
 * @param {string} options.title - Document title
 * @param {string} options.subtitle - Document subtitle
 * @param {Object[]} options.columns - Column specs: { key, label, width }
 * @param {Object[]} options.rows - Data row records
 */
const streamTablePDF = (res, { title, subtitle, columns, rows }) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });

  // Pipe PDF output directly to response stream
  doc.pipe(res);

  // Render Title and Subtitle
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(18).text(title, { align: 'center' });
  doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(subtitle, { align: 'center', marginTop: 4 });
  doc.moveDown(1.5);

  const startX = 30;
  const printableWidth = doc.page.width - 60; // 535.28 points on standard A4
  let startY = doc.y;

  // Scale columns dynamically so they sum exactly to standard printable width boundaries
  const totalSpecWidth = columns.reduce((acc, col) => acc + (col.width || 80), 0);
  const scale = printableWidth / totalSpecWidth;
  const scaledColumns = columns.map((col) => ({
    ...col,
    width: (col.width || 80) * scale,
  }));

  // Render Header Background
  doc.rect(startX, startY - 4, printableWidth, 18).fill('#f1f5f9');
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5);

  // Render Headers
  let currentX = startX;
  scaledColumns.forEach((col) => {
    const align = ['amount', 'distance', 'cargoWeight'].includes(col.key) ? 'right' : 'left';
    doc.text(col.label, currentX, startY, { width: col.width - 5, align, lineBreak: false });
    currentX += col.width;
  });

  doc.moveDown(1.2);
  startY = doc.y;

  // Render Rows
  doc.font('Helvetica').fontSize(8).fillColor('#334155');

  rows.forEach((row, rowIndex) => {
    // Page brake detection: add page + redraw headers if table overflows vertically
    if (startY > doc.page.height - 45) {
      doc.addPage({ margin: 30, size: 'A4' });
      startY = 30;

      // Redraw Header inside new page
      doc.rect(startX, startY - 4, printableWidth, 18).fill('#f1f5f9');
      doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8.5);

      let headerX = startX;
      scaledColumns.forEach((col) => {
        const align = ['amount', 'distance', 'cargoWeight'].includes(col.key) ? 'right' : 'left';
        doc.text(col.label, headerX, startY, { width: col.width - 5, align, lineBreak: false });
        headerX += col.width;
      });

      doc.moveDown(1.2);
      startY = doc.y;
      doc.font('Helvetica').fontSize(8).fillColor('#334155');
    }

    // Row Background (Zebra Striping)
    if (rowIndex % 2 === 1) {
      doc.rect(startX, startY - 3, printableWidth, 14).fill('#f8fafc');
      doc.fillColor('#334155');
    }

    // Render columns
    let rowX = startX;
    scaledColumns.forEach((col) => {
      const val = row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : '—';
      const align = ['amount', 'distance', 'cargoWeight'].includes(col.key) ? 'right' : 'left';
      doc.text(val, rowX, startY, { width: col.width - 5, align, lineBreak: false });
      rowX += col.width;
    });

    startY += 14;
  });

  doc.end();
};

module.exports = { toCSV, streamTablePDF };
