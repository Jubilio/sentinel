import React, { useState } from 'react';
import { Icons } from '../constants';
import resourcesData from '../data/resourcesData.json';

type TabType = 'organizations' | 'legal' | 'chat';

const ResourceCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('organizations');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const getServiceBadge = (service: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      hash_protection: { label: 'Hash Protection', color: 'bg-purple-900/30 text-purple-400' },
      prevention: { label: 'Prevention', color: 'bg-blue-900/30 text-blue-400' },
      crisis_support: { label: 'Crisis Support', color: 'bg-red-900/30 text-red-400' },
      legal_referral: { label: 'Legal Referral', color: 'bg-yellow-900/30 text-yellow-400' },
      removal: { label: 'Removal Help', color: 'bg-green-900/30 text-green-400' },
      minor_protection: { label: 'Minor Protection', color: 'bg-pink-900/30 text-pink-400' },
      reporting: { label: 'Reporting', color: 'bg-orange-900/30 text-orange-400' },
      counseling: { label: 'Counseling', color: 'bg-cyan-900/30 text-cyan-400' },
    };
    return badges[service] || { label: service, color: 'bg-slate-700 text-slate-300' };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Icons.Shield className="w-7 h-7 text-brand-400" />
          Resource Center
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Support organizations, legal information, and crisis help lines
        </p>
      </header>

      {/* Emergency Banner */}
      <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 flex items-center gap-4">
        <div className="bg-red-600 rounded-full p-3">
          <Icons.Alert className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-red-300 font-semibold">Need Immediate Help?</h3>
          <p className="text-red-400/80 text-sm">If you're in crisis or immediate danger, contact emergency services (190 BR / 911 US / 999 UK)</p>
        </div>
        <a 
          href="tel:190" 
          className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Call Now
        </a>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {[
          { id: 'organizations' as TabType, label: 'Support Organizations', icon: <Icons.Shield className="w-4 h-4" /> },
          { id: 'legal' as TabType, label: 'Legal Guides', icon: <Icons.FileText className="w-4 h-4" /> },
          { id: 'chat' as TabType, label: 'Crisis Chat', icon: <Icons.Activity className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-brand-500 bg-slate-800/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resourcesData.organizations.map((org, i) => (
            <a
              key={i}
              href={org.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-slate-850 rounded-xl border border-slate-700 p-5 hover:border-brand-700 transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-white group-hover:text-brand-400 transition-colors">
                  {org.name}
                </h3>
                <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-400 uppercase">
                  {org.region}
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">{org.description}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {org.services.map((service, j) => {
                  const badge = getServiceBadge(service);
                  return (
                    <span key={j} className={`text-xs px-2 py-1 rounded ${badge.color}`}>
                      {badge.label}
                    </span>
                  );
                })}
              </div>
              {(org as any).phone && (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Icons.Activity className="w-4 h-4" />
                  <span>{(org as any).phone}</span>
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {/* Legal Guides Tab */}
      {activeTab === 'legal' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setSelectedCountry(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedCountry ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Countries
            </button>
            {resourcesData.legalGuides.map((guide, i) => (
              <button
                key={i}
                onClick={() => setSelectedCountry(guide.code)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedCountry === guide.code ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>{guide.flag}</span>
                <span>{guide.country}</span>
              </button>
            ))}
          </div>

          {resourcesData.legalGuides
            .filter(guide => !selectedCountry || guide.code === selectedCountry)
            .map((guide, i) => (
              <div key={i} className="bg-slate-850 rounded-xl border border-slate-700 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{guide.flag}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{guide.country}</h3>
                    <p className="text-sm text-slate-500">Report to: {guide.reportingAuthority}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {guide.laws.map((law, j) => (
                    <div key={j} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-white">{law.name}</h4>
                        <a
                          href={law.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-400 hover:text-brand-300"
                        >
                          View Law →
                        </a>
                      </div>
                      <p className="text-sm text-slate-400 mt-2">{law.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Crisis Chat Tab */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="bg-slate-850 rounded-xl border border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">Anonymous Support</h3>
            <p className="text-sm text-slate-400">
              These services provide free, confidential emotional support. They are staffed by trained volunteers who understand image-based abuse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {resourcesData.chatServices.map((service, i) => (
              <div key={i} className="bg-slate-850 rounded-xl border border-slate-700 p-5">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-white">{service.name}</h3>
                  <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded">
                    {service.available}
                  </span>
                </div>
                <p className="text-sm text-slate-400 mb-4">{service.description}</p>
                <div className="space-y-2">
                  <a
                    href={`tel:${service.phone.replace(/\D/g, '')}`}
                    className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
                  >
                    <Icons.Activity className="w-4 h-4" />
                    <span className="font-medium">{service.phone}</span>
                  </a>
                  <a
                    href={service.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-brand-400 hover:text-brand-300 transition-colors text-sm"
                  >
                    <Icons.Link className="w-4 h-4" />
                    <span>Visit Website</span>
                  </a>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <span className="text-xs text-slate-500 uppercase">{service.region}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Embed Help Chat Placeholder */}
          <div className="bg-slate-850 rounded-xl border border-dashed border-slate-600 p-8 text-center">
            <Icons.Activity className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-400 mb-2">Live Chat Integration</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Coming soon: Direct anonymous chat with trained volunteers. In the meantime, use the helplines above.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 mt-8">
        <p className="text-xs text-slate-500 text-center">
          <strong className="text-slate-400">Disclaimer:</strong> This information is provided for educational purposes. 
          For specific legal advice, consult a qualified attorney in your jurisdiction. 
          If you are in immediate danger, contact emergency services.
        </p>
      </div>
    </div>
  );
};

export default ResourceCenter;
