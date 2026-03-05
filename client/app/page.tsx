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
import { Microscope, Play, Settings, Info, Loader2, Key } from "lucide-react";
import { useLicense } from "@/components/license-provider";
import { API_BASE_URL } from "@/lib/config";

export default function DICEAnalyzer() {
  const { isActivated, hwid, usageCount, trialLimit, isTrialExpired, activate, incrementUsage, copyToClipboard } = useLicense();
  const [activationKey, setActivationKey] = useState("");
  const [isActivating, setIsActivating] = useState(false);

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
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const analysisResult: AnalysisResult = await response.json();
      setResult(analysisResult);

      // Increment usage count after successful analysis
      await incrementUsage();

    } catch (error) {
      console.error("Analysis error:", error);
      alert(`Ошибка анализа: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [imageFile, gridSize, material, magnification]);

  const handleActivate = async () => {
    setIsActivating(true);
    const success = await activate(activationKey);
    setIsActivating(false);
    if (!success) {
      alert("Неверный ключ активации");
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      {/* Trial period indicator */}
      {!isActivated && !isTrialExpired && (
        <div className="bg-amber-500 text-amber-950 px-4 py-1 text-xs font-medium text-center">
          ПРОБНЫЙ ПЕРИОД: осталось {trialLimit - usageCount} анализов из {trialLimit}.
        </div>
      )}

      {/* Activation Overlay (only when trial is expired and not activated) */}
      {!isActivated && isTrialExpired && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl border-primary">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Активация программы</CardTitle>
              <CardDescription>
                Пробный период закончен. Для дальнейшего использования необходимо ввести лицензионный ключ.
                Отправьте ваш ID разработчику для получения ключа.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Ваш Hardware ID (HWID)</Label>
                <div className="flex gap-2">
                  <Input readOnly value={hwid} className="bg-muted font-mono text-xs" />
                  <Button variant="outline" size="sm" onClick={async () => {
                    await copyToClipboard(hwid);
                    alert("ID скопирован в буфер обмена");
                  }}>
                    Копировать
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">Ключ активации</Label>
                <Input
                  id="key"
                  placeholder="Введите ключ"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleActivate} disabled={!activationKey || isActivating}>
                {isActivating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Активировать
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Watermark (visible if not activated) */}
      {!isActivated && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden flex flex-wrap justify-center items-center gap-20 opacity-[0.03] rotate-[-30deg] scale-150">
          {Array.from({ length: 50 }).map((_, i) => (
            <span key={i} className="text-4xl font-bold whitespace-nowrap">DEMO VERSION - UNLICENSED</span>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Microscope className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">DICE Analyzer</h1>
            <p className="text-xs text-muted-foreground">Информационно-энтропийный анализ</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">v1.0.0</span>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6">
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
        <div className="px-4 py-4">
          <p className="text-xs text-muted-foreground text-center">
            DICE Analyzer - Информационно-энтропийный метод оценки однородности технического углерода в композитах
          </p>
        </div>
      </footer>
    </div>
  );
}
