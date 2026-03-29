import React, { useState } from 'react';

interface UseApplyToAllProps<T> {
  items: T[];
  selectedItem: T | null;
  onApply: (selectedItem: T) => void;
  isCustomized: (item: T, selectedItem: T) => boolean;
}

export function useApplyToAll<T>({
  items,
  selectedItem,
  onApply,
  isCustomized,
}: UseApplyToAllProps<T>) {
  const [applyToAll, setApplyToAll] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleApplyToAllChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    if (newValue) {
      if (!selectedItem) return;
      
      const hasCustomized = items.some(
        (item) => item !== selectedItem && isCustomized(item, selectedItem)
      );
      
      if (hasCustomized && items.length > 1) {
        setShowConfirm(true);
      } else {
        confirmApply(true);
      }
    } else {
      setApplyToAll(false);
    }
  };

  const confirmApply = (confirmed: boolean) => {
    if (confirmed && selectedItem) {
      onApply(selectedItem);
      setApplyToAll(true);
    } else {
      setApplyToAll(false);
    }
    setShowConfirm(false);
  };

  return {
    applyToAll,
    setApplyToAll,
    showConfirm,
    setShowConfirm,
    handleApplyToAllChange,
    confirmApply,
  };
}
