# backend/src/core/analyzer.py

import numpy as np
from pydantic import BaseModel
from typing import List
from scipy import stats
from PIL import Image
import io
import sys
import logging

# --- Pydantic Models ---
class CellData(BaseModel):
    row: int
    col: int
    brightness: float
    concentration: float
    in_interval: bool = False

class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    bin_center: float
    count: int
    probability: float

class AnalysisResult(BaseModel):
    image_width: int
    image_height: int
    grid_size: int
    total_cells: int
    material: str
    magnification: str
    cells: List[CellData]
    concentrations: List[float]
    mean_concentration: float
    std_concentration: float
    skewness: float
    kurtosis: float
    entropy: float
    max_entropy: float
    delta: float
    a1: float
    a2: float
    cells_in_interval: int
    d_iei: float
    homogeneity_grade: str
    verdict: str
    suitability: str
    histogram: List[HistogramBin]

# --- Main Analyzer Class from PO.md (adapted for FastAPI) ---

class ImageAnalyzer:
    """Класс для анализа изображений композиционных материалов"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        # Using coefficients from PO.md
        self.calibration_coefficients = {
            'П-234': {'a': -0.0002, 'b': 0.05, 'c': -1.2},
            'П-324': {'a': -0.0003, 'b': 0.06, 'c': -1.5},
            'П-366Э': {'a': -0.0001, 'b': 0.04, 'c': -0.8}
        }
    
    def brightness_to_concentration(self, brightness: float, material: str) -> float:
        """Преобразование яркости в концентрацию"""
        if material not in self.calibration_coefficients:
            self.logger.warning(f"Материал {material} не найден, используется П-234")
            material = 'П-234'
        
        coeffs = self.calibration_coefficients[material]
        a, b, c = coeffs['a'], coeffs['b'], coeffs['c']
        
        concentration = a * (brightness ** 2) + b * brightness + c
        return max(0, min(100, concentration))

    def calculate_entropy(self, probabilities: np.ndarray) -> float:
        """Расчет информационной энтропии Шеннона"""
        non_zero_probs = probabilities[probabilities > 0]
        if len(non_zero_probs) == 0:
            return 0.0
        return -np.sum(non_zero_probs * np.log2(non_zero_probs))

    def analyze(
        self,
        image_bytes: bytes,
        material: str,
        magnification: str,
        grid_size: int,
    ) -> AnalysisResult:
        
        raw_image = Image.open(io.BytesIO(image_bytes))
        image = np.array(raw_image.convert('L'))
        image_height, image_width = image.shape
        
        cell_width = image_width // grid_size
        cell_height = image_height // grid_size
        
        total_cells = grid_size * grid_size
        
        cells_data = []
        concentrations = []
        
        for i in range(grid_size):
            for j in range(grid_size):
                cell = image[i*cell_height:(i+1)*cell_height, j*cell_width:(j+1)*cell_width]
                mean_brightness = np.mean(cell) if cell.size > 0 else 0
                # In PO.md, magnification is not used in the coefficients, so we don't pass it.
                concentration = self.brightness_to_concentration(mean_brightness, material)
                concentrations.append(concentration)
                cells_data.append(CellData(row=i, col=j, brightness=mean_brightness, concentration=concentration, in_interval=False))
        
        concentrations_np = np.array(concentrations)
        
        mean_conc = float(np.mean(concentrations_np))
        std_conc = float(np.std(concentrations_np, ddof=1)) if concentrations_np.size > 1 else 0.0
        skewness_val = float(stats.skew(concentrations_np))
        kurtosis_val = float(stats.kurtosis(concentrations_np))
        
        n_bins = int(1 + 3.322 * np.log10(len(concentrations))) if len(concentrations) > 0 else 1
        hist_counts, bin_edges = np.histogram(concentrations, bins=n_bins)
        probabilities = hist_counts / len(concentrations) if len(concentrations) > 0 else []
        
        entropy = self.calculate_entropy(probabilities)
        
        # *** Using the SIMPLE, ROBUST DELTA CALCULATION FROM PO.md ***
        if entropy > 0:
            delta = ((10 - entropy) / entropy) * mean_conc
        else:
            delta = 0.0
        
        a1 = mean_conc - delta
        a2 = mean_conc + delta
        
        cells_in_interval = 0
        for cell_obj in cells_data:
            if a1 <= cell_obj.concentration <= a2:
                cell_obj.in_interval = True
                cells_in_interval += 1

        d_iei = (cells_in_interval / total_cells) * 100 if total_cells > 0 else 0

        # Classification
        if d_iei >= 95: grade, verdict, suitability = "ИДЕАЛЬНАЯ / ВЫСОКАЯ", "ГОДЕН", "Образец обеспечивает максимально равномерное тепловое поле (ΔT < 2°C). Рекомендован для ответственных применений (обогрев молодняка)."
        elif d_iei >= 85: grade, verdict, suitability = "ДОСТАТОЧНАЯ", "УСЛОВНО ГОДЕН", "Возможны незначительные локальные отклонения температуры. Требует проверки тепловизионным контролем. Пригоден для менее критичных применений (обогрев труб)."
        elif d_iei >= 70: grade, verdict, suitability = "НИЗКАЯ", "НЕ РЕКОМЕНДОВАН", "Высокая вероятность 'горячих' и 'холодных' пятен, неравномерный износ, риск локального перегрева."
        else: grade, verdict, suitability = "НЕДОСТАТОЧНАЯ (БРАК)", "НЕ ГОДЕН", "Выраженная макронеоднородность, наличие крупных агломератов или непрокрасов."

        # Create histogram data for frontend
        histogram_bins = []
        for i in range(len(hist_counts)):
            histogram_bins.append(HistogramBin(bin_start=bin_edges[i], bin_end=bin_edges[i+1], bin_center=(bin_edges[i]+bin_edges[i+1])/2, count=int(hist_counts[i]), probability=float(probabilities[i])))
        
        return AnalysisResult(
            image_width=image_width, image_height=image_height, grid_size=grid_size, total_cells=total_cells,
            material=material, magnification=magnification,
            cells=cells_data,
            concentrations=concentrations, mean_concentration=mean_conc, std_concentration=std_conc, skewness=skewness_val, kurtosis=kurtosis_val,
            entropy=entropy, max_entropy=(np.log2(n_bins) if n_bins > 0 else 0.0),
            delta=delta, a1=a1, a2=a2, cells_in_interval=cells_in_interval, d_iei=d_iei,
            homogeneity_grade=grade, verdict=verdict, suitability=suitability, histogram=histogram_bins
        )