const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

exports.generatePDFReport = (res, title, headers, data) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  // Set headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=report.pdf`);
  
  doc.pipe(res);
  
  // Document Title
  doc.fontSize(20).text(title, { align: 'center' });
  doc.moveDown(2);
  
  // Basic Table Drawing
  let startY = 100;
  const startX = 30;
  const columnWidth = 100;
  
  // Draw Headers
  doc.fontSize(12).font('Helvetica-Bold');
  headers.forEach((header, index) => {
    doc.text(header, startX + (index * columnWidth), startY);
  });
  
  doc.moveTo(startX, startY + 15).lineTo(550, startY + 15).stroke();
  doc.font('Helvetica');
  
  // Draw Data rows
  startY += 25;
  data.forEach((row) => {
    row.forEach((cell, cellIndex) => {
      doc.text(String(cell), startX + (cellIndex * columnWidth), startY);
    });
    startY += 20;
    
    if (startY > 700) {
      doc.addPage();
      startY = 50;
    }
  });
  
  doc.end();
};

exports.generateExcelReport = async (res, sheetName, headers, data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  worksheet.columns = headers.map(h => ({ header: h, key: h.toLowerCase().replace(/ /g, '_'), width: 20 }));
  
  data.forEach(row => {
    const rowObj = {};
    headers.forEach((h, index) => {
      rowObj[h.toLowerCase().replace(/ /g, '_')] = row[index];
    });
    worksheet.addRow(rowObj);
  });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=report.xlsx`);
  
  await workbook.xlsx.write(res);
  res.end();
};
