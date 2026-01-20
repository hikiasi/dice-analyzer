// lib/types.ts

export interface CellData {
  row: number;
  col: number;
  brightness: number;
  concentration: number;
  in_interval: boolean;
}

export interface HistogramBin {
  bin_start: number;
  bin_end: number;
  bin_center: number;
  count: number;
  probability: number;
}

export interface AnalysisResult {
  image_width: number;
  image_height: number;
  grid_size: number;
  total_cells: number;
  material: string;
  magnification: string;

  cells: CellData[];
  concentrations: number[];

  mean_concentration: number;
  std_concentration: number;
  skewness: number;
  kurtosis: number;

  entropy: number;
  max_entropy: number;
  entropy_ratio: number;
  
  delta: number;
  a1: number;
  a2: number;

  cells_in_interval: number;
  d_iei: number;

  homogeneity_grade: string;
  verdict: string;
  suitability: string;

  histogram: HistogramBin[];
}
