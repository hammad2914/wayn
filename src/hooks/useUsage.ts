// Re-export types for backward compat
export type { DailyPoint, ActivityItem } from '../contexts/UsageContext';

// useUsage now reads from the shared UsageContext so every component
// (Sidebar, pages, widgets) sees the same state and updates in real time.
export { useUsageContext as useUsage } from '../contexts/UsageContext';
