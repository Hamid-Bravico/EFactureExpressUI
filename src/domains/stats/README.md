# Stats Domain

This domain handles the statistics displayed in the navbar and sidebar of the application.

## Overview

The stats system provides real-time financial metrics and record counts that update independently:

- **Navbar Revenue Stats**: Period-based revenue metrics that change based on user-selected time periods (today/week/month)
- **Overdue Stats**: Current overdue invoices count and amount (always shows current status, not period-based)
- **Sidebar Stats**: Total record counts that rarely change

## API Endpoints

- `GET /api/stats/navbar?period=(month|week|today)` - Navbar stats (includes revenue and overdue data)
- `GET /api/stats/sidebar-counts` - Sidebar record counts

**Note**: Currently, overdue stats are included in the navbar response. A separate `/api/stats/overdue` endpoint will be implemented in the future.

## Data Structure

### Navbar Stats Response
```json
{
  "period": "December 2024",
  "periodType": "month",
  "periodRevenue": 127450.00,
  "overdueStats": {
    "count": 3,
    "totalAmount": 23500.00
  },
  "lastUpdated": "2024-12-15T14:30:00Z"
}
```

### Sidebar Counts Response
```json
{
  "customersCount": 23,
  "invoicesCount": 47,
  "quotesCount": 12,
  "creditNotesCount": 3,
  "lastUpdated": "2024-12-15T14:30:00Z"
}
```

## Components

- **StatsProvider**: Context provider for stats data
- **useStats**: Custom hook for managing stats state
- **statsService**: API service for fetching stats
- **stats.utils**: Utility functions for formatting

## Usage

The stats are automatically loaded when the app starts and are available throughout the application via the StatsContext.

### In Components
```tsx
import { useStatsContext } from '../domains/stats/context/StatsContext';

const MyComponent = () => {
  const { stats, fetchNavbarStats, fetchOverdueStats } = useStatsContext();
  
  // Access stats data
  const revenue = stats.navbarStats?.periodRevenue;
  const overdueCount = stats.overdueStats?.count;
  const customerCount = stats.sidebarCounts?.customersCount;
  
  // Update navbar stats (only affects revenue)
  const handlePeriodChange = (period) => {
    fetchNavbarStats(period);
  };
  
  // Refresh overdue stats (always current)
  const refreshOverdue = () => {
    fetchOverdueStats();
  };
};
```

## Features

- ✅ Real-time stats fetching
- ✅ Loading states with skeleton UI
- ✅ Error handling with toast notifications
- ✅ Period-based filtering for navbar stats
- ✅ Automatic refresh on app load
- ✅ Context-based state management
- ✅ TypeScript support
