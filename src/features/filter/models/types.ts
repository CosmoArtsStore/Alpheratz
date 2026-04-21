// Preset date ranges supported by the filter sidebar.
export type DatePreset =
  | 'none'
  | 'today'
  | 'last7days'
  | 'thisMonth'
  | 'lastMonth'
  | 'halfYear'
  | 'oneYear'
  | 'custom';

// Orientation filter values exposed by the photo search UI.
export type OrientationFilter = 'all' | 'portrait' | 'landscape';

// Sort modes available in the gallery filter sidebar.
export type SortMode = 'capturedAtDesc' | 'worldNameAsc';
