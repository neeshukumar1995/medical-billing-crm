import * as XLSX from 'xlsx'

const today = () => new Date().toISOString().slice(0, 10)

// "Acme Health / Main" -> "Acme_Health_Main"
const safeFileName = (name) => String(name || 'export').replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')

/**
 * Downloads an .xlsx file with one worksheet per entry.
 * sheets: [{ name: 'Companies', rows: [{ Column: value, ... }] }]
 * The date is appended to the file name.
 */
export const exportToExcel = (fileName, sheets) => {
    const workbook = XLSX.utils.book_new()
    sheets.forEach(({ name, rows }) => {
        const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'No data' }])
        // Excel sheet names: max 31 chars, no []:*?/\
        XLSX.utils.book_append_sheet(workbook, sheet, String(name).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31))
    })
    XLSX.writeFile(workbook, `${safeFileName(fileName)}_${today()}.xlsx`)
}

/** Downloads an import template: a header row plus one example row. */
export const downloadTemplate = (fileName, headers, exampleRow = []) => {
    const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Template')
    XLSX.writeFile(workbook, `${safeFileName(fileName)}.xlsx`)
}
