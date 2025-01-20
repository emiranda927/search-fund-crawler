import React from 'react';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  icon?: React.ReactNode;
}

export default function ToggleSwitch({ checked, onChange, label, icon }: ToggleProps) {
  return (
    <label className="relative inline-flex items-center cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
      </div>
      <div className="flex items-center gap-2 ml-3 text-gray-700 select-none">
        {icon && <span className="text-gray-500">{icon}</span>}
        <span className="font-medium">{label}</span>
      </div>
    </label>
  );
}