import React, { useState } from 'react';
import { Download, ChevronDown } from 'lucide-react';

function ExportButton({ onExport, label = 'Export', formats = ['csv', 'xlsx', 'pdf'] }) {
  const [showDropdown, setShowDropdown] = useState(false);

  const formatLabels = {
    csv: 'CSV',
    xlsx: 'Excel',
    pdf: 'PDF'
  };

  return (
    <div className="relative inline-block">
      <div className="flex">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Download className="h-4 w-4 mr-2" />
          {label}
          <ChevronDown className="h-4 w-4 ml-2" />
        </button>
      </div>

      {showDropdown && (
        <div 
          className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
          onMouseLeave={() => setShowDropdown(false)}
        >
          <div className="py-1">
            {formats.map((format) => (
              <button
                key={format}
                onClick={() => {
                  onExport(format);
                  setShowDropdown(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export as {formatLabels[format]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportButton;
