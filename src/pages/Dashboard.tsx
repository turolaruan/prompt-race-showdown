import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { BarChart3, Trophy, TrendingUp, Download, Activity, Timer, Calendar, Cpu } from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { BenchmarkDetails, AnswerTypeStats } from "@/lib/mockBenchmarks";
import evalResultsArray from "../../eval_results_array.json";

interface EvalResultTask {
  total?: number;
  correct?: number;
  accuracy_percent?: number;
  by_answer_type?: Record<string, AnswerTypeStats> | null;
  model?: string;
  val_json?: string;
  mode?: string;
  generated_max_new_tokens?: number | null;
  stop_on_answer?: boolean | null;
  runtime_seconds?: number | null;
  avg_seconds_per_example?: number | null;
  out_dir?: string | null;
  created_at?: string | null;
}

type EvalResultRun = Record<string, EvalResultTask>;
type EvalResultEntry = Record<string, EvalResultRun>;

interface EvalResultsFile {
  eval_results?: EvalResultEntry[];
}

const KNOWN_TASKS = ["aqua_rat", "esnli", "gsm8k", "math_qa", "strategy_qa"];

const inferModelNameFromPath = (modelPath?: string | null): string | null => {
  if (!modelPath) return null;
  const parts = modelPath.split("/").filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    if (["grpo", "lora", "qlora", "outputs"].includes(parts[i]?.toLowerCase())) {
      const candidate = parts[i + 1];
      if (candidate && !candidate.includes(".")) {
        return candidate;
      }
    }
  }
  const fallback = parts.filter(segment => !!segment && !segment.includes(".")).pop();
  return fallback ?? null;
};

const inferTaskFromValJson = (valJson?: string | null): string | null => {
  if (!valJson) return null;
  const parts = valJson.split("/").filter(Boolean);
  const tasksIndex = parts.findIndex(part => part.toLowerCase() === "tasks");
  if (tasksIndex !== -1 && tasksIndex < parts.length - 1) {
    return parts[tasksIndex + 1] ?? null;
  }
  const lastSegment = parts.pop();
  if (!lastSegment) return null;
  const [task] = lastSegment.split(".");
  return task ?? null;
};

const inferTechniqueFromModelPath = (modelPath?: string | null): string | null => {
  if (!modelPath) return null;
  const lower = modelPath.toLowerCase();
  if (lower.includes("grpo") && (lower.includes("lora") || lower.includes("qlora"))) {
    return "Lora+GRPO";
  }
  if (lower.includes("grpo")) return "GRPO";
  if (lower.includes("qlora")) return "Lora/QLora";
  if (lower.includes("lora")) return "Lora/QLora";
  return "Modelo base";
};

const inferPartsFromRunKey = (runKey?: string | null) => {
  if (!runKey) return [];
  return runKey.split("__").filter(Boolean);
};

const inferTrainingTaskFromRunKey = (runKey?: string | null): string | null => {
  const parts = inferPartsFromRunKey(runKey);
  return parts[0] ?? null;
};

const inferModelFamilyFromRunKey = (runKey?: string | null): string | null => {
  const parts = inferPartsFromRunKey(runKey);
  return parts[1] ?? null;
};

const inferBenchmarkFromValJson = (valJson?: string | null): string | null => {
  if (!valJson) return null;
  const parts = valJson.split("/").filter(Boolean);
  const benchmarksIndex = parts.findIndex(part => part.toLowerCase() === "benchmarks");
  if (benchmarksIndex !== -1 && benchmarksIndex < parts.length - 1) {
    return parts[benchmarksIndex + 1] ?? null;
  }
  const tasksIndex = parts.findIndex(part => part.toLowerCase() === "tasks");
  if (tasksIndex !== -1 && tasksIndex < parts.length - 1) {
    return parts[tasksIndex + 1] ?? null;
  }
  const lastSegment = parts.pop();
  if (!lastSegment) return null;
  const [name] = lastSegment.split(".");
  return name ?? null;
};

const normalizeEvalResults = (data: EvalResultsFile): BenchmarkDetails[] => {
  if (!data?.eval_results || !Array.isArray(data.eval_results)) {
    return [];
  }

  const benchmarks: BenchmarkDetails[] = [];

  data.eval_results.forEach(entry => {
    Object.entries(entry ?? {}).forEach(([runKey, tasks]) => {
      Object.entries(tasks ?? {}).forEach(([taskName, taskDetails]) => {
        if (!taskDetails) return;

        const modelPath = taskDetails.model ?? "";
        const modelFamily = inferModelFamilyFromRunKey(runKey) ?? inferModelNameFromPath(modelPath);
        const trainingTask = inferTrainingTaskFromRunKey(runKey) ?? inferTaskFromValJson(taskDetails.val_json);
        const benchmarkName = taskName;
        const accuracyValue =
          typeof taskDetails.accuracy_percent === "number"
            ? taskDetails.accuracy_percent
            : Number(taskDetails.accuracy_percent ?? 0);
        const totalValue =
          typeof taskDetails.total === "number"
            ? taskDetails.total
            : Number(taskDetails.total ?? 0);
        const correctValue =
          typeof taskDetails.correct === "number"
            ? taskDetails.correct
            : Number(taskDetails.correct ?? 0);

        benchmarks.push({
          id: `${runKey}__${taskName}`,
          model_path: modelPath,
          model_name: runKey,
          model_family: modelFamily,
          task: trainingTask ?? null,
          benchmark_name: benchmarkName,
          technique: inferTechniqueFromModelPath(modelPath),
          created_at: taskDetails.created_at ?? null,
          total: Number.isFinite(totalValue) ? totalValue : 0,
          correct: Number.isFinite(correctValue) ? correctValue : 0,
          accuracy_percent: Number.isFinite(accuracyValue) ? accuracyValue : 0,
          by_answer_type: taskDetails.by_answer_type ?? null,
          mode: taskDetails.mode ?? "desconhecido",
          generated_max_new_tokens: taskDetails.generated_max_new_tokens ?? null,
          stop_on_answer: taskDetails.stop_on_answer ?? null,
          runtime_seconds: taskDetails.runtime_seconds ?? null,
          avg_seconds_per_example: taskDetails.avg_seconds_per_example ?? null,
          out_dir: taskDetails.out_dir ?? null,
          val_json: taskDetails.val_json ?? "",
        });
      });
    });
  });

  return benchmarks;
};

const Dashboard = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedModelFamily, setSelectedModelFamily] = useState<string>("all");
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("all");
  const [rankingOrder, setRankingOrder] = useState<"desc" | "asc">("desc");

  const resolveModelName = useCallback((benchmark: BenchmarkDetails) => {
    return benchmark.model_name ?? inferModelNameFromPath(benchmark.model_path) ?? "Modelo desconhecido";
  }, []);

  const resolveTask = useCallback((benchmark: BenchmarkDetails) => {
    if (benchmark.task) return benchmark.task;
    if (benchmark.model_name) {
      const taskFromRunKey = inferTrainingTaskFromRunKey(benchmark.model_name);
      if (taskFromRunKey) return taskFromRunKey;
    }
    return inferTaskFromValJson(benchmark.val_json) ?? "Tarefa desconhecida";
  }, []);

  // Export states
  const [selectedExportModels, setSelectedExportModels] = useState<string[]>([]);
  const [selectedExportTasks, setSelectedExportTasks] = useState<string[]>([]);
  const [selectedExportTechniques, setSelectedExportTechniques] = useState<string[]>([]);

  const availableModels = ["GPT-4", "Claude 3", "Gemini Pro", "LLaMA 3", "Mistral"];
  const availableTasks = ["Resumo", "Tradução", "Análise", "Criação", "Resposta"];
  const availableTechniques = ["Modelo base", "Lora/QLora", "GRPO", "Lora+GRPO"];

  const resolveModelFamily = useCallback((benchmark: BenchmarkDetails) => {
    if (benchmark.model_family) return benchmark.model_family;
    if (benchmark.model_name) return inferModelFamilyFromRunKey(benchmark.model_name) ?? benchmark.model_name;
    return inferModelNameFromPath(benchmark.model_path) ?? "Família desconhecida";
  }, []);

  const resolveTechnique = useCallback((benchmark: BenchmarkDetails) => {
    return benchmark.technique ?? inferTechniqueFromModelPath(benchmark.model_path) ?? "Técnica desconhecida";
  }, []);

  const resolveBenchmark = useCallback((benchmark: BenchmarkDetails) => {
    if (benchmark.benchmark_name) return benchmark.benchmark_name;
    const fromVal = inferBenchmarkFromValJson(benchmark.val_json);
    if (fromVal) return fromVal;
    if (benchmark.model_name) {
      const runParts = inferPartsFromRunKey(benchmark.model_name);
      return runParts[2] ?? runParts[0] ?? "Benchmark desconhecido";
    }
    return "Benchmark desconhecido";
  }, []);

  const loadBenchmarks = useCallback(() => {
    setIsLoading(true);

    try {
      const normalizedData = normalizeEvalResults(evalResultsArray as EvalResultsFile);
      if (normalizedData.length === 0) {
        toast({
          title: "Nenhum dado encontrado",
          description: "O arquivo eval_results_array.json não possui benchmarks disponíveis.",
          variant: "destructive",
        });
      }
      setBenchmarks(normalizedData);
    } catch (error) {
      console.error("Error loading benchmarks:", error);
      toast({
        title: "Erro ao carregar benchmarks",
        description: "Não foi possível processar os dados do arquivo local.",
        variant: "destructive",
      });
      setBenchmarks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBenchmarks();
  }, [loadBenchmarks]);

  const filteredBenchmarks = benchmarks.filter(b => {
    if (selectedTask !== "all" && resolveTask(b) !== selectedTask) return false;
    if (selectedModel !== "all" && resolveModelName(b) !== selectedModel) return false;
    if (selectedModelFamily !== "all" && resolveModelFamily(b) !== selectedModelFamily) return false;
    if (selectedTechnique !== "all" && resolveTechnique(b) !== selectedTechnique) return false;
    if (selectedBenchmark !== "all" && resolveBenchmark(b) !== selectedBenchmark) return false;
    return true;
  });

  const resolvedTasks = benchmarks
    .map(resolveTask)
    .filter((task): task is string => Boolean(task) && task !== "Tarefa desconhecida");
  const knownTasksInData = KNOWN_TASKS.filter(task => resolvedTasks.includes(task));
  const extraTasks = resolvedTasks.filter(task => !KNOWN_TASKS.includes(task));
  const uniqueExtraTasks = Array.from(new Set(extraTasks));
  const uniqueTasks = [...knownTasksInData, ...uniqueExtraTasks];
  const uniqueModels = Array.from(
    new Set(benchmarks.map(resolveModelName).filter((model): model is string => Boolean(model)))
  );
  const uniqueModelFamilies = Array.from(
    new Set(benchmarks.map(resolveModelFamily).filter((family): family is string => Boolean(family)))
  );
  const uniqueTechniques = Array.from(
    new Set(benchmarks.map(resolveTechnique).filter((tech): tech is string => Boolean(tech)))
  );
  const KNOWN_BENCHMARKS = ["bbh", "gpqa", "gsm8k_bench", "hendrycks_math", "mmlu"];
  const resolvedBenchmarks = benchmarks
    .map(resolveBenchmark)
    .filter((bench): bench is string => Boolean(bench) && bench !== "Benchmark desconhecido");
  const uniqueBenchmarks = KNOWN_BENCHMARKS.filter(bench => resolvedBenchmarks.includes(bench));

  const topModels = [...filteredBenchmarks]
    .sort((a, b) => b.accuracy_percent - a.accuracy_percent)
    .slice(0, 3);

  const orderedBenchmarks = [...filteredBenchmarks].sort((a, b) => {
    const diff = (a.accuracy_percent ?? 0) - (b.accuracy_percent ?? 0);
    return rankingOrder === "desc" ? -diff : diff;
  });

  const averageScore = filteredBenchmarks.length > 0
    ? (
        filteredBenchmarks.reduce((sum, b) => sum + (b.accuracy_percent ?? 0), 0) /
        filteredBenchmarks.length
      ).toFixed(2)
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
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AppSidebar />
      <div className="flex-1 px-4 py-6 sm:px-6 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-8 xl:max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard de Benchmarks</h1>
            <p className="text-muted-foreground">Análise de performance dos modelos em diferentes tarefas</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">Fonte: eval_results_array.json</p>
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
                {topModels.map((model, index) => {
                  const modelName = resolveModelName(model);
                  const taskLabel = formatLabel(resolveTask(model));
                  const accuracy = formatNumber(model.accuracy_percent);
                  return (
                    <div key={model.id} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{modelName}</p>
                        <p className="text-sm text-muted-foreground">{taskLabel}</p>
                      </div>
                      <Badge variant="default">
                        {accuracy !== "—" ? `${accuracy}%` : "—"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="flex-1">
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

          <div className="flex-1">
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

          <div className="flex-1">
            <Select value={selectedModelFamily} onValueChange={setSelectedModelFamily}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por família" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Famílias</SelectItem>
                {uniqueModelFamilies.map(family => (
                  <SelectItem key={family} value={family}>{family}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por técnica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Técnicas</SelectItem>
                {uniqueTechniques.map(technique => (
                  <SelectItem key={technique} value={technique}>{technique}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por benchmark" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Benchmarks</SelectItem>
                {uniqueBenchmarks.map(benchmark => (
                  <SelectItem key={benchmark} value={benchmark}>{benchmark}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={rankingOrder} onValueChange={value => setRankingOrder(value as "asc" | "desc")}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por ranking" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Ranking: Maior → Menor</SelectItem>
                <SelectItem value="asc">Ranking: Menor → Maior</SelectItem>
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
                {orderedBenchmarks.map((benchmark) => {
                  const answerType = getPrimaryAnswerType(benchmark);
                  const scoreDisplay = formatNumber(benchmark.accuracy_percent);
                  const accuracyDisplay = scoreDisplay;
                  const taskLabel = resolveTask(benchmark);
                  const benchmarkLabel = resolveBenchmark(benchmark);
                  const datasetLabel = [taskLabel, benchmarkLabel]
                    .filter(Boolean)
                    .map(label => formatLabel(label))
                    .join(" • ") || "Tarefa indisponível";
                  const modelName = resolveModelName(benchmark);
                  const techniqueLabel = resolveTechnique(benchmark);
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
                          <h3 className="text-xl font-semibold text-foreground">{modelName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {[datasetLabel]
                              .filter(Boolean)
                              .join(" • ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {techniqueLabel && techniqueLabel !== "Técnica desconhecida" && (
                            <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                              {techniqueLabel}
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
