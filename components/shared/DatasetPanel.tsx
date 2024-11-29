// components/shared/DatasetPanel.tsx
import React from 'react';
import { Calendar, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { Dataset } from '@/lib/types';

interface DatasetPanelProps {
  selectedDataset: Dataset[];
  maxDatasets: number;
  onRemoveDataset: (dataset: Dataset) => void;
}

const DatasetPanel: React.FC<DatasetPanelProps> = ({ 
  selectedDataset, 
  maxDatasets, 
  onRemoveDataset 
}) => {
  // Helper function to format date string
  const formatDate = (date: string | null): string => {
    if (!date) return 'N/A';
    return date.charAt(0).toUpperCase() + date.slice(1);
  };

  return (
    <div className="w-80 border-l p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Selected Datasets</h3>
        <span className="text-sm text-gray-500">
          {selectedDataset.length}/{maxDatasets}
        </span>
      </div>

      {selectedDataset.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No datasets selected
        </div>
      ) : (
        <div className="space-y-3">
          {selectedDataset.map((dataset, index) => (
            <div
              key={index}
              className="p-3 border rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium">{dataset.title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDataset(dataset)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {formatDate(dataset.startdate)} - {formatDate(dataset.enddate)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {dataset.topic}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {dataset.organization}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DatasetPanel;