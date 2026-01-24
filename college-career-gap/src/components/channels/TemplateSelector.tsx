'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { POST_TEMPLATES, PostTemplate } from '@/types/templates';
import { X, FileText, Eye } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: PostTemplate) => void;
  onClose: () => void;
}

export function TemplateSelector({ onSelect, onClose }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<PostTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleSelect = (template: PostTemplate) => {
    console.log('[TemplateSelector] Template selected:', template.id);
    setSelectedTemplate(template);
    setShowPreview(false); // close preview when selecting new template
  };

  const handlePreview = (template: PostTemplate) => {
    console.log('[TemplateSelector] Previewing template:', template.id);
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      console.log('[TemplateSelector] Confirming template:', selectedTemplate.id);
      onSelect(selectedTemplate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Choose a Post Template</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a template to get started quickly
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Template Grid */}
          <div className={`${showPreview ? 'w-1/2' : 'w-full'} overflow-y-auto p-6 transition-all duration-300`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {POST_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedTemplate?.id === template.id
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : 'hover:border-blue-300'
                  }`}
                  onClick={() => handleSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between space-x-3">
                      <div className="flex items-start space-x-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 mb-1">
                            {template.label}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {template.description}
                          </p>
                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {template.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Preview Button */}
                      {template.template && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(template);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                          title="Preview template"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Preview Panel */}
          {showPreview && selectedTemplate && (
            <div className="w-1/2 border-l border-gray-200 overflow-y-auto bg-gray-50 p-6">
              <div className="sticky top-0 bg-gray-50 pb-4 border-b border-gray-200 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {selectedTemplate.label}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Template Preview
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Template Content Preview */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {selectedTemplate.template || 'Blank template - start from scratch'}
                </pre>
              </div>

              {/* Template Metadata */}
              <div className="mt-4 space-y-3">
                {selectedTemplate.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Auto-Applied Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTemplate.requiresExpiration && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1">
                      Auto-Expiration
                    </h4>
                    <p className="text-xs text-yellow-700">
                      This post will automatically expire in {selectedTemplate.defaultExpirationDays} days 
                      (you can change this after selecting)
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="text-sm font-semibold text-blue-800 mb-1">
                    How to Use
                  </h4>
                  <p className="text-xs text-blue-700">
                    Replace text in [brackets] with your specific information. 
                    Remove any sections you don&#39;t need.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedTemplate ? (
              <span>
                Selected: <strong>{selectedTemplate.label}</strong>
              </span>
            ) : (
              <span>Select a template to continue</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedTemplate}
            >
              Use Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}