import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';

/**
 * CSVファイルをパースして生データを返す
 * @param {File} file
 * @returns {Promise<{headers: string[], rows: Object[]}>}
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error('CSVの形式が正しくありません。カラムを確認してください'));
          return;
        }
        const headers = results.meta.fields || [];
        resolve({ headers, rows: results.data });
      },
      error: () => reject(new Error('CSVの形式が正しくありません。カラムを確認してください')),
    });
  });
}

/**
 * カラムマッピングに従って寄付データに変換
 * @param {Object[]} rows
 * @param {{ date: string, municipality: string, giftName: string, amount: string }} mapping
 * @returns {Object[]}
 */
export function mapToDonatons(rows, mapping) {
  return rows
    .map((row) => ({
      id: uuidv4(),
      date: row[mapping.date] || '',
      municipality: row[mapping.municipality] || '',
      giftName: row[mapping.giftName] || '',
      amount: parseInt(String(row[mapping.amount] || '0').replace(/[^0-9]/g, ''), 10) || 0,
    }))
    .filter((d) => d.municipality && d.amount > 0);
}
