import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { CellData, AnalysisResult } from "./types";
import { jsPDF } from "jspdf";
import "jspdf-autotable"; // This extends jsPDF with autoTable method

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function downloadCsv(cells: CellData[], filename: string) {
  if (!cells || cells.length === 0) {
    console.error("No data to download.");
    return;
  }

  const header = "Row,Column,Brightness,Concentration,InInterval\n";
  const csvRows = cells.map(cell => 
    `${cell.row + 1},${cell.col + 1},${cell.brightness.toFixed(2)},${cell.concentration.toFixed(2)},${cell.in_interval}`
  );
  
  const csvContent = header + csvRows.join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

export function generatePdfReport(result: AnalysisResult, imageUrl: string, filename: string) {
  const doc = new jsPDF();

  // To support Cyrillic characters, a custom font usually needs to be embedded.
  // For simplicity, using a generic font that might not display all Cyrillic chars correctly by default.
  // Full support would require:
  // 1. Importing font files (e.g., Arial.ttf)
  // 2. doc.addFont('Arial.ttf', 'Arial', 'normal');
  // 3. doc.setFont('Arial');
  // doc.addFont("ArialMS", "Arial", "normal"); // Example if font is already added
  // doc.setFont("Arial"); // Set font

  // Title
  doc.setFontSize(18);
  doc.text("DICE Analyzer: Отчет по анализу однородности", 10, 10);

  // General Info
  doc.setFontSize(12);
  doc.text(`Дата отчета: ${new Date().toLocaleDateString()}`, 10, 20);
  doc.text(`Размер изображения: ${result.image_width} x ${result.image_height} px`, 10, 26);
  doc.text(`Размер сетки: ${result.grid_size} x ${result.grid_size} (${result.total_cells} ячеек)`, 10, 32);
  doc.text(`Материал: ${result.material}`, 10, 38);
  // Add magnification, if available in result
  doc.text(`Кратность увеличения: ${result.magnification || 'N/A'}`, 10, 44);


  // Summary Table
  doc.setFontSize(14);
  doc.text("Основные результаты", 10, 56);
  doc.autoTable({
    startY: 60,
    head: [['Параметр', 'Значение']],
    body: [
      ['D_IEI', `${result.d_iei.toFixed(1)}%`],
      ['M[X] (среднее)', `${result.mean_concentration.toFixed(2)}%`],
      ['H(P) (энтропия)', `${result.entropy.toFixed(3)} бит`],
      ['Δ (полуширина)', `${result.delta.toFixed(2)}%`],
      ['A1 (левая граница)', `${result.a1.toFixed(2)}%`],
      ['A2 (правая граница)', `${result.a2.toFixed(2)}%`],
      ['Ячеек в интервале', `${result.cells_in_interval} из ${result.total_cells}`],
      ['Степень однородности', result.homogeneity_grade],
      ['Заключение', result.verdict],
    ],
    theme: 'grid',
    styles: { font: "helvetica", fontStyle: "normal" }, // Use helvetica as it's default and supports basic Latin. Cyrillic support requires custom fonts.
    headStyles: { fillColor: [22, 163, 74] }, // Green-ish color
  });

  // Suitability
  const suitabilityY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text("Заключение для применения", 10, suitabilityY);
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(result.suitability, 180); // 180mm width
  doc.text(splitText, 10, suitabilityY + 6);

  // Placeholder for charts (will be implemented later)
  // To include images of charts, you would need to convert your chart components to images (e.g., base64 data URLs)
  // For example: doc.addImage(chartDataUrl, 'PNG', 10, nextY, 180, 100);

  doc.save(filename);
}