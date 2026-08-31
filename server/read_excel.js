const ExcelJS = require('exceljs');

async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('test_report.xlsx');
  const worksheet = workbook.getWorksheet('Exam Marks');
  worksheet.eachRow((row, rowNumber) => {
    console.log(`Row ${rowNumber}:`, row.values);
  });
}
run();
