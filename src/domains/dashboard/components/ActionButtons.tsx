import React from 'react';
import { useNavigate } from 'react-router-dom';

const ActionButtons: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      label: 'Nouvelle Facture',
      gradient: 'from-blue-600 to-blue-700',
      hoverGradient: 'hover:from-blue-700 hover:to-blue-800',
      action: () => navigate('/invoices/new'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    {
      label: 'Relances Automatiques',
      gradient: 'from-gray-600 to-gray-700',
      hoverGradient: 'hover:from-gray-700 hover:to-gray-800',
      action: () => navigate('/notifications'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5-5 5-5H9a6 6 0 100 12h6z" />
        </svg>
      )
    },
    {
      label: 'Export TVA',
      gradient: 'from-green-600 to-green-700',
      hoverGradient: 'hover:from-green-700 hover:to-green-800',
      action: () => {
        console.log('Export TVA clicked');
      },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      label: 'Rapport Mensuel',
      gradient: 'from-purple-600 to-purple-700',
      hoverGradient: 'hover:from-purple-700 hover:to-purple-800',
      action: () => {
        console.log('Rapport Mensuel clicked');
      },
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.action}
          className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r ${action.gradient} text-white rounded-xl ${action.hoverGradient} transition-all duration-200 text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5`}
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ActionButtons;
