import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface KeywordInputProps {
  keywords: string[];
  onChange: (keywords: string[]) => void;
}

// Default keywords
const DEFAULT_KEYWORDS = [
  'IOP',
  'PHP',
  'Partial Hospitalization',
  'Intensive Outpatient'
];

export default function KeywordInput({ keywords, onChange }: KeywordInputProps) {
  const [input, setInput] = useState('');

  // Load default keywords if none are present
  React.useEffect(() => {
    if (keywords.length === 0) {
      onChange(DEFAULT_KEYWORDS);
    }
  }, []);

  const addKeyword = () => {
    if (input.trim() && !keywords.includes(input.trim())) {
      onChange([...keywords, input.trim()]);
      setInput('');
    }
  };

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
          placeholder="Enter a keyword..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={addKeyword}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword, index) => (
          <span
            key={index}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
          >
            {keyword}
            <button
              onClick={() => removeKeyword(index)}
              className="ml-2 text-blue-600 hover:text-blue-800"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}