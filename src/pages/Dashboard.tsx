import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BarChart3, Trophy, TrendingUp, Download, Activity, Timer, Calendar, Cpu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { mockBenchmarks, BenchmarkDetails } from "@/lib/mockBenchmarks";
import type { Database } from "@/integrations/supabase/types";

type BenchmarkRow = Database["public"]["Tables"]["benchmarks"]["Row"];

const Dashboard = () => {
  const isSupabaseConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );

  const [benchmarks, setBenchmarks] = useState<BenchmarkDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [useMockData, setUseMockData] = useState<boolean>(() => !isSupabaseConfigured);

  // Export states
  const [selectedExportModels, setSelectedExportModels] = useState<string[]>([]);
  const [selectedExportTasks, setSelectedExportTasks] = useState<string[]>([]);
  const [selectedExportTechniques, setSelectedExportTechniques] = useState<string[]>([]);

  const availableModels = ["GPT-4", "Claude 3", "Gemini Pro", "LLaMA 3", "Mistral"];
  const availableTasks = ["Resumo", "Tradução", "Análise", "Criação", "Resposta"];
  const availableTechniques = ["Modelo base", "Lora/QLora", "GRPO", "Lora+GRPO"];

  const loadBenchmarks = useCallback(async () => {
    setIsLoading(true);

    if (useMockData) {
      setBenchmarks(mockBenchmarks);
      setIsLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      toast({
        title: "Configuração necessária",
        description: "Defina as credenciais do Supabase para carregar os dados reais.",
        variant: "destructive",
      });
      setBenchmarks([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .order("score", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setBenchmarks([]);
        return;
      }

      const normalizedData: BenchmarkDetails[] = data.map((item: BenchmarkRow) => ({
        ...item,
      }));

      setBenchmarks(normalizedData);
    } catch (error) {
      console.error("Error loading benchmarks:", error);
      toast({
        title: "Erro ao carregar benchmarks",
        description: "Não foi possível carregar os dados do Supabase.",
        variant: "destructive",
      });
      setBenchmarks([]);
    } finally {
      setIsLoading(false);
    }
  }, [useMockData, isSupabaseConfigured]);

  useEffect(() => {
    loadBenchmarks();
  }, [loadBenchmarks]);

  const filteredBenchmarks = benchmarks.filter(b => {
    if (selectedTask !== "all" && b.task_type !== selectedTask) return false;
    if (selectedModel !== "all" && b.model_name !== selectedModel) return false;
    return true;
  });

  const uniqueTasks = Array.from(new Set(benchmarks.map(b => b.task_type)));
  const uniqueModels = Array.from(new Set(benchmarks.map(b => b.model_name)));

  const topModels = [...filteredBenchmarks]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const averageScore = filteredBenchmarks.length > 0
    ? (filteredBenchmarks.reduce((sum, b) => sum + b.score, 0) / filteredBenchmarks.length).toFixed(2)
    : "0";

  const formatNumber = (value?: number | null, fractionDigits = 2) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "—";
    }
    return value.toFixed(fractionDigits);
  };

  const formatLabel = (value?: string | null, fallback = "—") => {
    if (!value) return fallback;
    return value
      .split(/[_-]/)
      .filter(Boolean)
      .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(" ");
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "—";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }
    return parsed.toLocaleDateString();
  };

  const getPrimaryAnswerType = (benchmark: BenchmarkDetails) => {
    if (!benchmark.by_answer_type) return null;
    const [label, stats] = Object.entries(benchmark.by_answer_type)[0] ?? [];
    if (!label || !stats) return null;
    return { label, stats };
  };

  const toggleSelection = (item: string, list: string[], setList: (list: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleExport = () => {
    if (selectedExportModels.length === 0 || selectedExportTasks.length === 0 || selectedExportTechniques.length === 0) {
      toast({
        title: "Seleção incompleta",
        description: "Por favor, selecione pelo menos um modelo, uma tarefa e uma técnica.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Exportando modelo",
      description: `Exportando ${selectedExportModels.length} modelo(s) com ${selectedExportTechniques.length} técnica(s) para ${selectedExportTasks.length} tarefa(s).`
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 p-8">
        <div className="mx-auto max-w-6xl space-y-8 xl:max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard de Benchmarks</h1>
            <p className="text-muted-foreground">Análise de performance dos modelos em diferentes tarefas</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="dashboard-data-mode"
                checked={useMockData}
                onCheckedChange={setUseMockData}
              />
              <Label htmlFor="dashboard-data-mode" className="text-sm font-medium cursor-pointer">
                {useMockData ? "Modo Mock" : "Banco de Dados"}
              </Label>
            </div>
            <BarChart3 className="h-12 w-12 text-primary" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Benchmarks</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBenchmarks.length}</div>
              <p className="text-xs text-muted-foreground">Resultados registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}</div>
              <p className="text-xs text-muted-foreground">Média geral de performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Avaliados</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueModels.length}</div>
              <p className="text-xs text-muted-foreground">Diferentes modelos</p>
            </CardContent>
          </Card>
        </div>

        {/* Top 3 Models */}
        {topModels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Modelos (Filtros Aplicados)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topModels.map((model, index) => (
                  <div key={model.id} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{model.model_name}</p>
                      <p className="text-sm text-muted-foreground">{formatLabel(model.task_type)}</p>
                    </div>
                    <Badge variant="default">{formatNumber(model.score)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tarefa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tarefas</SelectItem>
                {uniqueTasks.map(task => (
                  <SelectItem key={task} value={task}>{task}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Modelos</SelectItem>
                {uniqueModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Benchmarks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredBenchmarks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum benchmark encontrado.</p>
                <p className="text-sm mt-2">Faça upload de dados na página Admin.</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredBenchmarks.map((benchmark) => {
                  const answerType = getPrimaryAnswerType(benchmark);
                  const scoreDisplay = formatNumber(benchmark.score);
                  const accuracyDisplay =
                    typeof benchmark.accuracy_percent === "number"
                      ? formatNumber(benchmark.accuracy_percent)
                      : scoreDisplay;
                  const datasetLabel = formatLabel(benchmark.dataset, "Dataset indisponível");
                  const runtimeDisplay =
                    typeof benchmark.runtime_seconds === "number"
                      ? `${formatNumber(benchmark.runtime_seconds, 2)} s`
                      : "—";
                  const avgRuntimeDisplay =
                    typeof benchmark.avg_seconds_per_example === "number"
                      ? `${formatNumber(benchmark.avg_seconds_per_example, 2)} s`
                      : "—";
                  const tokensDisplay =
                    typeof benchmark.generated_max_new_tokens === "number"
                      ? benchmark.generated_max_new_tokens.toString()
                      : "—";
                  const stopBadge = typeof benchmark.stop_on_answer === "boolean"
                    ? benchmark.stop_on_answer
                      ? "Pára quando responde"
                      : "Completa saída"
                    : null;

                  return (
                    <div
                      key={benchmark.id}
                      className="rounded-xl border border-border/60 bg-card/50 p-6 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-xl font-semibold text-foreground">{benchmark.model_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {[formatLabel(benchmark.task_type), datasetLabel]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {benchmark.technique && (
                            <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                              {benchmark.technique}
                            </Badge>
                          )}
                          <Badge variant="default" className="text-lg px-3 py-1 font-semibold">
                            {scoreDisplay !== "—" ? `${scoreDisplay}%` : "Score não disponível"}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(benchmark.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Timer className="h-4 w-4" />
                          {runtimeDisplay}
                        </span>
                        <span className="flex items-center gap-1">
                          <Cpu className="h-4 w-4" />
                          Tokens máx: {tokensDisplay}
                        </span>
                        {benchmark.mode && (
                          <span className="flex items-center gap-1">
                            <Activity className="h-4 w-4" />
                            Modo: {formatLabel(benchmark.mode)}
                          </span>
                        )}
                        {stopBadge && (
                          <Badge variant="outline" className="border-dashed text-[11px]">
                            {stopBadge}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Activity className="h-3.5 w-3.5" />
                                Accuracy
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {accuracyDisplay !== "—" ? `${accuracyDisplay}%` : "—"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Trophy className="h-3.5 w-3.5" />
                                Acertos
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {typeof benchmark.correct === "number" ? benchmark.correct : "—"}
                                <span className="ml-1 text-sm font-normal text-muted-foreground">
                                  / {typeof benchmark.total === "number" ? benchmark.total : "—"}
                                </span>
                              </p>
                            </div>
                          </div>

                          {answerType && (
                            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                              <p className="text-xs font-medium uppercase text-muted-foreground">
                                {formatLabel(answerType.label)} (por tipo de resposta)
                              </p>
                              <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase">Total</p>
                                  <p className="font-semibold text-foreground">{answerType.stats.total}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase">Corretas</p>
                                  <p className="font-semibold text-foreground">{answerType.stats.correct}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase">Acc</p>
                                  <p className="font-semibold text-foreground">
                                    {formatNumber(answerType.stats.acc)}%
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Timer className="h-3.5 w-3.5" />
                                Tempo total
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">{runtimeDisplay}</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Timer className="h-3.5 w-3.5" />
                                Tempo / exemplo
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">{avgRuntimeDisplay}</p>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Model Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Exportação de Modelo</CardTitle>
            <p className="text-sm text-muted-foreground">Selecione um modelo para exportar:</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Models */}
            <div>
              <h3 className="text-sm font-medium mb-3">Modelos:</h3>
              <div className="flex flex-wrap gap-2">
                {availableModels.map(model => (
                  <Badge
                    key={model}
                    variant={selectedExportModels.includes(model) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSelection(model, selectedExportModels, setSelectedExportModels)}
                  >
                    {model}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="text-sm font-medium mb-3">Tarefa:</h3>
              <div className="flex flex-wrap gap-2">
                {availableTasks.map(task => (
                  <Badge
                    key={task}
                    variant={selectedExportTasks.includes(task) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSelection(task, selectedExportTasks, setSelectedExportTasks)}
                  >
                    {task}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Techniques */}
            <div>
              <h3 className="text-sm font-medium mb-3">Técnica:</h3>
              <div className="flex flex-wrap gap-2">
                {availableTechniques.map(technique => (
                  <Badge
                    key={technique}
                    variant={selectedExportTechniques.includes(technique) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSelection(technique, selectedExportTechniques, setSelectedExportTechniques)}
                  >
                    {technique}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Export Button */}
            <Button onClick={handleExport} className="w-full gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
  );
};

export default Dashboard;
