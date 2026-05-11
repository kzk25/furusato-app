import { useState, useEffect } from 'react';
import { calcFurusatoLimit } from '../utils/calcDeduction';

const STORAGE_KEY = 'furusato_income_config';

const defaultConfig = {
  income: '',
  married: false,
  dependents: 0,
  hasDisability: false,
  isSingleParent: false,
  medicalDeduction: '',
};

export default function DeductionCalc({ onLimitChange }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });
  const [result, setResult] = useState(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    if (config.income) {
      const r = calcFurusatoLimit({
        income: Number(config.income) || 0,
        married: config.married,
        dependents: Number(config.dependents) || 0,
        hasDisability: config.hasDisability,
        isSingleParent: config.isSingleParent,
        medicalDeduction: Number(config.medicalDeduction) || 0,
      });
      setResult(r);
      onLimitChange(r.deductionLimit);
    } else {
      setResult(null);
      onLimitChange(0);
    }
  }, [config]);

  const set = (key, value) => setConfig((c) => ({ ...c, [key]: value }));

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-6">控除上限額を計算する</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="space-y-5">
          {/* 給与収入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              給与収入（年収・税込）
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="10000"
                placeholder="例：5000000"
                value={config.income}
                onChange={(e) => set('income', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">円</span>
            </div>
          </div>

          {/* チェックボックス群 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: 'married', label: '配偶者がいる（配偶者控除あり）' },
              { key: 'hasDisability', label: '障害者控除がある' },
              { key: 'isSingleParent', label: 'ひとり親控除がある' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="w-4 h-4 rounded accent-orange-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>

          {/* 扶養家族人数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              扶養親族の人数（16歳以上）
            </label>
            <select
              value={config.dependents}
              onChange={(e) => set('dependents', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n}人</option>
              ))}
            </select>
          </div>

          {/* 医療費控除 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              医療費控除額（10万円を超えた分のみ）
              <span className="ml-1 text-xs text-gray-400">任意</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={config.medicalDeduction}
                onChange={(e) => set('medicalDeduction', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">円</span>
            </div>
          </div>
        </div>
      </div>

      {/* 計算結果 */}
      {result ? (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200 p-6 mb-4">
          <p className="text-sm text-gray-600 mb-2 text-center">控除上限の目安（自己負担2,000円）</p>
          <p className="text-5xl font-bold text-center text-orange-600 mb-4">
            ¥{result.deductionLimit.toLocaleString()}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 border-t border-orange-200 pt-4">
            <div>給与所得: ¥{result.details.salaryIncome.toLocaleString()}</div>
            <div>課税所得: ¥{result.details.taxableIncome.toLocaleString()}</div>
            <div>住民税所得割: ¥{result.details.residenceTax.toLocaleString()}</div>
            <div>特例控除上限: ¥{result.details.specialDeductionLimit.toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-4 text-center text-gray-400">
          給与収入を入力すると控除上限額が表示されます
        </div>
      )}

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        ※ この計算結果はあくまでも目安です。正確な控除上限額は税理士や各ふるさと納税サービスでご確認ください。
      </p>
    </div>
  );
}
