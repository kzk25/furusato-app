import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { parseCSV, mapToDonatons } from '../utils/csvParser';

const STORAGE_KEY = 'furusato_donations';

const emptyForm = { date: '', municipality: '', giftName: '', amount: '' };

export default function DonationHistory({ deductionLimit, donations, setDonations }) {
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvMapping, setCsvMapping] = useState({ date: '', municipality: '', giftName: '', amount: '' });
  const [csvError, setCsvError] = useState('');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const fileRef = useRef();

  const totalDonated = donations.reduce((s, d) => s + d.amount, 0);
  const remaining = deductionLimit - totalDonated;
  const isOverLimit = deductionLimit > 0 && remaining < 0;

  const addDonation = () => {
    if (!form.date || !form.municipality || !form.amount) {
      setFormError('寄付日・自治体名・寄付金額は必須です');
      return;
    }
    const amount = parseInt(form.amount, 10);
    if (isNaN(amount) || amount <= 0) {
      setFormError('寄付金額は正の数を入力してください');
      return;
    }
    setDonations((prev) => [
      { id: uuidv4(), ...form, amount },
      ...prev,
    ]);
    setForm(emptyForm);
    setFormError('');
  };

  const removeDonation = (id) => {
    setDonations((prev) => prev.filter((d) => d.id !== id));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvError('');
    try {
      const { headers, rows } = await parseCSV(file);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvMapping({ date: headers[0] || '', municipality: headers[1] || '', giftName: headers[2] || '', amount: headers[3] || '' });
      setShowCsvModal(true);
    } catch (err) {
      setCsvError(err.message);
    }
    e.target.value = '';
  };

  const importCSV = () => {
    if (!csvMapping.municipality || !csvMapping.amount) {
      setCsvError('自治体名と寄付金額のカラムは必須です');
      return;
    }
    const imported = mapToDonatons(csvRows, csvMapping);
    if (imported.length === 0) {
      setCsvError('インポートできるデータが見つかりませんでした');
      return;
    }
    setDonations((prev) => [...imported, ...prev]);
    setShowCsvModal(false);
    setCsvRows([]);
    setCsvHeaders([]);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-6">寄付履歴を管理する</h2>

      {/* サマリー */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500 mb-1">控除上限額</p>
            <p className="text-2xl font-bold text-gray-800">
              {deductionLimit > 0 ? `¥${deductionLimit.toLocaleString()}` : '未設定'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">寄付済み合計</p>
            <p className="text-2xl font-bold text-orange-600">¥{totalDonated.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">残り使える額</p>
            <p className={`text-2xl font-bold ${isOverLimit ? 'text-red-600' : 'text-emerald-600'}`}>
              {deductionLimit > 0 ? `¥${remaining.toLocaleString()}` : '―'}
            </p>
          </div>
        </div>
        {isOverLimit && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ 寄付済み金額が控除上限を超えています。自己負担が増える可能性があります。
          </div>
        )}
        {deductionLimit === 0 && (
          <p className="mt-3 text-xs text-gray-400 text-center">
            先に「控除上限計算」タブで上限額を設定してください
          </p>
        )}
      </div>

      {/* 手動追加フォーム */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">寄付を手動で追加</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">寄付日 *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">自治体名 *</label>
            <input
              type="text"
              placeholder="例：宮崎県都城市"
              value={form.municipality}
              onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">返礼品名</label>
            <input
              type="text"
              placeholder="例：黒毛和牛 切り落とし 1kg"
              value={form.giftName}
              onChange={(e) => setForm((f) => ({ ...f, giftName: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">寄付金額 *</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                placeholder="10000"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">円</span>
            </div>
          </div>
        </div>
        {formError && <p className="text-red-500 text-xs mb-2">{formError}</p>}
        <button
          onClick={addDonation}
          className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-medium px-6 py-2 rounded-lg text-sm transition-colors"
        >
          追加する
        </button>
      </div>

      {/* CSVインポート */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-2">CSVからインポート</h3>
        <p className="text-xs text-gray-400 mb-3">楽天ふるさと納税・さとふる・ふるなびのCSVに対応。カラムを手動でマッピングできます。</p>
        {csvError && <p className="text-red-500 text-xs mb-2">{csvError}</p>}
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
        <button
          onClick={() => fileRef.current.click()}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-5 py-2 rounded-lg text-sm transition-colors"
        >
          CSVファイルを選択
        </button>
      </div>

      {/* 履歴一覧 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-700">寄付履歴 ({donations.length}件)</h3>
        </div>
        {donations.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            寄付履歴がありません。手動追加またはCSVインポートで登録してください。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">寄付日</th>
                  <th className="px-4 py-3 text-left">自治体</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">返礼品</th>
                  <th className="px-4 py-3 text-right">金額</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {donations.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{d.date}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{d.municipality}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{d.giftName || '―'}</td>
                    <td className="px-4 py-3 text-right font-medium text-orange-600">
                      ¥{d.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => removeDonation(d.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CSVマッピングモーダル */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">CSVカラムのマッピング</h3>
            <p className="text-xs text-gray-500 mb-4">
              インポートされた {csvRows.length} 件のデータのカラムを対応付けてください。
            </p>
            {[
              { key: 'date', label: '寄付日' },
              { key: 'municipality', label: '自治体名 *' },
              { key: 'giftName', label: '返礼品名' },
              { key: 'amount', label: '寄付金額 *' },
            ].map(({ key, label }) => (
              <div key={key} className="mb-3">
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <select
                  value={csvMapping[key]}
                  onChange={(e) => setCsvMapping((m) => ({ ...m, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">（選択しない）</option>
                  {csvHeaders.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
            {csvError && <p className="text-red-500 text-xs mb-2">{csvError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                onClick={importCSV}
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                インポートする
              </button>
              <button
                onClick={() => { setShowCsvModal(false); setCsvError(''); }}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
