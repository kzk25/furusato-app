import { useState, useEffect } from 'react';
import DeductionCalc from './components/DeductionCalc';
import DonationHistory from './components/DonationHistory';
import GiftSearch from './components/GiftSearch';
import ApplicationPDF from './components/ApplicationPDF';

const TABS = [
  { id: 'deduction', label: '控除上限計算', icon: '🧮' },
  { id: 'history', label: '寄付履歴管理', icon: '📋' },
  { id: 'search', label: '返礼品を探す', icon: '🎁' },
  { id: 'pdf', label: '申請書出力', icon: '📄' },
];

const DONATIONS_KEY = 'furusato_donations';

export default function App() {
  const [activeTab, setActiveTab] = useState('deduction');
  const [deductionLimit, setDeductionLimit] = useState(0);
  const [donations, setDonations] = useState(() => {
    try {
      const saved = localStorage.getItem(DONATIONS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(DONATIONS_KEY, JSON.stringify(donations));
  }, [donations]);

  const totalDonated = donations.reduce((s, d) => s + d.amount, 0);
  const remaining = Math.max(0, deductionLimit - totalDonated);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🏯</span>
              <h1 className="text-base font-bold text-gray-800">ふるさと納税管理</h1>
            </div>
            {deductionLimit > 0 && (
              <div className="text-right hidden sm:block">
                <p className="text-xs text-gray-400">残り使える額</p>
                <p className={`text-sm font-bold ${remaining <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                  ¥{remaining.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4">
          <nav className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-3.5 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* メインコンテンツ */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {activeTab === 'deduction' && (
          <DeductionCalc onLimitChange={setDeductionLimit} />
        )}
        {activeTab === 'history' && (
          <DonationHistory
            deductionLimit={deductionLimit}
            donations={donations}
            setDonations={setDonations}
          />
        )}
        {activeTab === 'search' && (
          <GiftSearch remainingBudget={remaining} />
        )}
        {activeTab === 'pdf' && (
          <ApplicationPDF donations={donations} />
        )}
      </main>
    </div>
  );
}
