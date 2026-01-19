import { downloadCsv, generatePdfReport } from "@/lib/utils";
import { useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HistogramChart } from "@/components/histogram-chart";
import { GridVisualization } from "@/components/grid-visualization";
import { CellsDataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import type { AnalysisResult } from "@/lib/types";
import { BarChart3, Grid3X3, FileText, CheckCircle2, XCircle, AlertTriangle, Table, Download } from "lucide-react";

interface ResultsPanelProps {
  result: AnalysisResult;
  imageUrl: string;
}

function getVerdictIcon(d_iei: number) {
  if (d_iei >= 95) return <CheckCircle2 className="h-6 w-6 text-green-500" />;
  if (d_iei >= 85) return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
  return <XCircle className="h-6 w-6 text-red-500" />;
}

function getVerdictColor(d_iei: number) {
  if (d_iei >= 95) return "bg-green-500/10 text-green-500 border-green-500/20";
  if (d_iei >= 85) return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
  if (d_iei >= 70) return "bg-orange-500/10 text-orange-500 border-orange-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

function getProgressColor(d_iei: number) {
  if (d_iei >= 95) return "bg-green-500";
  if (d_iei >= 85) return "bg-yellow-500";
  if (d_iei >= 70) return "bg-orange-500";
  return "bg-red-500";
}

export function ResultsPanel({ result, imageUrl }: ResultsPanelProps) {
  const handleDownloadCsv = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadCsv(result.cells, `dice-analysis-data-${timestamp}.csv`);
  }, [result.cells]);

  const handleDownloadPdf = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    generatePdfReport(result, imageUrl, `dice-analysis-report-${timestamp}.pdf`);
  }, [result, imageUrl]);

  return (
    <Tabs defaultValue="analysis" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="analysis" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Анализ</span>
        </TabsTrigger>
        <TabsTrigger value="histogram" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Гистограмма</span>
        </TabsTrigger>
        <TabsTrigger value="grid" className="flex items-center gap-2">
          <Grid3X3 className="h-4 w-4" />
          <span className="hidden sm:inline">Сетка</span>
        </TabsTrigger>
        <TabsTrigger value="datatable" className="flex items-center gap-2">
          <Table className="h-4 w-4" />
          <span className="hidden sm:inline">Таблица</span>
        </TabsTrigger>
      </TabsList>

      {/* Analysis Tab */}
      <TabsContent value="analysis" className="mt-4 space-y-4">
        {/* Main D_IEI Result */}
        <Card className={`border-2 ${getVerdictColor(result.d_iei)}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-3">
                {getVerdictIcon(result.d_iei)}
                <div>
                  <p className="text-sm text-muted-foreground">Критерий однородности D_IEI</p>
                  <p className="text-5xl font-bold tracking-tight">
                    {result.d_iei.toFixed(1)}%
                  </p>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full max-w-md">
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(result.d_iei)} transition-all duration-500`}
                    style={{ width: `${Math.min(100, result.d_iei)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0%</span>
                  <span className="text-yellow-500">70%</span>
                  <span className="text-green-500">85%</span>
                  <span className="text-green-600">95%</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="space-y-2">
                <Badge variant="outline" className={`text-lg px-4 py-1 ${getVerdictColor(result.d_iei)}`}>
                  {result.homogeneity_grade}
                </Badge>
                <p className="text-xl font-semibold">{result.verdict}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suitability */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Заключение для применения</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.suitability}
            </p>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">M[X] (среднее)</p>
              <p className="text-2xl font-bold">{result.mean_concentration.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">H(P) (энтропия)</p>
              <p className="text-2xl font-bold">{result.entropy.toFixed(3)}</p>
              <p className="text-xs text-muted-foreground">бит</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Delta (полуширина)</p>
              <p className="text-2xl font-bold">{result.delta.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">%</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground">Sigma (СКО)</p>
              <p className="text-2xl font-bold">{result.std_concentration.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">%</p>
            </CardContent>
          </Card>
        </div>

        {/* Interval Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Информационно-энтропийный интервал (ИЭИ)</CardTitle>
            <CardDescription>
              Границы допустимого разброса концентрации
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-muted-foreground">A1 (левая граница)</p>
                <p className="text-xl font-bold text-blue-500">{result.a1.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-muted-foreground">M[X] (среднее)</p>
                <p className="text-xl font-bold text-amber-500">{result.mean_concentration.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <p className="text-xs text-muted-foreground">A2 (правая граница)</p>
                <p className="text-xl font-bold text-blue-500">{result.a2.toFixed(2)}%</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ячеек в интервале: <span className="font-semibold text-foreground">{result.cells_in_interval}</span> из <span className="font-semibold text-foreground">{result.total_cells}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Statistics */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Дополнительные параметры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Размер изображения</span>
                <span className="font-medium">{result.image_width} x {result.image_height} px</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Размер сетки</span>
                <span className="font-medium">{result.grid_size} x {result.grid_size}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Асимметрия (Skewness)</span>
                <span className="font-medium">{result.skewness.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Эксцесс (Kurtosis)</span>
                <span className="font-medium">{result.kurtosis.toFixed(3)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Макс. энтропия H_max</span>
                <span className="font-medium">{result.max_entropy.toFixed(3)} бит</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Отношение H/H_max</span>
                <span className="font-medium">{(result.entropy / result.max_entropy * 100).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Histogram Tab */}
      <TabsContent value="histogram" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Гистограмма распределения концентрации ТУ</CardTitle>
            <CardDescription>
              Зеленым отмечены бины, попадающие в информационно-энтропийный интервал [A1, A2].
              Вертикальные линии: синие пунктирные - границы A1 и A2, оранжевая - математическое ожидание M[X].
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HistogramChart
              histogram={result.histogram}
              mean_concentration={result.mean_concentration}
              a1={result.a1}
              a2={result.a2}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Grid Tab */}
      <TabsContent value="grid" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Сетка анализа изображения</CardTitle>
            <CardDescription>
              Красным выделены ячейки, концентрация ТУ в которых выходит за пределы 
              информационно-энтропийного интервала [A1, A2]. Наведите курсор на ячейку для просмотра данных.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GridVisualization
              imageUrl={imageUrl}
              cells={result.cells}
              gridSize={result.grid_size}
              a1={result.a1}
              a2={result.a2}
            />
          </CardContent>
        </Card>
      </TabsContent>

      {/* Data Table Tab */}
      <TabsContent value="datatable" className="mt-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Таблица данных по ячейкам</CardTitle>
                <CardDescription>
                  Полная таблица с данными по каждой из {result.total_cells} ячеек.
                </CardDescription>
              </div>
              <div className="flex gap-2"> {/* Group buttons */}
                <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                  <Download className="h-4 w-4 mr-2" />
                  Скачать CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                  <FileText className="h-4 w-4 mr-2" />
                  Скачать PDF
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <CellsDataTable data={result.cells} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
