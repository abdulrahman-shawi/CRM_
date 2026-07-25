'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SearchableSelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string | number | null;
  onChange: (value: string | number, option?: SearchableSelectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  error?: string;
  className?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder, searchPlaceholder, label, error, className }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value ?? ''));

  useEffect(() => {
    if (selectedOption) setInputValue(selectedOption.label);
  }, [selectedOption]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedOption) setInputValue(selectedOption.label);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    if (selectedOption && e.target.value !== selectedOption.label) {
      onChange('', undefined);
    }
  };

  const handleSelect = (option: SearchableSelectOption) => {
    onChange(option.value, option);
    setInputValue(option.label);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={searchPlaceholder || placeholder || 'اختر...'}
        className={cn(
          "w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500",
          error && "border-red-500 focus:ring-red-500"
        )}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
          {filteredOptions.length === 0 ? (
            <div className="p-3 text-sm text-slate-500 text-center">لا توجد نتائج</div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                className={cn(
                  'w-full px-4 py-2 text-right text-sm hover:bg-slate-100 dark:hover:bg-slate-800',
                  String(value) === String(option.value) && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                )}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
