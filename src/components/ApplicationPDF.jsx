import { useState } from 'react';
import { generateApplicationPDFs } from '../utils/generatePDF';

const emptyApplicant = {
  name: '',
  nameKana: '',
  birthdate: '',
  postalCode: '',
  address: '',
  phone: '',
  mynumber: '',
  idType: 'マイナンバーカード',
};

const ID_TYPES = ['マイナンバーカード', '通知カード＋身分証', 'その他'];

export default function ApplicationPDF({ donations }) {
  const [applicant, setApplicant] = useState(emptyApplicant);
  const [showMynumber, setShowMynumber] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [errors, setErrors] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const set = (key, value) => setApplicant((a) => ({ ...a, [key]: value }));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === donations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(donations.map((d) => d.id)));
    }
  };

  const validate = () => {
    const errs = {};
    if (!applicant.name.trim()) errs.name = '氏名は必須です';
    if (!applicant.nameKana.trim()) errs.nameKana = 'フリガナは必須です';
    if (!applicant.birthdate) errs.birthdate = '生年月日は必須です';
    if (!applicant.address.trim()) errs.address = '住所は必須です';
    if (!applicant.phone.trim()) errs.phone = '電話番号は必須です';
    if (applicant.mynumber && applicant.mynumber.replace(/[^0-9]/g, '').length !== 12) {
      errs.mynumber = '個人番号は12桁で入力してください';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = async () => {
    if (selectedIds.size === 0) {
      setPdfError('出力する寄付先を1件以上選択してください');
      return;
    }
    if (!validate()) return;
    setPdfError('');
    setPdfLoading(true);
    try {
      const selected = donations.filter((d) => selectedIds.has(d.id));
      await generateApplicationPDFs(selected, applicant);
    } catch {
      setPdfError('PDF生成に失敗しました。ブラウザを更新して再試行してください');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-4">ワンストップ特例申請書を出力する</h2>

      {/* 注意事項 */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
        <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ ご注意</p>
        <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
          <li>ワンストップ特例は給与所得者で確定申告不要な方が対象です</li>
          <li>寄付先が6自治体以上の場合は確定申告が必要です</li>
          <li>本アプリの様式は参考様式です。正式な様式・提出先は各自治体にご確認ください</li>
          <li>マイナンバーは郵送前に必ず正確かどうかご確認ください</li>
          <li>申請書は各自治体の受付期限（翌年1月10日必着が多い）までに郵送してください</li>
        </ul>
      </div>

      {/* 申請者情報フォーム */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">申請者情報</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">氏名（漢字）*</label>
              <input
                type="text"
                placeholder="山田 太郎"
                value={applicant.name}
                onChange={(e) => set('name', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.name ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">氏名（フリガナ）*</label>
              <input
                type="text"
                placeholder="ヤマダ タロウ"
                value={applicant.nameKana}
                onChange={(e) => set('nameKana', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.nameKana ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.nameKana && <p className="text-red-500 text-xs mt-1">{errors.nameKana}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">生年月日 *</label>
            <input
              type="date"
              value={applicant.birthdate}
              onChange={(e) => set('birthdate', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.birthdate ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.birthdate && <p className="text-red-500 text-xs mt-1">{errors.birthdate}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">郵便番号</label>
              <input
                type="text"
                placeholder="1234567"
                maxLength={7}
                value={applicant.postalCode}
                onChange={(e) => set('postalCode', e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">住所 *</label>
              <input
                type="text"
                placeholder="神奈川県横浜市都筑区○○1-2-3"
                value={applicant.address}
                onChange={(e) => set('address', e.target.value)}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.address ? 'border-red-400' : 'border-gray-300'}`}
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">電話番号 *</label>
            <input
              type="tel"
              placeholder="090-1234-5678"
              value={applicant.phone}
              onChange={(e) => set('phone', e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.phone ? 'border-red-400' : 'border-gray-300'}`}
            />
            {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              マイナンバー（個人番号）
              <span className="ml-1 text-orange-500">※ PDFへの印字のみ・保存しません</span>
            </label>
            <div className="relative">
              <input
                type={showMynumber ? 'text' : 'password'}
                placeholder="123456789012"
                maxLength={12}
                value={applicant.mynumber}
                onChange={(e) => set('mynumber', e.target.value.replace(/[^0-9]/g, ''))}
                className={`w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${errors.mynumber ? 'border-red-400' : 'border-gray-300'}`}
              />
              <button
                type="button"
                onClick={() => setShowMynumber((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {showMynumber ? '隠す' : '表示'}
              </button>
            </div>
            {errors.mynumber && <p className="text-red-500 text-xs mt-1">{errors.mynumber}</p>}
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">本人確認書類の種類</label>
            <select
              value={applicant.idType}
              onChange={(e) => set('idType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 寄付先の選択 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-700">出力する寄付先を選択</h3>
          {donations.length > 0 && (
            <button onClick={selectAll} className="text-xs text-orange-500 hover:text-orange-600">
              {selectedIds.size === donations.length ? '全件解除' : '全件選択'}
            </button>
          )}
        </div>
        {donations.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            「寄付履歴管理」タブで寄付を登録してください
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {donations.map((d) => (
              <label key={d.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.id)}
                  onChange={() => toggleSelect(d.id)}
                  className="w-4 h-4 rounded accent-orange-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{d.municipality}</p>
                  <p className="text-xs text-gray-400">{d.date} · {d.giftName || '返礼品未入力'}</p>
                </div>
                <span className="text-sm font-medium text-orange-600">¥{d.amount.toLocaleString()}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {pdfError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-700">
          {pdfError}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={pdfLoading || selectedIds.size === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        {pdfLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            PDF生成中…
          </>
        ) : (
          <>
            📄 申請書PDFを出力
            {selectedIds.size > 1 && '（ZIPでダウンロード）'}
          </>
        )}
      </button>
    </div>
  );
}
