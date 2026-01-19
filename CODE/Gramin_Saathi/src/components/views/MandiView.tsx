import React, { useState, useEffect } from 'react';
import { Store, Search, MapPin, AlertTriangle, Loader, ChevronLeft, ChevronRight } from 'lucide-react';

const MANDI_API_URL = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
const MANDI_API_KEY = import.meta.env.VITE_MANDI_API_KEY || '579b464db66ec23bdd000001537296c028f644834571355eb1d14653';

export function MandiView({ lang }: { lang: string }) {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState(''); // Search term sent to API
  const [selectedState, setSelectedState] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [states, setStates] = useState<string[]>([]);
  const [commodities, setCommodities] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [allPrices, setAllPrices] = useState<any[]>([]); // All fetched prices for filtering
  const [isLocalData, setIsLocalData] = useState(false); // Track if using local filtered data
  const ITEMS_PER_PAGE = 15;
  const FUZZY_FETCH_LIMIT = 500; // Fetch more for fuzzy search

  // Fuzzy match function - checks if search term is contained (partial match)
  const fuzzyMatch = (text: string, search: string): boolean => {
    if (!text || !search) return false;
    return text.toLowerCase().includes(search.toLowerCase());
  };

  // Fetch mandi prices - API pagination when no search, local filter when searching
  const fetchMandiPrices = async (page = 1, search = activeSearch) => {
    setLoading(true);
    setError(null);
    try {
      if (search) {
        // SEARCH MODE: Fetch more records, apply fuzzy filter locally
        let url = `${MANDI_API_URL}?api-key=${MANDI_API_KEY}&format=json&limit=${FUZZY_FETCH_LIMIT}&offset=0`;
        
        if (selectedState) {
          url += `&filters[state]=${encodeURIComponent(selectedState)}`;
        }
        if (selectedCommodity) {
          url += `&filters[commodity]=${encodeURIComponent(selectedCommodity)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch mandi prices');
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
          // Apply fuzzy search filter locally
          const records = data.records.filter((item: any) => 
            fuzzyMatch(item.commodity, search) ||
            fuzzyMatch(item.market, search) ||
            fuzzyMatch(item.district, search) ||
            fuzzyMatch(item.state, search)
          );
          console.log(`Fuzzy search for "${search}" found ${records.length} matches`);
          
          setAllPrices(records);
          setTotalRecords(records.length);
          setIsLocalData(true);
          
          // Paginate locally
          const startIdx = (page - 1) * ITEMS_PER_PAGE;
          const paginatedRecords = records.slice(startIdx, startIdx + ITEMS_PER_PAGE);
          setPrices(paginatedRecords);
          setLastUpdated(new Date());
        } else {
          setAllPrices([]);
          setPrices([]);
          setTotalRecords(0);
        }
      } else {
        // NO SEARCH: Use API pagination to access ALL records
        const offset = (page - 1) * ITEMS_PER_PAGE;
        let url = `${MANDI_API_URL}?api-key=${MANDI_API_KEY}&format=json&limit=${ITEMS_PER_PAGE}&offset=${offset}`;
        
        if (selectedState) {
          url += `&filters[state]=${encodeURIComponent(selectedState)}`;
        }
        if (selectedCommodity) {
          url += `&filters[commodity]=${encodeURIComponent(selectedCommodity)}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch mandi prices');
        
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
          setPrices(data.records);
          setTotalRecords(data.total || data.count || 30000); // API has ~30k records
          setIsLocalData(false);
          
          // Fetch filter options on first load
          if (page === 1 && states.length === 0) {
            const filterUrl = `${MANDI_API_URL}?api-key=${MANDI_API_KEY}&format=json&limit=500`;
            const filterRes = await fetch(filterUrl);
            const filterData = await filterRes.json();
            if (filterData.records) {
              const uniqueStates = [...new Set(filterData.records.map((r: any) => r.state))].sort();
              const uniqueCommodities = [...new Set(filterData.records.map((r: any) => r.commodity))].sort();
              setStates(uniqueStates as string[]);
              setCommodities(uniqueCommodities as string[]);
            }
          }
          
          setLastUpdated(new Date());
        } else {
          setPrices([]);
          setTotalRecords(0);
        }
      }
    } catch (err) {
      console.error('Mandi API error:', err);
      setError(lang === 'en' ? 'Failed to load market prices. Please try again.' : 'बाजार भाव लोड करने में विफल। कृपया पुनः प्रयास करें।');
    }
    setLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchMandiPrices(1);
  }, [selectedState, selectedCommodity, activeSearch]);

  // Handle page changes - API fetch when no search, local pagination when searching
  useEffect(() => {
    if (isLocalData && allPrices.length > 0) {
      // When searching, paginate locally
      const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedRecords = allPrices.slice(startIdx, startIdx + ITEMS_PER_PAGE);
      setPrices(paginatedRecords);
    } else if (!isLocalData && currentPage > 1) {
      // When not searching, fetch from API for new page
      fetchMandiPrices(currentPage);
    }
  }, [currentPage]);

  // Handle search button click
  const handleSearch = () => {
    setActiveSearch(searchQuery.trim());
    setCurrentPage(1);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Common commodities in Hindi
  const commodityTranslations: Record<string, string> = {
    'Wheat': 'गेहूं',
    'Rice': 'चावल',
    'Paddy': 'धान',
    'Maize': 'मक्का',
    'Potato': 'आलू',
    'Onion': 'प्याज',
    'Tomato': 'टमाटर',
    'Mustard': 'सरसों',
    'Gram': 'चना',
    'Soyabean': 'सोयाबीन',
    'Cotton': 'कपास',
    'Sugarcane': 'गन्ना'
  };

  const translateCommodity = (name: string) => {
    if (lang === 'en') return name;
    return commodityTranslations[name] || name;
  };

  return (
    <div className="w-full md:max-w-4xl md:mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 md:p-6 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Store size={28} />
              {lang === 'en' ? 'Mandi Prices' : 'मंडी भाव'}
            </h2>
            <p className="opacity-90 text-sm">
              {lang === 'en' ? 'Live commodity prices from Indian markets' : 'भारतीय बाजारों से जीवित वस्तु भाव'}
            </p>
          </div>
          <button
            onClick={() => fetchMandiPrices(currentPage)}
            disabled={loading}
            className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
          >
            <Loader size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        {lastUpdated && (
          <p className="text-xs opacity-70 mt-2">
            {lang === 'en' ? 'Last updated:' : 'अंतिम अपडेट:'} {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] p-4 space-y-3">
        {/* Search Input with Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={lang === 'en' ? 'Search crop, district, or market...' : 'फसल, जिला, या मंडी खोजें...'}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-5 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2 shrink-0"
          >
            <Search size={18} />
            {lang === 'en' ? 'Search' : 'खोजें'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="flex-1 min-w-[120px] p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm"
          >
            <option value="">{lang === 'en' ? 'All States' : 'सभी राज्य'}</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          
          <select
            value={selectedCommodity}
            onChange={(e) => setSelectedCommodity(e.target.value)}
            className="flex-1 min-w-[120px] p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm"
          >
            <option value="">{lang === 'en' ? 'All Commodities' : 'सभी वस्तुएं'}</option>
            {commodities.map(c => <option key={c} value={c}>{translateCommodity(c)}</option>)}
          </select>
        </div>

        {/* Price Range */}
        <div className="flex gap-3 items-center">
          <span className="text-sm text-[var(--text-muted)] shrink-0">{lang === 'en' ? 'Price:' : 'भाव:'}</span>
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={lang === 'en' ? 'Min ₹' : 'न्यूनतम ₹'}
            className="flex-1 min-w-[80px] max-w-[120px] p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm"
          />
          <span className="text-[var(--text-muted)]">-</span>
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={lang === 'en' ? 'Max ₹' : 'अधिकतम ₹'}
            className="flex-1 min-w-[80px] max-w-[120px] p-2.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-main)] text-sm"
          />
          
          {(selectedState || selectedCommodity || activeSearch || minPrice || maxPrice) && (
            <button
              onClick={() => { setSelectedState(''); setSelectedCommodity(''); setSearchQuery(''); setActiveSearch(''); setMinPrice(''); setMaxPrice(''); }}
              className="px-4 py-2.5 rounded-lg bg-red-100 text-red-600 text-sm font-bold hover:bg-red-200 transition-colors shrink-0"
            >
              {lang === 'en' ? 'Clear All' : 'साफ़'}
            </button>
          )}
        </div>
      </div>

      {/* Price Cards */}
      <div className="space-y-3">
        {loading ? (
             <div className="flex justify-center p-12">
               <Loader size={48} className="animate-spin text-[var(--primary)] opacity-20" />
             </div>
        ) : (() => {
          // Apply price range filter locally
          const filteredPrices = prices.filter(item => {
            const price = parseFloat(item.modal_price) || 0;
            if (minPrice && price < parseFloat(minPrice)) return false;
            if (maxPrice && price > parseFloat(maxPrice)) return false;
            return true;
          });
          
          return filteredPrices.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <Store size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{lang === 'en' ? 'No prices found' : 'कोई भाव नहीं मिला'}</p>
            {(minPrice || maxPrice) && <p className="text-sm mt-2">{lang === 'en' ? 'Try adjusting price range' : 'भाव सीमा बदलें'}</p>}
          </div>
        ) : (
          <>
          {/* Results count */}
          <p className="text-sm text-[var(--text-muted)] mb-2">{lang === 'en' ? `Showing ${filteredPrices.length} results` : `${filteredPrices.length} परिणाम`}</p>
          {filteredPrices.map((item, idx) => (
            <div 
              key={idx}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 hover:border-amber-500/50 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-[var(--text-main)] text-lg">
                    {translateCommodity(item.commodity)}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-muted)]">
                    <MapPin size={14} className="text-amber-500" />
                    {item.market}, {item.district}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-[var(--success)]">
                    ₹{item.modal_price}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
                    {lang === 'en' ? 'per quintal' : 'प्रति क्विंटल'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                <span>{item.state}</span>
                <span>{item.arrival_date}</span>
              </div>
            </div>
          ))}
          </>
        );
        })()}
      </div>

      {/* Pagination Controls */}
      {!loading && prices.length > 0 && (
        <div className="flex items-center justify-center gap-3 py-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              currentPage === 1 
                ? 'bg-[var(--bg-glass)] text-[var(--text-muted)] cursor-not-allowed' 
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            <ChevronLeft size={18} />
            {lang === 'en' ? 'Prev' : 'पिछला'}
          </button>
          
          <div className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-[var(--text-main)] font-medium">
            {lang === 'en' 
              ? `Page ${currentPage} of ${totalPages}` 
              : `पेज ${currentPage} / ${totalPages}`
            }
          </div>
          
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
              currentPage >= totalPages 
                ? 'bg-[var(--bg-glass)] text-[var(--text-muted)] cursor-not-allowed' 
                : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {lang === 'en' ? 'Next' : 'अगला'}
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Data Source */}
      <div className="text-center text-xs text-[var(--text-muted)] p-4">
        {lang === 'en' ? 'Data source: ' : 'डेटा स्रोत: '}
        <a 
          href="https://data.gov.in" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-amber-600 hover:underline"
        >
          data.gov.in
        </a>
      </div>
    </div>
  );
}
