import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Settings, Save } from 'lucide-react';
import { settingsService } from '../api/settings.service';
import { SettingsMap, SettingUpdatePayload } from '../types/settings.types';

interface SettingsManagementProps {
  token: string | null;
}

type NumberResetPeriod = 'yearly' | 'never';

export default function SettingsManagement({ token }: SettingsManagementProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [settings, setSettings] = useState<SettingsMap>({});

  const initialState = useMemo(() => ({
    'invoice.prefix': 'FACT',
    'quote.prefix': 'DEV',
    'creditnote.prefix': 'AV',
    'document.number.reset': 'yearly',
    'finance.default.tax.rate': 20,
    'finance.currency.symbol': 'MAD',
    'finance.decimal.places': 2,
    'display.items.per.page': 10
  }) as SettingsMap, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await settingsService.getAll();
      setSettings({ ...initialState, ...data });
    } catch (e: any) {
      setError(e.message || t('settings.messages.loadFailed'));
      toast.error(e.message || t('settings.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [initialState, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = useCallback((key: string, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const payload: SettingUpdatePayload[] = [
        { key: 'invoice.prefix', value: String(settings['invoice.prefix'] || '').trim() },
        { key: 'quote.prefix', value: String(settings['quote.prefix'] || '').trim() },
        { key: 'creditnote.prefix', value: String(settings['creditnote.prefix'] || '').trim() },
        { key: 'document.number.reset', value: (settings['document.number.reset'] as string) || 'yearly' },
        { key: 'finance.default.tax.rate', value: Number(settings['finance.default.tax.rate'] || 20) },
        { key: 'finance.currency.symbol', value: String(settings['finance.currency.symbol'] || 'MAD').trim() },
        { key: 'finance.decimal.places', value: Number(settings['finance.decimal.places'] || 2) },
        { key: 'display.items.per.page', value: Number(settings['display.items.per.page'] || 10) }
      ];
      const updated = await settingsService.updateMany(payload);
      setSettings(prev => ({ ...prev, ...updated }));
      toast.success(t('settings.messages.updateSuccess'));
    } catch (e: any) {
      toast.error(t('settings.messages.updateFailed') || e.message);
    } finally {
      setSaving(false);
    }
  }, [settings, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-gray-500 mr-3" />
              <div>
                <h2 className="text-xl font-bold text-gray-800">{t('settings.title')}</h2>
                <p className="text-sm text-gray-600 mt-1">{t('settings.subtitle')}</p>
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('common.saving')}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common.saveChanges')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form className="space-y-8">
            {/* Document Prefixes Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.documentPrefixes')}</h3>
              <p className="text-sm text-gray-600 mb-6">{t('settings.documentPrefixesDesc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.invoicePrefix')}</label>
                  <input
                    type="text"
                    value={String(settings['invoice.prefix'] ?? '')}
                    onChange={(e) => handleChange('invoice.prefix', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={10}
                    placeholder="FACT"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('settings.defaults.invoicePrefix')}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.quotePrefix')}</label>
                  <input
                    type="text"
                    value={String(settings['quote.prefix'] ?? '')}
                    onChange={(e) => handleChange('quote.prefix', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={10}
                    placeholder="DEV"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('settings.defaults.quotePrefix')}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.creditNotePrefix')}</label>
                  <input
                    type="text"
                    value={String(settings['creditnote.prefix'] ?? '')}
                    onChange={(e) => handleChange('creditnote.prefix', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={10}
                    placeholder="AV"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('settings.defaults.creditNotePrefix')}</p>
                </div>
              </div>
            </div>

            {/* Document Settings Section */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.documentSettings')}</h3>
              <p className="text-sm text-gray-600 mb-6">{t('settings.documentSettingsDesc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.numberResetPeriod')}</label>
                  <select
                    value={String(settings['document.number.reset'] ?? 'yearly')}
                    onChange={(e) => handleChange('document.number.reset', e.target.value as NumberResetPeriod)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="yearly">{t('settings.resetPeriods.yearly')}</option>
                    <option value="never">{t('settings.resetPeriods.never')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('settings.numberResetPeriodDesc')}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.decimalPlaces')}</label>
                  <select
                    value={Number(settings['finance.decimal.places'] ?? 2)}
                    onChange={(e) => handleChange('finance.decimal.places', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>{t('settings.decimalOptions.0')}</option>
                    <option value={2}>{t('settings.decimalOptions.2')}</option>
                    <option value={3}>{t('settings.decimalOptions.3')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('settings.decimalPlacesDesc')}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.itemsPerPage')}</label>
                  <select
                    value={Number(settings['display.items.per.page'] ?? 10)}
                    onChange={(e) => handleChange('display.items.per.page', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={5}>{t('settings.itemsPerPageOptions.5')}</option>
                    <option value={10}>{t('settings.itemsPerPageOptions.10')}</option>
                    <option value={20}>{t('settings.itemsPerPageOptions.20')}</option>
                    <option value={50}>{t('settings.itemsPerPageOptions.50')}</option>
                    <option value={100}>{t('settings.itemsPerPageOptions.100')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('settings.itemsPerPageDesc')}</p>
                </div>
              </div>
            </div>

            {/* Financial Settings Section */}
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('settings.financialSettings')}</h3>
              <p className="text-sm text-gray-600 mb-6">{t('settings.financialSettingsDesc')}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.defaultTaxRate')}</label>
                  <select
                    value={Number(settings['finance.default.tax.rate'] ?? 20)}
                    onChange={(e) => handleChange('finance.default.tax.rate', Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={0}>{t('settings.taxRates.0')}</option>
                    <option value={7}>{t('settings.taxRates.7')}</option>
                    <option value={10}>{t('settings.taxRates.10')}</option>
                    <option value={14}>{t('settings.taxRates.14')}</option>
                    <option value={20}>{t('settings.taxRates.20')}</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">{t('settings.defaultTaxRateDesc')}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-1">{t('settings.currencySymbol')}</label>
                  <input
                    type="text"
                    value={String(settings['finance.currency.symbol'] ?? 'MAD')}
                    onChange={(e) => handleChange('finance.currency.symbol', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={6}
                    placeholder="MAD"
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('settings.currencySymbolDesc')}</p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


