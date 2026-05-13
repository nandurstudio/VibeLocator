'use client';
import React, { RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Package, ChevronDown, Trash2, X } from 'lucide-react';
import { Language, Item } from '@/lib/types';
import { ItemList } from '@/components/ItemList';

import { useVilo } from '@/context/ViloContext';

interface InventoryPanelProps {
  itemScrollRef: React.RefObject<HTMLDivElement | null>;
  handleItemScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  itemScrollProgress: number;
  itemScrollState: { top: boolean; bottom: boolean };
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({
  itemScrollRef,
  handleItemScroll,
  itemScrollProgress,
  itemScrollState
}) => {
  const {
    items, filteredItems, deleteItem, clearItems,
    language, uiStrings,
    searchQuery, setSearchQuery,
    isDesktop
  } = useVilo();

  const [confirmClearAll, setConfirmClearAll] = React.useState(false);
  const clearAllTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const categoryRef = React.useRef<HTMLDivElement>(null);
  const [isItemsExpanded, setIsItemsExpanded] = React.useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (clearAllTimeoutRef.current) clearTimeout(clearAllTimeoutRef.current);
    };
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    if (isCategoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryDropdownOpen]);

  React.useEffect(() => {
    if (isCategoryDropdownOpen) {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsCategoryDropdownOpen(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isCategoryDropdownOpen]);

  const handleClearAllClick = () => {
    if (confirmClearAll) {
      clearItems();
      setConfirmClearAll(false);
    } else {
      setConfirmClearAll(true);
      if (clearAllTimeoutRef.current) clearTimeout(clearAllTimeoutRef.current);
      clearAllTimeoutRef.current = setTimeout(() => setConfirmClearAll(false), 3000);
    }
  };

  return (
    <div className="md:col-span-7 w-full mt-2 md:mt-0 md:pr-6 md:order-1 transition-all duration-300 md:h-full md:flex md:flex-col md:overflow-hidden min-h-0 gap-2">
      <div className="flex flex-col gap-2 md:flex-1 min-h-0">
        {/* Search Input Container */}
        <AnimatePresence>
          {(isItemsExpanded || isDesktop) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full md:flex md:h-auto md:opacity-100 overflow-hidden"
            >
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder={uiStrings.placeholder}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-2 pl-12 pr-4 focus:outline-none focus:border-emerald-400/50 transition-all text-slate-200 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  id="search-input"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items Header */}
        <div className="flex items-center justify-between px-1 shrink-0">
          <h3
            className="text-slate-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2 cursor-pointer md:cursor-default"
            onClick={() => { if (!isDesktop) setIsItemsExpanded(!isItemsExpanded); }}
          >
            <Package className="w-3 h-3" />
            {uiStrings.listTitle}
            <ChevronDown className={`w-3 h-3 transition-transform duration-300 md:hidden ${isItemsExpanded ? 'rotate-180' : ''}`} />
          </h3>

          {/* Clear All Button */}
          {items.length > 0 && (
            <button
              onClick={handleClearAllClick}
              className={`text-[10px] font-bold uppercase tracking-tighter transition-all flex items-center gap-1 ml-auto ${confirmClearAll ? 'text-slate-900 bg-red-400 px-3 py-1.5 rounded-lg border-2 border-red-400' : 'text-slate-600 hover:text-red-400'}`}
            >
              {confirmClearAll ? (language === 'en' ? 'Sure?' : (language === 'id' ? 'Yakin?' : 'Leres?')) : (
                <>
                  <Trash2 className="w-3 h-3" />
                  {uiStrings.clearItems}
                </>
              )}
            </button>
          )}
        </div>

        <AnimatePresence>
          {(isItemsExpanded || isDesktop) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-col gap-2 md:flex md:h-full md:opacity-100 overflow-hidden md:flex-1 min-h-0"
            >
              {/* Category Filters */}
              {items.length > 0 && (
                <div ref={categoryRef} className="flex items-center gap-2 px-1 relative">
                  <div className="glass rounded-2xl p-1 flex items-center gap-1 flex-1 md:flex-none custom-scrollbar overflow-x-auto min-w-0">
                    <Package className="w-4 h-4 ml-2 mr-1 text-slate-400 shrink-0" />
                    <button
                      onClick={() => setSearchQuery('')}
                      className={`px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all shrink-0 ${!searchQuery ? 'bg-emerald-400 text-slate-900' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {uiStrings.allBtn}
                    </button>
                    
                    {searchQuery && Array.from(new Set(items.map(i => i.category))).includes(searchQuery) && (
                      <div className="flex items-center gap-1 bg-emerald-400/10 px-2.5 py-1.5 rounded-xl border border-emerald-400/20 shrink-0">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{searchQuery}</span>
                        <button 
                          onClick={() => setSearchQuery('')}
                          className="hover:bg-emerald-400/20 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-2.5 h-2.5 text-emerald-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="glass p-2 sm:p-2.5 rounded-2xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/5 transition-all shrink-0 aspect-square flex items-center justify-center"
                    title="Filter Category"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isCategoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        className="absolute top-full right-1 mt-2 w-56 glass p-2 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[60] border border-white/10 backdrop-blur-3xl"
                      >
                        <div className="flex flex-col gap-1 max-h-64 overflow-y-auto custom-scrollbar p-1">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-3 py-2 border-b border-white/5 mb-1">
                            {language === 'en' ? 'Select Category' : (language === 'id' ? 'Pilih Kategori' : 'Pilih Kategori')}
                          </p>
                          {Array.from(new Set(items.map(i => i.category).filter(Boolean))).map(cat => (
                            <button
                              key={cat}
                              onClick={() => {
                                setSearchQuery(cat!);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${searchQuery === cat ? 'bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            >
                              {cat}
                            </button>
                          ))}
                          {Array.from(new Set(items.map(i => i.category).filter(Boolean))).length === 0 && (
                            <p className="text-[10px] text-slate-500 italic px-4 py-3 text-center">No categories yet</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Items List Container */}
              <div className="mt-2 md:mt-0 text-left w-full relative rounded-xl overflow-hidden bg-slate-900/20 backdrop-blur-md flex flex-col h-[65vh] md:flex-1 min-h-[300px] border border-white/5 shadow-xl">
                <div className="absolute top-0 right-0 w-[2px] h-full bg-white/[0.02] z-50 pointer-events-none">
                  <motion.div
                    className="w-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    style={{ height: `${itemScrollProgress}%` }}
                  />
                </div>
                <div
                  className={`absolute top-0 left-0 right-0 h-8 pointer-events-none transition-opacity duration-300 z-20 ${itemScrollState.top ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(rgba(52, 211, 153, 0.08), transparent)', borderTop: '1px solid rgba(52, 211, 153, 0.1)' }}
                />
                <div
                  className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none transition-opacity duration-300 z-20 ${itemScrollState.bottom ? 'opacity-100' : 'opacity-0'}`}
                  style={{ background: 'linear-gradient(to top, rgba(52, 211, 153, 0.08), transparent)', borderBottom: '1px solid rgba(52, 211, 153, 0.1)' }}
                />
                <div
                  ref={itemScrollRef}
                  onScroll={handleItemScroll}
                  className="flex-1 overflow-y-auto p-2 flex flex-col gap-4 custom-scrollbar min-h-0"
                >
                  <ItemList items={filteredItems} onDelete={deleteItem} language={language} searchQuery={searchQuery} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
