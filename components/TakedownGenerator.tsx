import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import { getDMCATemplate, getGDPRTemplate, getGenericNTD, TakedownData } from '../services/takedownTemplates';
import platformData from '../data/platformContacts.json';

interface TakedownGeneratorProps {
  contentUrl: string;
  platform: string;
  detectedAt: string;
  thumbnailUrl?: string;
  onClose: () => void;
}

type TemplateType = 'dmca' | 'gdpr' | 'generic';

const TakedownGenerator: React.FC<TakedownGeneratorProps> = ({
  contentUrl,
  platform,
  detectedAt,
  thumbnailUrl,
  onClose
}) => {
  const [formData, setFormData] = useState<TakedownData>({
    victimName: '',
    victimEmail: '',
    contentUrl,
    platform,
    detectedAt,
    contentDescription: 'Intimate imagery shared without consent',
    additionalInfo: ''
  });
  
  const [templateType, setTemplateType] = useState<TemplateType>('generic');
  const [generatedNotice, setGeneratedNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<any>(null);

  // Find platform-specific info
  useEffect(() => {
    const normalizedPlatform = platform.toLowerCase();
    const found = platformData.platforms.find(p => 
      normalizedPlatform.includes(p.id) || p.id === 'default'
    );
    setPlatformInfo(found || platformData.platforms.find(p => p.id === 'default'));
  }, [platform]);

  // Generate notice when form data or template changes
  useEffect(() => {
    let notice = '';
    switch (templateType) {
      case 'dmca':
        notice = getDMCATemplate(formData);
        break;
      case 'gdpr':
        notice = getGDPRTemplate(formData);
        break;
      default:
        notice = getGenericNTD(formData);
    }
    setGeneratedNotice(notice);
  }, [formData, templateType]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedNotice);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedNotice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `takedown_notice_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Icons.Legal className="w-7 h-7 text-red-400" />
              Takedown Generator
            </h2>
            <p className="text-slate-400 mt-1">Generate a legal notice to request content removal</p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close takedown generator"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Icons.Close className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Your Information</h3>
              
              <div>
                <label className="block text-sm text-slate-400 mb-1">Your Name *</label>
                <input
                  type="text"
                  name="victimName"
                  value={formData.victimName}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                  placeholder="Full legal name"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Your Email *</label>
                <input
                  type="email"
                  name="victimEmail"
                  value={formData.victimEmail}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Content Description</label>
                <textarea
                  name="contentDescription"
                  value={formData.contentDescription}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none resize-none"
                  placeholder="Brief description of the content"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Additional Information (Optional)</label>
                <textarea
                  name="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-red-500 focus:outline-none resize-none"
                  placeholder="Any additional context..."
                />
              </div>

              {/* Template Selector */}
              <div>
                <label className="block text-sm text-slate-400 mb-2">Notice Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'generic', label: 'Generic NTD', desc: 'Universal' },
                    { id: 'dmca', label: 'DMCA', desc: 'USA' },
                    { id: 'gdpr', label: 'GDPR', desc: 'Europe' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTemplateType(t.id as TemplateType)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        templateType === t.id
                          ? 'border-red-500 bg-red-500/10 text-white'
                          : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-xs text-slate-500">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Info */}
              {platformInfo && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <Icons.Info className="w-4 h-4 text-blue-400" />
                    {platformInfo.name} Submission Info
                  </h4>
                  <p className="text-sm text-slate-400 mb-3">{platformInfo.instructions}</p>
                  <div className="flex flex-wrap gap-2">
                    {platformInfo.formUrl && (
                      <a
                        href={platformInfo.formUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors"
                      >
                        <Icons.Link className="w-3 h-3" />
                        Report Form
                      </a>
                    )}
                    {platformInfo.email && (
                      <a
                        href={`mailto:${platformInfo.email}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-sm text-white transition-colors"
                      >
                        <Icons.Email className="w-3 h-3" />
                        {platformInfo.email}
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">Expected response: {platformInfo.responseTime}</p>
                </div>
              )}
            </div>

            {/* Preview Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Generated Notice</h3>
              <div className="bg-slate-950 rounded-lg border border-slate-700 p-4 h-96 overflow-y-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono">
                  {generatedNotice || 'Fill in your information to generate the notice...'}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  disabled={!formData.victimName || !formData.victimEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  <Icons.Copy className="w-5 h-5" />
                  {copied ? 'Copied!' : 'Copy to Clipboard'}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!formData.victimName || !formData.victimEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                >
                  <Icons.Download className="w-5 h-5" />
                  Download TXT
                </button>
              </div>
            </div>
          </div>

          {/* Resources Section */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3">Additional Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {platformData.resources.map((resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors"
                >
                  <div className="font-medium text-white">{resource.name}</div>
                  <div className="text-xs text-slate-400 mt-1">{resource.description}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakedownGenerator;
