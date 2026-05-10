'use client';
import { Item, Language } from '@/lib/types';
import { MapPin, Trash2, Clock, Sparkles, Smartphone, Key, Car, Home, ShoppingBag, Book, Utensils, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect, useRef } from 'react';

interface ItemCardProps {
  item: Item;
  onDelete: (id: string) => void;
  language: Language;
}

export function ItemCard({ item, onDelete, language }: ItemCardProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // eslint-disable-next-line react-hooks/purity
  const isRecent = Date.now() - item.timestamp < 3600000; // Last 1 hour

  const toTitleCase = (str: string) => {
    return str.replace(
      /\w\S*/g,
      (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('gadget') || cat.includes('smartphone') || cat.includes('hp')) return <Smartphone className="w-3 h-3" />;
    if (cat.includes('key') || cat.includes('kunci')) return <Key className="w-3 h-3" />;
    if (cat.includes('car') || cat.includes('motor') || cat.includes('kendaraan')) return <Car className="w-3 h-3" />;
    if (cat.includes('home') || cat.includes('rumah')) return <Home className="w-3 h-3" />;
    if (cat.includes('bag') || cat.includes('tas') || cat.includes('belanja')) return <ShoppingBag className="w-3 h-3" />;
    if (cat.includes('book') || cat.includes('buku')) return <Book className="w-3 h-3" />;
    if (cat.includes('food') || cat.includes('makanan') || cat.includes('utensils')) return <Utensils className="w-3 h-3" />;
    return <Package className="w-3 h-3" />;
  };

  const getLocalizedCategory = (category: string) => {
    if (!category) return language === 'en' ? 'Other' : (language === 'id' ? 'Lainnya' : 'Lain-lain');
    const cat = category.toLowerCase();
    
    if (cat.includes('gadget') || cat.includes('smartphone') || cat.includes('hp')) 
         return language === 'en' ? 'Gadget' : (language === 'id' ? 'Gadget' : 'Gadget');
    if (cat.includes('key') || cat.includes('kunci')) 
         return language === 'en' ? 'Key' : (language === 'id' ? 'Kunci' : 'Konci');
    if (cat.includes('car') || cat.includes('motor') || cat.includes('kendaraan')) 
         return language === 'en' ? 'Vehicle' : (language === 'id' ? 'Kendaraan' : 'Kandaraan');
    if (cat.includes('home') || cat.includes('rumah')) 
         return language === 'en' ? 'Home' : (language === 'id' ? 'Rumah' : 'Imah');
    if (cat.includes('bag') || cat.includes('tas') || cat.includes('belanja')) 
         return language === 'en' ? 'Bag' : (language === 'id' ? 'Tas' : 'Tas');
    if (cat.includes('book') || cat.includes('buku')) 
         return language === 'en' ? 'Book' : (language === 'id' ? 'Buku' : 'Buku');
    if (cat.includes('food') || cat.includes('makanan') || cat.includes('utensils')) 
         return language === 'en' ? 'Food' : (language === 'id' ? 'Makanan' : 'Kadaharan');

    return toTitleCase(category);
  }

  const getRelativeTime = (timestamp: number) => {
    // eslint-disable-next-line react-hooks/purity
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return language === 'en' ? `${days}d ago` : (language === 'id' ? `${days} hari lalu` : `${days} dinten ka tukang`);
    if (hours > 0) return language === 'en' ? `${hours}h ago` : (language === 'id' ? `${hours} jam lalu` : `${hours} jam ka tukang`);
    if (minutes > 0) return language === 'en' ? `${minutes}m ago` : (language === 'id' ? `${minutes} menit lalu` : `${minutes} mnt ka tukang`);
    return language === 'en' ? 'Just now' : (language === 'id' ? 'Baru saja' : 'Nembé pisan');
  };

  const labels = {
    su: { delete: 'Hapus' },
    id: { delete: 'Hapus' },
    en: { delete: 'Delete' }
  }[language];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative backdrop-blur-md bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-2 hover:bg-white/10 transition-all duration-300"
      id={`item-${item.id}`}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider w-fit">
              {getCategoryIcon(item.category)}
              {getLocalizedCategory(item.category)}
            </span>
            {isRecent && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-400/20 text-blue-400 text-[9px] font-black uppercase tracking-widest animate-pulse border border-blue-400/20 w-fit">
                <Sparkles className="w-2.5 h-2.5" />
                {language === 'en' ? 'New' : (language === 'id' ? 'Baru' : 'Anyar')}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-100 tracking-tight">{toTitleCase(item.name)}</h3>
        </div>
        <button
          onClick={() => {
            if (isConfirming) {
              onDelete(item.id);
            } else {
              setIsConfirming(true);
              if (timeoutRef.current) clearTimeout(timeoutRef.current);
              timeoutRef.current = setTimeout(() => setIsConfirming(false), 3000);
            }
          }}
          className={`shrink-0 transition-all rounded-lg ${isConfirming ? 'bg-red-400 text-slate-900 opacity-100 font-bold text-[9px] px-2 py-1 flex items-center justify-center gap-1 uppercase tracking-widest' : 'opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10'}`}
          title={labels.delete}
        >
          {isConfirming ? (language === 'en' ? 'Sure?' : (language === 'id' ? 'Yakin?' : 'Leres?')) : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      <div className="flex items-center gap-1.5 text-emerald-400/90 bg-emerald-400/5 p-1.5 px-2 rounded-lg border border-emerald-400/10">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="font-semibold text-xs">{item.location}</span>
      </div>

      <div className="flex items-center justify-between text-slate-500 text-[9px] mt-1 border-t border-white/5 pt-2 font-bold uppercase tracking-widest">
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          <span>{getRelativeTime(item.timestamp)}</span>
        </div>
        <span className="opacity-40">#{item.id.slice(0,4)}</span>
      </div>
    </motion.div>
  );
}

interface ItemListProps {
  items: Item[];
  onDelete: (id: string) => void;
  language: Language;
}

export function ItemList({ items, onDelete, language }: ItemListProps) {
  const emptyMessage = {
    su: "Teu acan aya barang nu dicatet, Kang.",
    id: "Belum ada barang yang dicatat nih, Kak.",
    en: "No items stored yet."
  }[language];

  if (items.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
        <p className="text-slate-500 italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onDelete={onDelete} language={language} />
      ))}
    </div>
  );
}
