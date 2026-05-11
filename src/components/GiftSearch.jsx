import { useState, useEffect, useRef } from 'react';

const CATEGORIES = ['肉・魚', '米・野菜', '果物', 'スイーツ', 'お酒', '日用品', '体験・旅行', 'その他'];

const CATEGORY_KEYWORDS = {
  '肉・魚': '肉 魚介',
  '米・野菜': '米 野菜',
  '果物': '果物 フルーツ',
  'スイーツ': 'スイーツ お菓子',
  'お酒': '酒 ビール 日本酒',
  '日用品': '日用品 洗剤 タオル',
  '体験・旅行': '旅行 体験 宿泊',
  'その他': '',
};

async function searchRakutenFurusato({ appId, accessKey, keyword, categories, maxPrice }) {
  let searchKw = 'ふるさと納税';
  if (keyword) searchKw += ' ' + keyword;
  if (categories.length > 0) {
    const catKw = categories.map((c) => CATEGORY_KEYWORDS[c] || c).join(' ');
    searchKw += ' ' + catKw;
  }

  const params = new URLSearchParams({
    applicationId: appId,
    accessKey,
    keyword: searchKw,
    hits: 20,
    maxPrice: Math.min(maxPrice, 9999999),
    minPrice: 1000,
    sort: '-reviewCount',
    formatVersion: 2,
  });

  const res = await fetch(
    `https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401?${params}`
  );
  if (!res.ok) throw new Error(`Rakuten API error: ${res.status}`);
  const data = await res.json();
  return data.Items || data.items || [];
}

export default function GiftSearch({ remainingBudget }) {
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [budget, setBudget] = useState(remainingBudget || 100000);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [preference, setPreference] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const maxBudget = remainingBudget > 0 ? remainingBudget : 100000;
  const debounceRef = useRef(null);

  const doSearch = async (kw, cats, bgt) => {
    const appId = import.meta.env.VITE_RAKUTEN_APP_ID;
    const accessKey = import.meta.env.VITE_RAKUTEN_ACCESS_KEY;
    if (!appId || !accessKey) {
      setError('楽天APIの認証情報が未設定です。.env に VITE_RAKUTEN_APP_ID と VITE_RAKUTEN_ACCESS_KEY を設定してください。\n取得先: https://webservice.rakuten.co.jp/');
      setResults([]);
      setHasSearched(true);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const items = await searchRakutenFurusato({ appId, accessKey, keyword: kw, categories: cats, maxPrice: bgt });
      setResults(items);
      setHasSearched(true);
    } catch (e) {
      setError('楽天の検索に失敗しました。時間をおいて再試行してください。');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search when filters change
  useEffect(() => {
    if (!hasSearched) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(keyword, selectedCategories, budget);
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [keyword, selectedCategories, budget]);

  const handleSearch = () => doSearch(keyword, selectedCategories, budget);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const fetchAISuggestions = async () => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setAiError('APIキーが設定されていません（VITE_ANTHROPIC_API_KEY）');
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
ユーザーの好みと残り予算から、楽天ふるさと納税で検索するための具体的なキーワードを3〜5件提案してください。
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
    document.getElementById('gift-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-1">返礼品を探す</h2>
      <p className="text-xs text-gray-400 mb-6">楽天ふるさと納税から検索します</p>

      {/* AI提案 */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100 p-5 mb-6">
        <h3 className="text-base font-semibold text-purple-800 mb-1">✨ AIが返礼品を提案</h3>
        <p className="text-xs text-purple-600 mb-3">好みを入力するとAIが楽天検索キーワードを提案します</p>
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
            {aiLoading ? '考え中…' : '提案を見る'}
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

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="返礼品名・自治体名・食材名で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap"
          >
            {loading ? '検索中…' : '検索'}
          </button>
        </div>
      </div>

      {/* 検索結果 */}
      <div id="gift-list">
        {!hasSearched && !loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <p className="text-4xl mb-3">🎁</p>
            <p className="text-gray-500 text-sm">キーワードやカテゴリを選んで検索してください</p>
            <p className="text-gray-400 text-xs mt-1">楽天ふるさと納税の商品が表示されます</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
            <div className="w-8 h-8 border-3 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{borderWidth: '3px'}} />
            <p className="text-gray-500 text-sm">楽天ふるさと納税を検索中…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-700 whitespace-pre-line">
            {error}
          </div>
        )}

        {!loading && hasSearched && !error && (
          <>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-700">
                検索結果 ({results.length}件)
                <span className="text-xs text-gray-400 font-normal ml-2">powered by 楽天ふるさと納税</span>
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

            {results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
                条件に合う返礼品が見つかりませんでした。キーワードを変えて試してください。
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.map((item, idx) => {
                  const it = item.Item || item;
                  const imgUrl = it.mediumImageUrls?.[0]?.imageUrl || it.smallImageUrls?.[0]?.imageUrl;
                  return (
                    <a
                      key={idx}
                      href={it.itemUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow flex gap-3 items-start"
                    >
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={it.itemName}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0 bg-gray-100"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-2xl">🎁</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-orange-500 font-medium mb-0.5 truncate">{it.shopName}</p>
                        <p className="text-sm font-semibold text-gray-800 leading-tight mb-2 line-clamp-2">{it.itemName}</p>
                        <p className="text-base font-bold text-orange-600">¥{Number(it.itemPrice).toLocaleString()}</p>
                        <p className="text-xs text-indigo-500 mt-1">楽天で見る →</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
