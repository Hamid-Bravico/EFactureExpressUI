import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const EmailConfirmationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const success = searchParams.get('success') === 'true';
  const message = searchParams.get('message') || '';
  
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {success ? (
            <>
              <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                {t('auth.emailConfirmed.title')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('auth.emailConfirmed.successMessage')}
              </p>
            </>
          ) : (
            <>
              <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                {t('auth.emailConfirmed.errorTitle')}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {message || t('auth.emailConfirmed.errorMessage')}
              </p>
            </>
          )}
          
          <div className="mt-8">
            <p className="text-sm text-gray-500">
              {t('auth.emailConfirmed.redirecting', { count: countdown })}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {t('auth.emailConfirmed.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailConfirmationPage;
