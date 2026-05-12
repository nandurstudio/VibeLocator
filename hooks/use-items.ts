import { useState, useEffect, useCallback } from 'react';
import { Item } from '../lib/types';

export function useItems() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(() => {
      try {
        const saved = localStorage.getItem('vibelocator_items');
        return saved ? JSON.parse(saved) : [];
      } catch {
        // Corrupted data — reset gracefully
        localStorage.removeItem('vibelocator_items');
        return [];
      }
    });
  }, []);

  const saveItem = useCallback((name: string, location: string, category: string = 'Lainnya') => {
    setItems(prev => {
      const safeName = name || '';
      const safeLocation = location || '';
      
      // Prevent exact duplicate
      const isDuplicate = prev.some(
        i => (i.name || '').toLowerCase() === safeName.toLowerCase() && (i.location || '').toLowerCase() === safeLocation.toLowerCase()
      );
      if (isDuplicate) return prev;

      // Cap at 200 items to protect localStorage quota and AI prompt size
      if (prev.length >= 200) return prev;

      const newItem: Item = {
        id: crypto.randomUUID(),
        name: safeName.slice(0, 100),         // Sanitize field lengths
        location: safeLocation.slice(0, 100),
        category: (category || 'Lainnya').slice(0, 50),
        timestamp: Date.now(),
      };
      const updated = [newItem, ...prev];
      localStorage.setItem('vibelocator_items', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateItem = useCallback((id: string, name: string, location: string, category?: string) => {
    setItems(prev => {
      const safeName = name || '';
      const safeLocation = location || '';
      const updated = prev.map(i => 
        i.id === id ? { ...i, name: safeName, location: safeLocation, category: category || i.category, timestamp: Date.now() } : i
      );
      localStorage.setItem('vibelocator_items', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems(prev => {
      const updated = prev.filter(i => i.id !== id);
      localStorage.setItem('vibelocator_items', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearItems = useCallback(() => {
    setItems([]);
    localStorage.removeItem('vibelocator_items');
  }, []);

  const findItem = useCallback((name: string) => {
    const searchName = (name || '').toLowerCase();
    return items.find(i => (i.name || '').toLowerCase().includes(searchName));
  }, [items]);

  const findItems = useCallback((name: string) => {
    const searchName = (name || '').toLowerCase();
    return items.filter(i => (i.name || '').toLowerCase().includes(searchName));
  }, [items]);

  return { items, saveItem, updateItem, deleteItem, clearItems, findItem, findItems };
}
