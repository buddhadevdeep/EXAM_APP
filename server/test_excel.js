const ExcelJS = require('exceljs');

const generateExcelReport = async (sheetName, headers, data) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  
  worksheet.columns = headers.map(h => ({ header: h, key: h.toLowerCase().replace(/ /g, '_'), width: 20 }));
  
  console.log('Columns:', worksheet.columns.map(c => ({ header: c.header, key: c.key })));
  
  data.forEach((row, i) => {
    const rowObj = {};
    headers.forEach((h, index) => {
      rowObj[h.toLowerCase().replace(/ /g, '_')] = row[index];
    });
    console.log(`RowObj ${i}:`, rowObj);
    worksheet.addRow(rowObj);
  });
  
  await workbook.xlsx.writeFile('test_report.xlsx');
  console.log('Excel file test_report.xlsx generated successfully!');
};

const headers = ['Full Name', 'Roll Number', 'Status', 'Score', 'Feedback'];
const data = [
  ['deep', '421', 'Draft', 2, 'Rr'],
  ['deep', '421', 'Draft', 0, 'Jsjs'],
  ['param kotadiya', '24010101022', 'Submitted', 2, 'Revision']
];

generateExcelReport('Exam Marks', headers, data);
