# api/src/core/reporter.py
print("--- api/src/core/reporter.py loaded ---")
import io
import matplotlib.pyplot as plt
from datetime import date
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

from .analyzer import AnalysisResult

# --- Font Registration for Cyrillic Support ---
# IMPORTANT: You need to place a Cyrillic-supporting TTF font file in the api/src/core/ directory.
# For example, download DejaVuSans.ttf or use an Arial.ttf if available on your system.
FONT_PATH = os.path.join(os.path.dirname(__file__), 'DejaVuSans.ttf')
FONT_NAME = 'DejaVuSans'

try:
    # Attempt to register DejaVuSans for better Cyrillic support
    pdfmetrics.registerFont(TTFont(FONT_NAME, FONT_PATH))
    print(f"--- Font '{FONT_NAME}' registered from '{FONT_PATH}' ---")
except Exception as e:
    print(f"--- WARNING: Could not register font '{FONT_NAME}' from '{FONT_PATH}'. Falling back to default: {e} ---")
    # Fallback if font registration fails (e.g., font file not found)
    FONT_NAME = 'Helvetica' # Fallback to default ReportLab font

# --- End Font Registration ---


def create_histogram(result: AnalysisResult) -> io.BytesIO:
    """Creates a histogram chart using matplotlib and returns it as a BytesIO buffer."""
    fig, ax = plt.subplots(figsize=(6, 3))
    
    bin_centers = [b.bin_center for b in result.histogram]
    counts = [b.count for b in result.histogram]
    widths = [b.bin_end - b.bin_start for b in result.histogram]

    # Create bars, coloring them based on the interval
    bar_colors = []
    for b in result.histogram:
        if b.bin_center >= result.a1 and b.bin_center <= result.a2:
            bar_colors.append('green')
        else:
            bar_colors.append('red')

    ax.bar(bin_centers, counts, width=widths, color=bar_colors, edgecolor='black', alpha=0.7)

    # Add vertical lines for Mean, A1, A2
    ax.axvline(result.mean_concentration, color='orange', linestyle='--', linewidth=2, label=f'M[X] = {result.mean_concentration:.2f}')
    ax.axvline(result.a1, color='blue', linestyle=':', linewidth=2, label=f'A1 = {result.a1:.2f}')
    ax.axvline(result.a2, color='blue', linestyle=':', linewidth=2, label=f'A2 = {result.a2:.2f}')
    
    ax.set_title('Гистограмма распределения концентрации', fontname=FONT_NAME)
    ax.set_xlabel('Концентрация, %', fontname=FONT_NAME)
    ax.set_ylabel('Количество ячеек', fontname=FONT_NAME)
    ax.legend(prop={'family': FONT_NAME})
    ax.grid(True, which='both', linestyle='--', linewidth=0.5)
    
    fig.tight_layout()
    
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=300)
    buf.seek(0)
    plt.close(fig)
    return buf

def generate_pdf_report(result: AnalysisResult) -> io.BytesIO:
    """Generates a complete PDF report using ReportLab."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()

    # Define custom styles using the registered font
    styles.add(ParagraphStyle(name='h1Custom', parent=styles['h1'], fontName=FONT_NAME))
    styles.add(ParagraphStyle(name='h2Custom', parent=styles['h2'], fontName=FONT_NAME))
    styles.add(ParagraphStyle(name='NormalCustom', parent=styles['Normal'], fontName=FONT_NAME))

    story = []

    # Title
    story.append(Paragraph("DICE Analyzer: Отчет по анализу однородности", styles['h1Custom']))
    story.append(Spacer(1, 0.2*inch))

    # General Info Table
    info_data = [
        ['Дата отчета:', date.today().strftime('%d.%m.%Y')],
        ['Размер изображения:', f"{result.image_width} x {result.image_height} px"],
        ['Размер сетки:', f"{result.grid_size} x {result.grid_size} ({result.total_cells} ячеек)"],
        ['Материал:', result.material],
        ['Кратность увеличения:', result.magnification],
    ]
    info_table = Table(info_data, hAlign='LEFT')
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), FONT_NAME), # Apply font to info table
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'LEFT'),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.2*inch))

    # Main Results Table
    story.append(Paragraph("Основные результаты", styles['h2Custom']))
    results_data = [
        ['Параметр', 'Значение'],
        ['D_IEI', f"{result.d_iei:.1f}%"],
        ['M[X] (среднее)', f"{result.mean_concentration:.2f}%"],
        ['H(P) (энтропия)', f"{result.entropy:.3f} бит"],
        ['Δ (полуширина)', f"{result.delta:.2f}%"],
        ['A1 (левая граница)', f"{result.a1:.2f}%"],
        ['A2 (правая граница)', f"{result.a2:.2f}%"],
        ['Ячеек в интервале', f"{result.cells_in_interval} из {result.total_cells}"],
        ['Степень однородности', result.homogeneity_grade],
        ['Заключение', result.verdict],
    ]
    results_table = Table(results_data)
    results_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#16A34A')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('FONTNAME', (0,0), (-1,0), FONT_NAME), # Apply font to header
        ('FONTNAME', (0,1), (-1,-1), FONT_NAME), # Apply font to body
        ('BOTTOMPADDING', (0,0), (-1,0), 12),
        ('BACKGROUND', (0,1), (-1,-1), colors.beige),
        ('GRID', (0,0), (-1,-1), 1, colors.black)
    ]))
    story.append(results_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Suitability
    story.append(Paragraph("Заключение для применения", styles['h2Custom']))
    story.append(Paragraph(result.suitability, styles['NormalCustom']))
    story.append(Spacer(1, 0.2*inch))

    # Histogram
    story.append(Paragraph("Визуализации", styles['h2Custom']))
    histogram_buffer = create_histogram(result)
    story.append(Image(histogram_buffer, width=6*inch, height=3*inch))

    # Grid (as a table)
    # This can be very large. We'll skip it for now to ensure the PDF generates.
    # A full grid table would require careful pagination.

    doc.build(story)
    buffer.seek(0)
    return buffer
