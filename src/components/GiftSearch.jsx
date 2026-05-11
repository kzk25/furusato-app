import { useState, useMemo } from 'react';
import { SAMPLE_GIFTS, CATEGORIES } from '../data/sampleGifts';

export default function GiftSearch({ remainingBudget }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [budget, setBudget] = useState(remainingBudget || 100000);
  const [keyword, setKeyword] = useState('');
  const [preference, setPreference] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const maxBudget = remainingBudget > 0 ? remainingBudget : 100000;

  const filteredGifts = useMemo(() => {
    return SAMPLE_GIFTS.filter((g) => {
      if (selectedCategories.length > 0 && !selectedCategories.includes(g.category)) return false;
      if (g.price > budget) return false;
      if (keyword && !g.name.includes(keyword) && !g.region.includes(keyword)) return false;
      return true;
    });
  }, [selectedCategories, budget, keyword]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const fetchAISuggestions = async () => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setAiError('AI提案の取得に失敗しました。フィルターでお探しください（APIキーが設定されていません）');
      return;
    }
    if (!preference.trim()) return;
    setAiLoading(true);
    setAiError('');
    setSuggestions([]);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `あなたはふるさと納税の返礼品アドバイザーです。
ユーザーの好みと残り予算から、具体的な返礼品カテゴリと探すポイントを3〜5件提案してください。
必ずJSON形式のみで返してください。形式：
{"suggestions": [{"category": "カテゴリ名", "keyword": "検索キーワード", "reason": "理由（50字以内）", "budget": 予算目安（数値）}]}`,
          messages: [
            {
              role: 'user',
              content: `残り予算: ${maxBudget}円\nユーザーの好み: ${preference}`,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const text = data.content[0].text;
      const parsed = JSON.parse(text);
      setSuggestions(parsed.suggestions || []);
    } catch {
      setAiError('AI提案の取得に失敗しました。フィルターでお探しください');
    } finally {
      setAiLoading(false);
    }
  };

  const applyKeyword = (kw) => {
    setKeyword(kw);
    window.scrollTo({ top: document.getElementById('gift-list')?.offsetTop - 20, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-6">返礼品を探す</h2>

      {/* AI提案 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-5 mb-6">
        <h3 className="text-base font-semibold text-purple-800 mb-1">✨ AIが返礼品を提案</h3>
        <p className="text-xs text-purple-600 mb-3">好みを入力するとAIがおすすめカテゴリを提案します</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="例：家族4人で食べられる海産物、甘いものが好き"
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAISuggestions()}
            className="flex-1 border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
          />
          <button
            onClick={fetchAISuggestions}
            disabled={aiLoading || !preference.trim()}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {aiLoading ? '検索中…' : '提案を見る'}
          </button>
        </div>
        {aiError && <p className="text-red-500 text-xs mt-2">{aiError}</p>}
        {aiLoading && (
          <div className="flex items-center gap-2 mt-3 text-purple-600 text-sm">
            <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            AIが考えています…
          </div>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {suggestions.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-purple-100 p-3 shadow-sm">
                <p className="text-xs text-purple-500 font-medium mb-1">{s.category}</p>
                <p className="text-sm font-semibold text-gray-800 mb-1">{s.keyword}</p>
                <p className="text-xs text-gray-500 mb-2">{s.reason}</p>
                <p className="text-xs text-orange-600 font-medium mb-2">目安：¥{Number(s.budget).toLocaleString()}</p>
                <button
                  onClick={() => applyKeyword(s.keyword)}
                  className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-full transition-colors"
                >
                  このキーワードで検索
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* フィルターパネル */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-base font-semibold text-gray-700 mb-4">絞り込み</h3>

        {/* カテゴリ */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">カテゴリ（複数選択可）</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedCategories.includes(cat)
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 予算スライダー */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-gray-500">予算上限</p>
            <p className="text-sm font-medium text-orange-600">¥{budget.toLocaleString()}</p>
          </div>
          <input
            type="range"
            min="1000"
            max={maxBudget}
            step="1000"
            value={Math.min(budget, maxBudget)}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-orange-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>¥1,000</span>
            <span>¥{maxBudget.toLocaleString()}</span>
          </div>
        </div>

        {/* キーワード */}
        <div>
          <p className="text-xs text-gray-500 mb-2">キーワード</p>
          <input
            type="text"
            placeholder="返礼品名・自治体名で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* 返礼品一覧 */}
      <div id="gift-list">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-700">
            返礼品一覧 ({filteredGifts.length}件)
          </h3>
          {(selectedCategories.length > 0 || keyword) && (
            <button
              onClick={() => { setSelectedCategories([]); setKeyword(''); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              フィルターをリセット
            </button>
          )}
        </div>

        {filteredGifts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
            条件に合う返礼品が見つかりませんでした。フィルターを変更してみてください。
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredGifts.map((gift) => (
              <div key={gift.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{gift.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-orange-500 font-medium mb-0.5">{gift.category}</p>
                    <p className="text-sm font-semibold text-gray-800 leading-tight mb-1">{gift.name}</p>
                    <p className="text-xs text-gray-400 mb-2">{gift.region} · {gift.desc}</p>
                    <p className="text-base font-bold text-orange-600">¥{gift.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
