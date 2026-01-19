"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/image-upload";
import { ResultsPanel } from "@/components/results-panel";
import { type AnalysisResult } from "@/lib/types"; // Updated import
import { Microscope, Play, Settings, Info, Loader2 } from "lucide-react";

export default function DICEAnalyzer() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const [material, setMaterial] = useState("П-234");
  const [magnification, setMagnification] = useState("10000x");
  const [gridSize, setGridSize] = useState(15);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleImageLoad = useCallback((_imageData: ImageData, width: number, height: number, url: string, file: File) => {
    setImageFile(file);
    setImageUrl(url);
    setImageDimensions({ width, height });
    setResult(null);
  }, []);

  const handleClearImage = useCallback(() => {
    setImageFile(null);
    setImageUrl(null);
    setImageDimensions({ width: 0, height: 0 });
    setResult(null);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!imageFile) return;

    setIsAnalyzing(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("material", material);
    formData.append("magnification", magnification);
    formData.append("grid_size", String(gridSize));

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const analysisResult: AnalysisResult = await response.json();
      setResult(analysisResult);

    } catch (error) {
      console.error("Analysis error:", error);
      alert(`Ошибка анализа: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile, gridSize, material, magnification]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Microscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">DICE Analyzer</h1>
              <p className="text-xs text-muted-foreground">Информационно-энтропийный анализ</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">v1.0.0</span>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* Sidebar - Controls */}
          <div className="space-y-4">
            {/* Image Upload Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Microscope className="h-4 w-4" />
                  СЭМ-изображение
                </CardTitle>
                <CardDescription>
                  Загрузите микрофотографию композита
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  onImageLoad={handleImageLoad}
                  currentImage={imageUrl}
                  onClear={handleClearImage}
                />
                {imageUrl && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {imageDimensions.width} x {imageDimensions.height} px
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Settings Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Параметры анализа
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Material Selection */}
                <div className="space-y-2">
                  <Label htmlFor="material">Марка технического углерода</Label>
                  <Select value={material} onValueChange={setMaterial}>
                    <SelectTrigger id="material">
                      <SelectValue placeholder="Выберите марку ТУ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="П-234">П-234</SelectItem>
                      <SelectItem value="П-324">П-324</SelectItem>
                      <SelectItem value="П-366Э">П-366Э</SelectItem>
                      <SelectItem value="П-367Э">П-367Э</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Magnification Selection */}
                <div className="space-y-2">
                  <Label htmlFor="magnification">Кратность увеличения</Label>
                  <Select value={magnification} onValueChange={setMagnification}>
                    <SelectTrigger id="magnification">
                      <SelectValue placeholder="Выберите увеличение" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5000x">5 000x</SelectItem>
                      <SelectItem value="10000x">10 000x</SelectItem>
                      <SelectItem value="20000x">20 000x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Grid Size */}
                <div className="space-y-2">
                  <Label htmlFor="gridSize">Размер сетки (N x N)</Label>
                  <Input
                    id="gridSize"
                    type="number"
                    min={5}
                    max={50}
                    value={gridSize}
                    onChange={(e) => setGridSize(Math.max(5, Math.min(50, parseInt(e.target.value) || 15)))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Всего ячеек: {gridSize * gridSize}
                  </p>
                </div>

                {/* Analyze Button */}
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!imageUrl || isAnalyzing}
                  onClick={runAnalysis}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Анализ...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Запустить расчет
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  О методе
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>
                    <strong>DICE</strong> - метод оценки однородности распределения 
                    технического углерода в композитах на основе информационно-энтропийного анализа.
                  </p>
                  <p>
                    Критерий <strong>D_IEI</strong> показывает процент ячеек, 
                    концентрация ТУ в которых попадает в информационно-энтропийный интервал [A1, A2].
                  </p>
                  <div className="pt-2 space-y-1">
                    <p className="flex justify-between">
                      <span className="text-green-500">D_IEI &ge; 95%</span>
                      <span>Высокая</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-yellow-500">85% &le; D_IEI &lt; 95%</span>
                      <span>Достаточная</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-orange-500">70% &le; D_IEI &lt; 85%</span>
                      <span>Низкая</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-red-500">D_IEI &lt; 70%</span>
                      <span>Брак</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Results */}
          <div>
            {result && imageUrl ? (
              <ResultsPanel result={result} imageUrl={imageUrl} />
            ) : (
              <Card className="h-full min-h-[500px] flex items-center justify-center">
                <CardContent className="text-center">
                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                    <Microscope className="h-16 w-16 opacity-20" />
                    <div>
                      <p className="text-lg font-medium">Результаты анализа</p>
                      <p className="text-sm">
                        Загрузите СЭМ-изображение и нажмите "Запустить расчет"
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-8">
        <div className="container px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            DICE Analyzer - Информационно-энтропийный метод оценки однородности технического углерода в композитах
          </p>
        </div>
      </footer>
    </div>
  );
}
