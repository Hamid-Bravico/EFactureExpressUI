export const formatCurrency = (amount: number, currency: string = 'MAD'): string => {
  return `${amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} ${currency}`;
};

export const formatNumber = (number: number): string => {
  return number.toLocaleString('en-US');
};

export const formatPeriod = (period: string): string => {
  return period;
};

export const isDateWithinSelectedPeriod = (isoDate: string, period: 'today' | 'week' | 'month'): boolean => {
  const date = new Date(isoDate);
  const now = new Date();

  if (period === 'today') {
    return date.toDateString() === now.toDateString();
  }

  if (period === 'week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    return date >= startOfWeek && date < endOfWeek;
  }

  // month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return date >= startOfMonth && date < endOfMonth;
};
