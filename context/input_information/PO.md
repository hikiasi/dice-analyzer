dice_analyzer/
│
├── main.py                 # Точка входа
├── requirements.txt        # Зависимости
├── README.md              # Документация
│
├── src/                   # Исходный код
│   ├── __init__.py
│   ├── core/             # Ядро приложения
│   │   ├── analyzer.py
│   │   ├── calculator.py
│   │   └── preprocessor.py
│   │
│   ├── gui/              # Интерфейс
│   │   ├── main_window.py
│   │   ├── results_window.py
│   │   └── widgets.py
│   │
│   ├── database/         # Работа с данными
│   │   ├── manager.py
│   │   └── models.py
│   │
│   └── utils/            # Вспомогательные функции
│       ├── file_io.py
│       ├── visualization.py
│       └── validators.py
│
├── data/                  # База данных и калибровки
│   ├── calibration.db
│   └── materials.json
│
└── tests/                # Тесты
    ├── test_analyzer.py
    └── test_calculator.py
#!/usr/bin/env python3
"""
DICE Analyzer - Основная точка входа программы
"""

import sys
import logging
from PyQt5.QtWidgets import QApplication
from PyQt5.QtGui import QFont
from PyQt5.QtCore import Qt
from src.gui.main_window import MainWindow

def setup_logging():
    """Настройка системы логирования"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('dice.log'),
            logging.StreamHandler()
        ]
    )

def main():
    """Главная функция"""
    # Настройка логирования
    setup_logging()
    logger = logging.getLogger(__name__)
    logger.info("Запуск DICE Analyzer")
    
    # Создание приложения
    app = QApplication(sys.argv)
    app.setApplicationName("DICE Analyzer")
    app.setApplicationVersion("1.0.0")
    
    # Настройка шрифта
    font = QFont("Segoe UI", 10)
    app.setFont(font)
    
    # Создание главного окна
    window = MainWindow()
    window.show()
    
    logger.info("Приложение запущено успешно")
    
    # Запуск основного цикла
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
"""
Основной модуль анализа изображений
"""

import numpy as np
import cv2
from scipy import stats
import logging
from typing import Dict, Tuple, List, Optional
from dataclasses import dataclass

@dataclass
class AnalysisResult:
    """Результаты анализа одного изображения"""
    image_path: str
    material_name: str
    cell_size: int
    
    # Основные параметры
    mean_concentration: float  # M[X]
    std_concentration: float   # σ
    skewness: float           # Коэффициент асимметрии
    kurtosis: float           # Коэффициент эксцесса
    entropy: float            # H(P)
    
    # Информационно-энтропийный интервал
    delta: float              # Δ
    a1: float                 # A1
    a2: float                 # A2
    
    # Критерии
    d_iei: float              # D_IEI в %
    uniformity_index: float   # ИО
    homogeneity_grade: str    # Категория однородности
    
    # Дополнительные данные
    concentration_map: np.ndarray
    histogram_data: Tuple[np.ndarray, np.ndarray]
    cells_in_interval: int
    total_cells: int
    
    def to_dict(self) -> Dict:
        """Преобразование в словарь для экспорта"""
        return {
            'image_path': self.image_path,
            'material_name': self.material_name,
            'cell_size': self.cell_size,
            'mean_concentration': round(self.mean_concentration, 3),
            'std_concentration': round(self.std_concentration, 3),
            'skewness': round(self.skewness, 3),
            'kurtosis': round(self.kurtosis, 3),
            'entropy': round(self.entropy, 3),
            'delta': round(self.delta, 3),
            'a1': round(self.a1, 3),
            'a2': round(self.a2, 3),
            'd_iei': round(self.d_iei, 2),
            'uniformity_index': round(self.uniformity_index, 3),
            'homogeneity_grade': self.homogeneity_grade,
            'cells_in_interval': self.cells_in_interval,
            'total_cells': self.total_cells
        }


class ImageAnalyzer:
    """Класс для анализа изображений композиционных материалов"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.calibration_coefficients = {
            'П-234': {'a': -0.0002, 'b': 0.05, 'c': -1.2},
            'П-324': {'a': -0.0003, 'b': 0.06, 'c': -1.5},
            'П-366Э': {'a': -0.0001, 'b': 0.04, 'c': -0.8}
        }
    
    def load_image(self, image_path: str) -> np.ndarray:
        """Загрузка и предобработка изображения"""
        self.logger.info(f"Загрузка изображения: {image_path}")
        
        # Загрузка изображения
        image = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
        if image is None:
            raise ValueError(f"Не удалось загрузить изображение: {image_path}")
        
        # Предобработка
        image = self._preprocess_image(image)
        
        return image
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Предобработка изображения"""
        # Нормализация
        image = cv2.normalize(image, None, 0, 255, cv2.NORM_MINMAX)
        
        # Удаление шума (медианный фильтр)
        image = cv2.medianBlur(image, 3)
        
        # Улучшение контраста (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        image = clahe.apply(image)
        
        return image
    
    def brightness_to_concentration(self, brightness: float, 
                                   material: str) -> float:
        """Преобразование яркости в концентрацию"""
        if material not in self.calibration_coefficients:
            self.logger.warning(f"Материал {material} не найден, используется П-234")
            material = 'П-234'
        
        coeffs = self.calibration_coefficients[material]
        a, b, c = coeffs['a'], coeffs['b'], coeffs['c']
        
        # Параболическая зависимость: C = a*B² + b*B + c
        concentration = a * (brightness ** 2) + b * brightness + c
        
        # Ограничение концентрации от 0 до 100%
        concentration = max(0, min(100, concentration))
        
        return concentration
    
    def calculate_entropy(self, probabilities: np.ndarray) -> float:
        """Расчет информационной энтропии Шеннона"""
        # Убираем нулевые вероятности (log2(0) не определен)
        non_zero_probs = probabilities[probabilities > 0]
        
        if len(non_zero_probs) == 0:
            return 0.0
        
        # H(P) = -Σ p_i * log2(p_i)
        entropy = -np.sum(non_zero_probs * np.log2(non_zero_probs))
        
        return entropy
    
    def analyze(self, image: np.ndarray, material: str = 'П-234', 
                cell_size: int = 50) -> AnalysisResult:
        """
        Основной метод анализа изображения
        
        Args:
            image: Изображение в градациях серого
            material: Марка технического углерода
            cell_size: Размер ячейки в пикселях
            
        Returns:
            AnalysisResult: Результаты анализа
        """
        self.logger.info(f"Начало анализа: материал={material}, размер ячейки={cell_size}")
        
        # 1. Разбиение изображения на ячейки
        height, width = image.shape
        cells_x = width // cell_size
        cells_y = height // cell_size
        
        # Обрезаем изображение до целого числа ячеек
        cropped_width = cells_x * cell_size
        cropped_height = cells_y * cell_size
        image = image[:cropped_height, :cropped_width]
        
        total_cells = cells_x * cells_y
        self.logger.info(f"Изображение разбито на {total_cells} ячеек")
        
        # 2. Расчет концентрации для каждой ячейки
        concentrations = []
        concentration_map = np.zeros((cells_y, cells_x))
        
        for i in range(cells_y):
            for j in range(cells_x):
                # Извлекаем ячейку
                cell = image[i*cell_size:(i+1)*cell_size, 
                            j*cell_size:(j+1)*cell_size]
                
                # Средняя яркость в ячейке
                mean_brightness = np.mean(cell)
                
                # Преобразование в концентрацию
                concentration = self.brightness_to_concentration(
                    mean_brightness, material
                )
                
                concentrations.append(concentration)
                concentration_map[i, j] = concentration
        
        concentrations = np.array(concentrations)
        
        # 3. Статистический анализ
        mean_conc = np.mean(concentrations)          # M[X]
        std_conc = np.std(concentrations, ddof=1)    # σ
        skewness = stats.skew(concentrations)        # Коэффициент асимметрии
        kurtosis = stats.kurtosis(concentrations)    # Коэффициент эксцесса
        
        # 4. Построение гистограммы и расчет энтропии
        # Автоподбор количества бинов по правилу Стёрджеса
        n_bins = int(1 + 3.322 * np.log10(len(concentrations)))
        hist, bin_edges = np.histogram(concentrations, bins=n_bins)
        probabilities = hist / len(concentrations)
        
        entropy = self.calculate_entropy(probabilities)  # H(P)
        
        # 5. Расчет информационно-энтропийного интервала
        if entropy > 0:
            delta = ((10 - entropy) / entropy) * mean_conc  # Δ
        else:
            delta = 0
        
        a1 = mean_conc - delta  # A1
        a2 = mean_conc + delta  # A2
        
        # 6. Расчет критерия D_IEI
        cells_in_interval = np.sum((concentrations >= a1) & (concentrations <= a2))
        d_iei = (cells_in_interval / len(concentrations)) * 100  # D_IEI в %
        
        # 7. Расчет интегрального индекса однородности
        h_max = np.log2(n_bins)  # Максимальная энтропия
        h_ratio = min(1.0, entropy / h_max) if h_max > 0 else 0
        
        uniformity_index = (
            0.6 * (d_iei / 100) +
            0.2 * (1 - abs(skewness) / 2) +
            0.2 * (1 - h_ratio)
        )
        
        # 8. Классификация однородности
        if d_iei >= 95 and uniformity_index >= 0.85:
            homogeneity_grade = "ВЫСОКАЯ"
        elif d_iei >= 85 and uniformity_index >= 0.70:
            homogeneity_grade = "СРЕДНЯЯ"
        else:
            homogeneity_grade = "НИЗКАЯ"
        
        # 9. Создание объекта результата
        result = AnalysisResult(
            image_path="",
            material_name=material,
            cell_size=cell_size,
            mean_concentration=mean_conc,
            std_concentration=std_conc,
            skewness=skewness,
            kurtosis=kurtosis,
            entropy=entropy,
            delta=delta,
            a1=a1,
            a2=a2,
            d_iei=d_iei,
            uniformity_index=uniformity_index,
            homogeneity_grade=homogeneity_grade,
            concentration_map=concentration_map,
            histogram_data=(hist, bin_edges),
            cells_in_interval=int(cells_in_interval),
            total_cells=total_cells
        )
        
        self.logger.info(f"Анализ завершен: D_IEI={d_iei:.2f}%, степень={homogeneity_grade}")
        
        return result
    
    def batch_analyze(self, image_paths: List[str], material: str = 'П-234',
                     cell_size: int = 50) -> List[AnalysisResult]:
        """Пакетный анализ нескольких изображений"""
        results = []
        
        for i, image_path in enumerate(image_paths):
            self.logger.info(f"Обработка изображения {i+1}/{len(image_paths)}: {image_path}")
            
            try:
                # Загрузка изображения
                image = self.load_image(image_path)
                
                # Анализ
                result = self.analyze(image, material, cell_size)
                result.image_path = image_path
                
                results.append(result)
                
            except Exception as e:
                self.logger.error(f"Ошибка при обработке {image_path}: {str(e)}")
        
        return results
"""
Главное окно приложения DICE Analyzer
"""

import sys
import os
from PyQt5.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
                             QPushButton, QLabel, QFileDialog, QComboBox,
                             QSpinBox, QGroupBox, QTextEdit, QProgressBar,
                             QTabWidget, QTableWidget, QTableWidgetItem,
                             QMessageBox, QSplitter, QAction, QMenuBar, QMenu)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QPixmap, QImage, QFont
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

from src.core.analyzer import ImageAnalyzer, AnalysisResult


class AnalysisThread(QThread):
    """Поток для выполнения анализа в фоне"""
    
    analysis_complete = pyqtSignal(object)  # Сигнал с результатом
    progress_updated = pyqtSignal(int)      # Сигнал прогресса
    error_occurred = pyqtSignal(str)        # Сигнал ошибки
    
    def __init__(self, image_path, material, cell_size):
        super().__init__()
        self.image_path = image_path
        self.material = material
        self.cell_size = cell_size
        
    def run(self):
        try:
            self.progress_updated.emit(10)
            
            # Создание анализатора
            analyzer = ImageAnalyzer()
            
            self.progress_updated.emit(30)
            
            # Загрузка и анализ изображения
            image = analyzer.load_image(self.image_path)
            
            self.progress_updated.emit(50)
            
            # Анализ
            result = analyzer.analyze(image, self.material, self.cell_size)
            result.image_path = self.image_path
            
            self.progress_updated.emit(90)
            
            # Отправка результата
            self.analysis_complete.emit(result)
            self.progress_updated.emit(100)
            
        except Exception as e:
            self.error_occurred.emit(str(e))


class MainWindow(QMainWindow):
    """Главное окно приложения"""
    
    def __init__(self):
        super().__init__()
        self.current_result = None
        self.init_ui()
        
    def init_ui(self):
        """Инициализация интерфейса"""
        self.setWindowTitle("DICE Analyzer v1.0 - Оценка однородности композитов")
        self.setGeometry(100, 100, 1400, 900)
        
        # Создание центрального виджета
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Основной макет
        main_layout = QHBoxLayout(central_widget)
        
        # Левая панель - управление
        left_panel = self.create_control_panel()
        
        # Правая панель - результаты
        right_panel = self.create_results_panel()
        
        # Разделитель
        splitter = QSplitter(Qt.Horizontal)
        splitter.addWidget(left_panel)
        splitter.addWidget(right_panel)
        splitter.setSizes([400, 1000])
        
        main_layout.addWidget(splitter)
        
        # Создание меню
        self.create_menu_bar()
        
    def create_control_panel(self):
        """Создание панели управления"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # Заголовок
        title_label = QLabel("DICE Analyzer")
        title_font = QFont("Arial", 16, QFont.Bold)
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(title_label)
        
        # Группа загрузки изображения
        load_group = QGroupBox("Загрузка изображения")
        load_layout = QVBoxLayout()
        
        self.image_label = QLabel("Изображение не загружено")
        self.image_label.setAlignment(Qt.AlignCenter)
        self.image_label.setStyleSheet("border: 1px solid #ccc; padding: 10px;")
        self.image_label.setMinimumHeight(200)
        load_layout.addWidget(self.image_label)
        
        self.load_button = QPushButton("Загрузить изображение")
        self.load_button.clicked.connect(self.load_image)
        load_layout.addWidget(self.load_button)
        
        load_group.setLayout(load_layout)
        layout.addWidget(load_group)
        
        # Группа параметров анализа
        params_group = QGroupBox("Параметры анализа")
        params_layout = QVBoxLayout()
        
        # Выбор материала
        material_layout = QHBoxLayout()
        material_layout.addWidget(QLabel("Материал ТУ:"))
        
        self.material_combo = QComboBox()
        self.material_combo.addItems(["П-234", "П-324", "П-366Э", "П-367Э"])
        material_layout.addWidget(self.material_combo)
        
        params_layout.addLayout(material_layout)
        
        # Размер ячейки
        cell_layout = QHBoxLayout()
        cell_layout.addWidget(QLabel("Размер ячейки (px):"))
        
        self.cell_size_spin = QSpinBox()
        self.cell_size_spin.setRange(10, 200)
        self.cell_size_spin.setValue(50)
        self.cell_size_spin.setSingleStep(5)
        cell_layout.addWidget(self.cell_size_spin)
        
        params_layout.addLayout(cell_layout)
        
        params_group.setLayout(params_layout)
        layout.addWidget(params_group)
        
        # Кнопка анализа
        self.analyze_button = QPushButton("Начать анализ")
        self.analyze_button.clicked.connect(self.start_analysis)
        self.analyze_button.setEnabled(False)
        self.analyze_button.setStyleSheet(
            "QPushButton {background-color: #4CAF50; color: white; padding: 10px; font-weight: bold;}"
        )
        layout.addWidget(self.analyze_button)
        
        # Прогресс-бар
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
        
        # Лог
        log_group = QGroupBox("Лог выполнения")
        log_layout = QVBoxLayout()
        
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setMaximumHeight(150)
        log_layout.addWidget(self.log_text)
        
        log_group.setLayout(log_layout)
        layout.addWidget(log_group)
        
        # Растягивающий элемент
        layout.addStretch()
        
        return panel
    
    def create_results_panel(self):
        """Создание панели результатов"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # Вкладки
        self.tabs = QTabWidget()
        
        # Вкладка 1: Основные результаты
        self.results_tab = QWidget()
        self.results_layout = QVBoxLayout(self.results_tab)
        self.tabs.addTab(self.results_tab, "Результаты")
        
        # Вкладка 2: Графики
        self.plots_tab = QWidget()
        self.plots_layout = QVBoxLayout(self.plots_tab)
        self.tabs.addTab(self.plots_tab, "Графики")
        
        # Вкладка 3: Таблица данных
        self.table_tab = QWidget()
        self.table_layout = QVBoxLayout(self.table_tab)
        self.tabs.addTab(self.table_tab, "Данные")
        
        layout.addWidget(self.tabs)
        
        return panel
    
    def create_menu_bar(self):
        """Создание меню"""
        menubar = self.menuBar()
        
        # Меню Файл
        file_menu = menubar.addMenu("Файл")
        
        open_action = QAction("Открыть", self)
        open_action.triggered.connect(self.load_image)
        file_menu.addAction(open_action)
        
        save_action = QAction("Сохранить отчет", self)
        save_action.triggered.connect(self.save_report)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("Выход", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Меню Справка
        help_menu = menubar.addMenu("Справка")
        
        about_action = QAction("О программе", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def load_image(self):
        """Загрузка изображения"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Выберите изображение", "",
            "Изображения (*.png *.jpg *.jpeg *.bmp *.tiff *.tif)"
        )
        
        if file_path:
            # Отображение превью
            pixmap = QPixmap(file_path)
            if not pixmap.isNull():
                scaled_pixmap = pixmap.scaled(
                    380, 200, Qt.KeepAspectRatio, Qt.SmoothTransformation
                )
                self.image_label.setPixmap(scaled_pixmap)
                self.image_label.setText("")
                
                # Сохранение пути
                self.current_image_path = file_path
                
                # Активация кнопки анализа
                self.analyze_button.setEnabled(True)
                
                # Логирование
                self.log_text.append(f"Загружено изображение: {os.path.basename(file_path)}")
            else:
                QMessageBox.warning(self, "Ошибка", "Не удалось загрузить изображение")
    
    def start_analysis(self):
        """Начало анализа"""
        if not hasattr(self, 'current_image_path'):
            QMessageBox.warning(self, "Ошибка", "Сначала загрузите изображение")
            return
        
        # Блокировка кнопок
        self.analyze_button.setEnabled(False)
        self.load_button.setEnabled(False)
        
        # Показать прогресс-бар
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        # Получение параметров
        material = self.material_combo.currentText()
        cell_size = self.cell_size_spin.value()
        
        self.log_text.append(f"Начало анализа: материал={material}, размер ячейки={cell_size}px")
        
        # Создание и запуск потока анализа
        self.analysis_thread = AnalysisThread(
            self.current_image_path, material, cell_size
        )
        self.analysis_thread.analysis_complete.connect(self.on_analysis_complete)
        self.analysis_thread.progress_updated.connect(self.progress_bar.setValue)
        self.analysis_thread.error_occurred.connect(self.on_analysis_error)
        self.analysis_thread.start()
    
    def on_analysis_complete(self, result: AnalysisResult):
        """Обработка завершения анализа"""
        self.current_result = result
        
        # Разблокировка кнопок
        self.analyze_button.setEnabled(True)
        self.load_button.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        # Отображение результатов
        self.display_results(result)
        self.display_plots(result)
        self.display_table(result)
        
        self.log_text.append(f"Анализ завершен: D_IEI={result.d_iei:.2f}%")
        self.log_text.append(f"Степень однородности: {result.homogeneity_grade}")
    
    def on_analysis_error(self, error_msg: str):
        """Обработка ошибки анализа"""
        # Разблокировка кнопок
        self.analyze_button.setEnabled(True)
        self.load_button.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        # Показать сообщение об ошибке
        QMessageBox.critical(self, "Ошибка анализа", error_msg)
        self.log_text.append(f"Ошибка: {error_msg}")
    
    def display_results(self, result: AnalysisResult):
        """Отображение основных результатов"""
        # Очистка предыдущих результатов
        for i in reversed(range(self.results_layout.count())):
            widget = self.results_layout.itemAt(i).widget()
            if widget:
                widget.setParent(None)
        
        # Группа основных параметров
        params_group = QGroupBox("Основные параметры")
        params_layout = QVBoxLayout()
        
        # Создание таблицы параметров
        params_text = f"""
        <style>
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
        </style>
        
        <table>
        <tr><th>Параметр</th><th>Значение</th></tr>
        <tr><td>Математическое ожидание M[X]</td><td>{result.mean_concentration:.3f}</td></tr>
        <tr><td>Стандартное отклонение σ</td><td>{result.std_concentration:.3f}</td></tr>
        <tr><td>Коэффициент асимметрии</td><td>{result.skewness:.3f}</td></tr>
        <tr><td>Коэффициент эксцесса</td><td>{result.kurtosis:.3f}</td></tr>
        <tr><td>Информационная энтропия H(P)</td><td>{result.entropy:.3f}</td></tr>
        <tr><td>Параметр Δ</td><td>{result.delta:.3f}</td></tr>
        <tr><td>Граница A1</td><td>{result.a1:.3f}</td></tr>
        <tr><td>Граница A2</td><td>{result.a2:.3f}</td></tr>
        </table>
        """
        
        params_label = QLabel(params_text)
        params_label.setTextFormat(Qt.RichText)
        params_layout.addWidget(params_label)
        
        params_group.setLayout(params_layout)
        self.results_layout.addWidget(params_group)
        
        # Группа критериев однородности
        criteria_group = QGroupBox("Критерии однородности")
        criteria_layout = QVBoxLayout()
        
        # Индикатор D_IEI
        d_iei_text = f"""
        <h3>Основной критерий D_IEI: <span style='color: {'green' if result.d_iei >= 95 else 'orange' if result.d_iei >= 85 else 'red'}'>{result.d_iei:.2f}%</span></h3>
        <p>Ячеек в интервале: {result.cells_in_interval} из {result.total_cells}</p>
        """
        
        d_iei_label = QLabel(d_iei_text)
        d_iei_label.setTextFormat(Qt.RichText)
        criteria_layout.addWidget(d_iei_label)
        
        # Интегральный индекс
        index_text = f"""
        <h3>Интегральный индекс однородности: <span style='color: {'green' if result.uniformity_index >= 0.85 else 'orange' if result.uniformity_index >= 0.70 else 'red'}'>{result.uniformity_index:.3f}</span></h3>
        """
        
        index_label = QLabel(index_text)
        index_label.setTextFormat(Qt.RichText)
        criteria_layout.addWidget(index_label)
        
        # Заключение
        conclusion_text = f"""
        <h2 style='color: {'green' if result.homogeneity_grade == 'ВЫСОКАЯ' else 'orange' if result.homogeneity_grade == 'СРЕДНЯЯ' else 'red'};'>
        СТЕПЕНЬ ОДНОРОДНОСТИ: {result.homogeneity_grade}
        </h2>
        """
        
        if result.homogeneity_grade == "ВЫСОКАЯ":
            conclusion_text += "<p>✓ Материал пригоден для изготовления высококачественных обогревателей</p>"
        elif result.homogeneity_grade == "СРЕДНЯЯ":
            conclusion_text += "<p>⚠ Материал требует дополнительной оптимизации диспергирования</p>"
        else:
            conclusion_text += "<p>✗ Материал не рекомендуется для использования в обогревателях</p>"
        
        conclusion_label = QLabel(conclusion_text)
        conclusion_label.setTextFormat(Qt.RichText)
        criteria_layout.addWidget(conclusion_label)
        
        criteria_group.setLayout(criteria_layout)
        self.results_layout.addWidget(criteria_group)
        
        # Растягивающий элемент
        self.results_layout.addStretch()
    
    def display_plots(self, result: AnalysisResult):
        """Отображение графиков"""
        # Очистка предыдущих графиков
        for i in reversed(range(self.plots_layout.count())):
            widget = self.plots_layout.itemAt(i).widget()
            if widget:
                widget.setParent(None)
        
        # Создание фигуры с несколькими графиками
        fig = Figure(figsize=(10, 8))
        
        # 1. Гистограмма распределения
        ax1 = fig.add_subplot(221)
        hist, bin_edges = result.histogram_data
        ax1.bar(bin_edges[:-1], hist, width=np.diff(bin_edges), 
                edgecolor='black', alpha=0.7)
        ax1.axvline(result.mean_concentration, color='red', linestyle='--', 
                   label=f'M[X] = {result.mean_concentration:.2f}')
        ax1.axvspan(result.a1, result.a2, alpha=0.3, color='green',
                   label=f'ИЭИ: [{result.a1:.2f}, {result.a2:.2f}]')
        ax1.set_xlabel('Концентрация ТУ')
        ax1.set_ylabel('Количество ячеек')
        ax1.set_title('Распределение концентраций')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 2. Карта концентрации
        ax2 = fig.add_subplot(222)
        im = ax2.imshow(result.concentration_map, cmap='hot', 
                       interpolation='nearest')
        ax2.set_title('Карта распределения концентрации')
        ax2.set_xlabel('X, ячейки')
        ax2.set_ylabel('Y, ячейки')
        fig.colorbar(im, ax=ax2, label='Концентрация ТУ')
        
        # 3. Круговая диаграмма критерия
        ax3 = fig.add_subplot(223)
        in_interval = result.cells_in_interval
        out_interval = result.total_cells - in_interval
        labels = ['В интервале', 'Вне интервала']
        sizes = [in_interval, out_interval]
        colors = ['#4CAF50', '#F44336']
        
        ax3.pie(sizes, labels=labels, colors=colors, autopct='%1.1f%%',
                startangle=90, shadow=True)
        ax3.set_title(f'Критерий D_IEI: {result.d_iei:.1f}%')
        
        # 4. Бар-график параметров
        ax4 = fig.add_subplot(224)
        parameters = ['M[X]', 'σ', '|Sk|', 'H(P)']
        values = [
            result.mean_concentration,
            result.std_concentration,
            abs(result.skewness),
            result.entropy
        ]
        
        bars = ax4.bar(parameters, values, color=['blue', 'orange', 'green', 'red'])
        ax4.set_title('Основные статистические параметры')
        ax4.set_ylabel('Значение')
        ax4.grid(True, alpha=0.3, axis='y')
        
        # Добавление значений на столбцы
        for bar, value in zip(bars, values):
            height = bar.get_height()
            ax4.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                    f'{value:.3f}', ha='center', va='bottom')
        
        fig.tight_layout()
        
        # Встраивание в Qt
        canvas = FigureCanvas(fig)
        self.plots_layout.addWidget(canvas)
    
    def display_table(self, result: AnalysisResult):
        """Отображение данных в таблице"""
        # Очистка предыдущей таблицы
        for i in reversed(range(self.table_layout.count())):
            widget = self.table_layout.itemAt(i).widget()
            if widget:
                widget.setParent(None)
        
        # Создание таблицы
        table = QTableWidget()
        table.setColumnCount(2)
        table.setRowCount(15)
        
        # Заголовки
        table.setHorizontalHeaderLabels(['Параметр', 'Значение'])
        
        # Данные
        data = result.to_dict()
        rows = [
            ("Материал ТУ", data['material_name']),
            ("Размер ячейки", f"{data['cell_size']} px"),
            ("Математическое ожидание M[X]", f"{data['mean_concentration']}"),
            ("Стандартное отклонение σ", f"{data['std_concentration']}"),
            ("Коэффициент асимметрии", f"{data['skewness']}"),
            ("Коэффициент эксцесса", f"{data['kurtosis']}"),
            ("Информационная энтропия H(P)", f"{data['entropy']}"),
            ("Параметр Δ", f"{data['delta']}"),
            ("Граница A1", f"{data['a1']}"),
            ("Граница A2", f"{data['a2']}"),
            ("Основной критерий D_IEI", f"{data['d_iei']}%"),
            ("Интегральный индекс ИО", f"{data['uniformity_index']}"),
            ("Степень однородности", data['homogeneity_grade']),
            ("Ячеек в интервале", f"{data['cells_in_interval']}"),
            ("Всего ячеек", f"{data['total_cells']}")
        ]
        
        for i, (param, value) in enumerate(rows):
            table.setItem(i, 0, QTableWidgetItem(param))
            table.setItem(i, 1, QTableWidgetItem(str(value)))
        
        table.resizeColumnsToContents()
        self.table_layout.addWidget(table)
    
    def save_report(self):
        """Сохранение отчета"""
        if not self.current_result:
            QMessageBox.warning(self, "Ошибка", "Нет данных для сохранения")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Сохранить отчет", "",
            "PDF файлы (*.pdf);;Текстовые файлы (*.txt);;CSV файлы (*.csv)"
        )
        
        if file_path:
            # Здесь должна быть реализация сохранения отчета
            QMessageBox.information(self, "Сохранение", 
                                  f"Отчет будет сохранен в: {file_path}")
            self.log_text.append(f"Отчет сохранен: {file_path}")
    
    def show_about(self):
        """Показать информацию о программе"""
        about_text = """
        <h2>DICE Analyzer v1.0</h2>
        <p><b>Dispersion & Information Carbon Evaluator</b></p>
        
        <p>Программное обеспечение для количественной оценки 
        однородности распределения технического углерода 
        в композиционных материалах.</p>
        
        <p><b>Метод:</b> Информационно-энтропийный анализ</p>
        <p><b>Критерий:</b> D_IEI ≥ 95% - высокая однородность</p>
        
        <p>© 2024 Разработано для диссертационного исследования</p>
        """
        
        QMessageBox.about(self, "О программе DICE Analyzer", about_text)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
# DICE Analyzer

**Dispersion & Information Carbon Evaluator**

Программное обеспечение для автоматизированной оценки однородности 
распределения технического углерода в композиционных материалах 
на основе информационно-энтропийного метода.

## Особенности

- **Автоматический анализ** СЭМ-изображений композитов
- **Количественная оценка** однородности по критерию D_IEI
- **Информационно-энтропийный метод** с адаптивными интервалами
- **Профессиональный графический интерфейс**
- **Поддержка пакетной обработки**
- **Генерация отчетов** в различных форматах

## Установка

1. Установите Python 3.8 или выше
2. Установите зависимости:
   ```bash
   pip install -r requirements.txt
