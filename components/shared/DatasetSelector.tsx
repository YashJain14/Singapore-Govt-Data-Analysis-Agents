"use client";
import React, { useState, useEffect } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GovtDB } from '@/data';

interface Dataset {
  topic: string;
  startdate: string | null;  // Allow null values
  enddate: string | null;    // Allow null values
  title: string;
  url: string;
  organization: string;
}

interface DatasetSelectorProps {
  onDatasetSelect: (dataset: Dataset) => void;
}

const DatasetSelector: React.FC<DatasetSelectorProps> = ({ onDatasetSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedOrg, setSelectedOrg] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filteredResults, setFilteredResults] = useState<Dataset[]>(GovtDB);


  const topics = [
    'housing',
    'health',
    'social',
    'transport',
    'artsandculture',
    'education',
    'economy',
    'environment'
  ];

  // Get unique organizations
  const organizations = Array.from(new Set(GovtDB.map(item => item.organization)));

  // Helper function to convert date string to Date object
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr) return null;
    const [month, year] = dateStr.toLowerCase().split(' ');
    const monthIndex = new Date(Date.parse(month + " 1, 2000")).getMonth();
    return new Date(parseInt(year), monthIndex);
  };


  useEffect(() => {
    const filtered = GovtDB.filter(item => {
      // Text search
      const matchesText = !searchText || 
        item.title.toLowerCase().includes(searchText.toLowerCase());

      // Topic filter
      const matchesTopic = !selectedTopic || 
        item.topic === selectedTopic;

      // Organization filter
      const matchesOrg = !selectedOrg || 
        item.organization === selectedOrg;

      // Date range filter
      const itemStartDate = parseDate(item.startdate);
      const itemEndDate = parseDate(item.enddate);
      const searchStartDate = startDate ? new Date(startDate) : null;
      const searchEndDate = endDate ? new Date(endDate) : null;

      const matchesDateRange = (
        (!searchStartDate || (itemStartDate && itemStartDate >= searchStartDate)) &&
        (!searchEndDate || (itemEndDate && itemEndDate <= searchEndDate))
      );

      return matchesText && matchesTopic && matchesOrg && matchesDateRange;
    });
    setFilteredResults(filtered);
  }, [searchText, selectedTopic, selectedOrg, startDate, endDate]);

  const handleSelect = (dataset: Dataset) => {
    onDatasetSelect(dataset);
    setIsOpen(false);
    resetFilters();
  };

  const resetFilters = () => {
    setSearchText('');
    setSelectedTopic('');
    setSelectedOrg('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add Dataset
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>Select Dataset</DialogTitle>
          </DialogHeader>
          
          {/* Search Filters Section */}
          <div className="p-6 border-b space-y-4">
            {/* Text Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                maxLength={150}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Topic Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">Topic</label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Topics</option>
                  {topics.map(topic => (
                    <option key={topic} value={topic}>
                      {topic.charAt(0).toUpperCase() + topic.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organization Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">Organization</label>
                <select
                  value={selectedOrg}
                  onChange={(e) => setSelectedOrg(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org} value={org}>{org}</option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="month"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <input
                  type="month"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Reset Filters Button */}
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={resetFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {filteredResults.length > 0 ? (
                filteredResults.map((dataset, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelect(dataset)}
                  >
                    <h3 className="font-medium">{dataset.title}</h3>
                    <div className="mt-2 text-sm text-gray-600 flex flex-wrap gap-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dataset.topic}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {dataset.organization}
                      </span>
                      <span className="text-gray-500">
                        {dataset.startdate} - {dataset.enddate}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No datasets found matching your criteria
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DatasetSelector;