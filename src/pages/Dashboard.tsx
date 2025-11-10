import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3,
  Trophy,
  TrendingUp,
  Download,
  Activity,
  Timer,
  Calendar,
  Cpu,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  ListOrdered,
} from "lucide-react";
import AppSidebar from "@/components/AppSidebar";
import { BenchmarkDetails, AnswerTypeStats } from "@/lib/mockBenchmarks";
import evalResultsArray from "../../eval_results_array.json";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
const KNOWN_MODEL_FAMILIES = [
  "Llama-3.2-3B-Instruct",
  "Phi-4-mini-instruct",
  "Qwen3-4B-Instruct-2507",
  "gemma-3-4b-it",
];
const ITEMS_PER_PAGE = 5;
const MAX_HEATMAP_BENCHMARKS = 10;
const DASHBOARD_CONTAINER = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-16";

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
  const { collapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebar();
  const [benchmarks, setBenchmarks] = useState<BenchmarkDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [selectedModelFamily, setSelectedModelFamily] = useState<string>("all");
  const [selectedTechnique, setSelectedTechnique] = useState<string>("all");
  const [selectedBenchmark, setSelectedBenchmark] = useState<string>("all");
  const [rankingOrder, setRankingOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [selectedAverageModel, setSelectedAverageModel] = useState<string | null>(null);
  const [benchmarkViewMode, setBenchmarkViewMode] = useState<"list" | "models">("list");
  const isListView = benchmarkViewMode === "list";
  const isModelView = benchmarkViewMode === "models";

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

  const passesFilters = useCallback(
    (benchmark: BenchmarkDetails, options?: { ignoreBenchmark?: boolean }) => {
      if (selectedTask !== "all" && resolveTask(benchmark) !== selectedTask) return false;
      if (selectedModel !== "all" && resolveModelName(benchmark) !== selectedModel) return false;
      if (selectedModelFamily !== "all" && resolveModelFamily(benchmark) !== selectedModelFamily) return false;
      if (selectedTechnique !== "all" && resolveTechnique(benchmark) !== selectedTechnique) return false;
      if (!options?.ignoreBenchmark && selectedBenchmark !== "all" && resolveBenchmark(benchmark) !== selectedBenchmark) return false;
      return true;
    },
    [
      selectedTask,
      selectedModel,
      selectedModelFamily,
      selectedTechnique,
      selectedBenchmark,
      resolveTask,
      resolveModelName,
      resolveModelFamily,
      resolveTechnique,
      resolveBenchmark,
    ]
  );

  const filteredBenchmarks = useMemo(() => benchmarks.filter(b => passesFilters(b)), [benchmarks, passesFilters]);
  const benchmarksForAverages = useMemo(
    () => benchmarks.filter(b => passesFilters(b, { ignoreBenchmark: true })),
    [benchmarks, passesFilters]
  );

  const formatNumber = (value?: number | null, fractionDigits = 2) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "—";
    }
    return new Intl.NumberFormat("pt-BR", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  };

  const formatPercentage = (value?: number | null) => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "—";
    }
    return `${formatNumber(value, 2)}%`;
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

  const normalizeAccuracyValue = (value?: number | null): number | null => {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return null;
    }
    return Math.max(0, Math.min(value, 100));
  };


  const resolvedTasks = benchmarks
    .map(resolveTask)
    .filter((task): task is string => Boolean(task) && task !== "Tarefa desconhecida");
  const knownTasksInData = KNOWN_TASKS.filter(task => resolvedTasks.includes(task));
  const extraTasks = resolvedTasks.filter(task => !KNOWN_TASKS.includes(task));
  const uniqueExtraTasks = Array.from(new Set(extraTasks));
  const uniqueTasks = [...knownTasksInData, ...uniqueExtraTasks];
  const uniqueModels = useMemo(() => {
    const models = benchmarks.map(benchmark => {
      const name = resolveModelName(benchmark);
      const familyRaw = resolveModelFamily(benchmark);
      const taskRaw = resolveTask(benchmark);
      const family =
        familyRaw && familyRaw !== "Família desconhecida" ? familyRaw : KNOWN_MODEL_FAMILIES.find(item => item === name);
      return { name, family, task: taskRaw };
    });

    const filteredByFamily =
      selectedModelFamily === "all"
        ? models
        : models.filter(model => {
          if (!model.family) return false;
          return model.family.toLowerCase() === selectedModelFamily.toLowerCase();
        });

    const filteredByTask =
      selectedTask === "all"
        ? filteredByFamily
        : filteredByFamily.filter(model => {
            if (!model.task || model.task === "Tarefa desconhecida") return false;
            return model.task.toLowerCase() === selectedTask.toLowerCase();
          });

    return Array.from(
      new Set(filteredByTask.map(model => model.name).filter((model): model is string => Boolean(model)))
    );
  }, [benchmarks, selectedModelFamily, selectedTask]);

  useEffect(() => {
    if (selectedModelFamily === "all" && selectedTask === "all") return;
    if (selectedModel === "all") return;
    if (!uniqueModels.includes(selectedModel)) {
      setSelectedModel("all");
    }
  }, [selectedModelFamily, selectedTask, selectedModel, uniqueModels]);
  const uniqueModelFamilies = Array.from(
    new Set(benchmarks.map(resolveModelFamily).filter((family): family is string => Boolean(family)))
  );

  const uniqueTechniques = useMemo(() => {
    const techniques = benchmarks.map(benchmark => {
      const technique = resolveTechnique(benchmark);
      const family = resolveModelFamily(benchmark);
      const task = resolveTask(benchmark);
      const modelName = resolveModelName(benchmark);
      return {
        technique,
        family,
        task,
        modelName,
      };
    });

    const filteredByFamily =
      selectedModelFamily === "all"
        ? techniques
        : techniques.filter(item => {
            if (!item.family) return false;
            return item.family.toLowerCase() === selectedModelFamily.toLowerCase();
          });

    const filteredByTask =
      selectedTask === "all"
        ? filteredByFamily
        : filteredByFamily.filter(item => {
            if (!item.task || item.task === "Tarefa desconhecida") return false;
            return item.task.toLowerCase() === selectedTask.toLowerCase();
          });

    const filteredByModel =
      selectedModel === "all"
        ? filteredByTask
        : filteredByTask.filter(item => {
            if (!item.modelName) return false;
            return item.modelName === selectedModel;
          });

    return Array.from(
      new Set(filteredByModel.map(item => item.technique).filter((tech): tech is string => Boolean(tech)))
    );
  }, [benchmarks, selectedModelFamily, selectedTask, selectedModel, resolveTechnique, resolveModelFamily, resolveTask, resolveModelName]);
  const KNOWN_BENCHMARKS = ["bbh", "gpqa", "gsm8k_bench", "hendrycks_math", "mmlu"];
  const resolvedBenchmarks = benchmarks
    .map(resolveBenchmark)
    .filter((bench): bench is string => Boolean(bench) && bench !== "Benchmark desconhecido");
  const uniqueBenchmarks = KNOWN_BENCHMARKS.filter(bench => resolvedBenchmarks.includes(bench));

  const topModels = [...filteredBenchmarks]
    .sort((a, b) => b.accuracy_percent - a.accuracy_percent)
    .slice(0, 3);

  const rankThemes = [
    {
      card: "border-primary/50 bg-gradient-to-br from-primary/20 via-primary/5 to-background/90 shadow-[0_42px_140px_-80px_rgba(147,51,234,0.55)]",
      glow: "bg-primary/45",
      circle: "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white",
      badge: "bg-gradient-to-r from-fuchsia-400 via-fuchsia-500 to-purple-500 text-white shadow-[0_18px_48px_-28px_rgba(236,72,153,0.6)]",
    },
    {
      card: "border-purple-500/45 bg-gradient-to-br from-purple-500/18 via-indigo-500/10 to-background/95 shadow-[0_38px_130px_-85px_rgba(168,85,247,0.5)]",
      glow: "bg-purple-400/45",
      circle: "bg-gradient-to-br from-purple-500 to-indigo-500 text-white",
      badge: "bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 text-white/90 shadow-[0_16px_44px_-26px_rgba(168,85,247,0.5)]",
    },
    {
      card: "border-indigo-500/45 bg-gradient-to-br from-indigo-500/18 via-blue-500/10 to-background/95 shadow-[0_34px_120px_-85px_rgba(59,130,246,0.45)]",
      glow: "bg-indigo-400/45",
      circle: "bg-gradient-to-br from-indigo-500 to-blue-500 text-white",
      badge: "bg-gradient-to-r from-indigo-400 via-blue-500 to-cyan-500 text-white/90 shadow-[0_14px_36px_-24px_rgba(59,130,246,0.45)]",
    },
  ];

  const orderedBenchmarks = useMemo(() => {
    const sorted = [...filteredBenchmarks].sort((a, b) => {
      const diff = (a.accuracy_percent ?? 0) - (b.accuracy_percent ?? 0);
      return rankingOrder === "desc" ? -diff : diff;
    });
    return sorted;
  }, [filteredBenchmarks, rankingOrder]);

  const totalBenchmarks = orderedBenchmarks.length;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalBenchmarks / ITEMS_PER_PAGE)),
    [totalBenchmarks]
  );

  const paginatedBenchmarks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return orderedBenchmarks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [orderedBenchmarks, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageStart = totalBenchmarks === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = totalBenchmarks === 0 ? 0 : Math.min(pageStart + ITEMS_PER_PAGE - 1, totalBenchmarks);

  const goToPage = (pageNumber: number) => {
    if (totalBenchmarks === 0) return;
    const sanitized = Math.min(Math.max(1, Math.trunc(pageNumber)), totalPages);
    setCurrentPage(sanitized);
  };

  useEffect(() => {
    if (totalBenchmarks === 0) {
      setPageInput("0");
    } else {
      setPageInput(String(currentPage));
    }
  }, [currentPage, totalBenchmarks]);

  const handlePageInputChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setPageInput(sanitized);
  };

  const commitPageInput = () => {
    if (totalBenchmarks === 0) return;
    if (!pageInput) {
      setPageInput(String(currentPage));
      return;
    }
    const parsed = Number(pageInput);
    if (Number.isFinite(parsed)) {
      goToPage(parsed);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const buildExportRows = () =>
    orderedBenchmarks.map(benchmark => ({
      id: benchmark.id,
      model_path: benchmark.model_path,
      model_name: benchmark.model_name,
      model_family: benchmark.model_family,
      task: benchmark.task,
      benchmark_name: benchmark.benchmark_name,
      technique: benchmark.technique,
      created_at: benchmark.created_at,
      total: benchmark.total,
      correct: benchmark.correct,
      accuracy_percent: benchmark.accuracy_percent,
      by_answer_type: benchmark.by_answer_type,
      mode: benchmark.mode,
      generated_max_new_tokens: benchmark.generated_max_new_tokens,
      stop_on_answer: benchmark.stop_on_answer,
      runtime_seconds: benchmark.runtime_seconds,
      avg_seconds_per_example: benchmark.avg_seconds_per_example,
      out_dir: benchmark.out_dir,
      val_json: benchmark.val_json,
      by_answer_type_serialized: benchmark.by_answer_type
        ? JSON.stringify(benchmark.by_answer_type)
        : null,
    }));

  const downloadFile = (content: string, mimeType: string, extension: string, total: number) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `benchmarks-export-${timestamp}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Exportação concluída",
      description: `Exportados ${total} benchmark(s) para ${extension.toUpperCase()}.`,
    });
  };

  const ensureExportable = () => {
    if (orderedBenchmarks.length === 0) {
      toast({
        title: "Nada para exportar",
        description: "Ajuste os filtros para selecionar benchmarks antes de exportar.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleExportJson = () => {
    if (!ensureExportable()) return;
    const rows = buildExportRows();
    const json = JSON.stringify(rows, null, 2);
    downloadFile(json, "application/json", "json", rows.length);
  };

  const handleExportCsv = () => {
    if (!ensureExportable()) return;
    const rows = buildExportRows();
    const headers = [
      "id",
      "model_path",
      "model_name",
      "model_family",
      "task",
      "benchmark_name",
      "technique",
      "created_at",
      "total",
      "correct",
      "accuracy_percent",
      "mode",
      "generated_max_new_tokens",
      "stop_on_answer",
      "runtime_seconds",
      "avg_seconds_per_example",
      "out_dir",
      "val_json",
      "by_answer_type_serialized",
    ];
    const escapeCsv = (value: unknown) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (/[",\n;]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
    const csvLines = [
      headers.join(";"),
      ...rows.map(row =>
        headers
          .map(header => escapeCsv((row as Record<string, unknown>)[header]))
          .join(";")
      ),
    ];
    const csvContent = csvLines.join("\n");
    downloadFile(csvContent, "text/csv;charset=utf-8", "csv", rows.length);
  };

  const averageScore = filteredBenchmarks.length > 0
    ? (
        filteredBenchmarks.reduce((sum, b) => sum + (b.accuracy_percent ?? 0), 0) /
        filteredBenchmarks.length
      ).toFixed(2)
    : "0";

  const modelAverageStats = useMemo(() => {
    const accumulator = new Map<
      string,
      {
        modelName: string;
        total: number;
        count: number;
        best: { name: string; accuracy: number } | null;
        worst: { name: string; accuracy: number } | null;
      }
    >();

    benchmarksForAverages.forEach(benchmark => {
      const modelName = resolveModelName(benchmark);
      if (!modelName) return;
      const accuracy = typeof benchmark.accuracy_percent === "number" ? benchmark.accuracy_percent : 0;
      const benchmarkName = resolveBenchmark(benchmark) ?? "Benchmark desconhecido";
      const entry = accumulator.get(modelName) ?? {
        modelName,
        total: 0,
        count: 0,
        best: null,
        worst: null,
      };

      entry.total += accuracy;
      entry.count += 1;

      if (!entry.best || accuracy > entry.best.accuracy) {
        entry.best = { name: benchmarkName, accuracy };
      }
      if (!entry.worst || accuracy < entry.worst.accuracy) {
        entry.worst = { name: benchmarkName, accuracy };
      }

      accumulator.set(modelName, entry);
    });

    return Array.from(accumulator.values())
      .map(entry => ({
        modelName: entry.modelName,
        average: entry.count ? entry.total / entry.count : 0,
        benchmarkCount: entry.count,
        best: entry.best,
        worst: entry.worst,
      }))
      .sort((a, b) => b.average - a.average);
  }, [benchmarksForAverages, resolveModelName, resolveBenchmark]);

  const selectedAverageModelStats = useMemo(() => {
    if (modelAverageStats.length === 0) return null;
    return [...modelAverageStats].sort((a, b) => b.average - a.average)[0];
  }, [modelAverageStats]);
  const handleResetFilters = () => {
    setSelectedTask("all");
    setSelectedModelFamily("all");
    setSelectedModel("all");
    setSelectedTechnique("all");
    setSelectedBenchmark("all");
    setRankingOrder("desc");
  };

  const selectedAverageModelBenchmarks = useMemo(() => {
    if (!selectedAverageModelStats) return [];

    return benchmarksForAverages
      .filter(benchmark => resolveModelName(benchmark) === selectedAverageModelStats.modelName)
      .map(benchmark => ({
        id: benchmark.id,
        benchmarkName: resolveBenchmark(benchmark) ?? "Benchmark desconhecido",
        datasetName: resolveTask(benchmark),
        technique: resolveTechnique(benchmark),
        accuracy: normalizeAccuracyValue(benchmark.accuracy_percent),
        createdAt: benchmark.created_at ?? null,
        correct: typeof benchmark.correct === "number" ? benchmark.correct : null,
        total: typeof benchmark.total === "number" ? benchmark.total : null,
      }))
      .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  }, [
    benchmarksForAverages,
    resolveBenchmark,
    resolveModelName,
    resolveTask,
    resolveTechnique,
    selectedAverageModelStats,
  ]);

  const displayedAverageBenchmarks = useMemo(
    () => selectedAverageModelBenchmarks.slice(0, MAX_HEATMAP_BENCHMARKS),
    [selectedAverageModelBenchmarks]
  );

  const getPrimaryAnswerType = (benchmark: BenchmarkDetails) => {
    if (!benchmark.by_answer_type) return null;
    const [label, stats] = Object.entries(benchmark.by_answer_type)[0] ?? [];
    if (!label || !stats) return null;
    return { label, stats };
  };

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AppSidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main className="relative flex-1 overflow-hidden bg-[radial-gradient(140%_140%_at_0%_-20%,rgba(147,51,234,0.22)_0%,rgba(17,24,39,0.92)_45%,rgba(3,7,18,1)_100%)]">
        <div className="border-b border-white/10 bg-white/5/10 backdrop-blur">
          <div className={cn(DASHBOARD_CONTAINER, "flex w-full flex-wrap items-center justify-between gap-4 py-6")}>
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-primary/70">Dashboard</p>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Benchmark Center</h1>
              <p className="max-w-3xl text-lg text-muted-foreground/90 sm:text-xl">
                Explore métricas, filtros e evolução dos modelos em diferentes tarefas.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-2xl border border-white/10 bg-gradient-to-r from-primary to-primary/70 px-6 py-2 text-base font-semibold text-primary-foreground shadow-[0_20px_60px_-30px_rgba(147,51,234,0.7)] hover:from-primary/90 hover:to-accent">
                    <Download className="mr-2 h-5 w-5" />
                    Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl border border-white/10 bg-background/95 p-2 backdrop-blur">
                  <DropdownMenuItem
                    onSelect={() => {
                      handleExportJson();
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-primary/10"
                  >
                    Exportar como JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      handleExportCsv();
                    }}
                    className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-foreground hover:bg-primary/10"
                  >
                    Exportar como CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto">
          <div className={cn(DASHBOARD_CONTAINER, "flex w-full flex-col gap-10 py-10")}>
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_140px_-70px_rgba(147,51,234,0.6)] sm:p-10">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 right-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
              </div>
              <div className="relative grid gap-6 sm:grid-cols-3">
                <Card className="border border-white/10 bg-white/5 shadow-none backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
                      Total de Benchmarks
                    </CardTitle>
                    <Trophy className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-semibold text-foreground sm:text-5xl">{filteredBenchmarks.length}</div>
                    <p className="text-base text-muted-foreground/90 sm:text-lg">Resultados registrados após aplicar filtros</p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-white/5 shadow-none backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
                      Score médio
                    </CardTitle>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-semibold text-foreground sm:text-5xl">{averageScore}</div>
                    <p className="text-base text-muted-foreground/90 sm:text-lg">Performance média considerando os resultados listados</p>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-white/5 shadow-none backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
                      Modelos avaliados
                    </CardTitle>
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-semibold text-foreground sm:text-5xl">{uniqueModels.length}</div>
                    <p className="text-base text-muted-foreground/90 sm:text-lg">Diversidade de modelos presentes no recorte atual</p>
                  </CardContent>
                </Card>
              </div>
            </section>

        {/* Top 3 Models */}
        {isListView && topModels.length > 0 && (
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-primary/10 via-background/85 to-background p-6 shadow-[0_40px_120px_-70px_rgba(147,51,234,0.6)] sm:p-8">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 right-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-[-35%] left-[-15%] h-72 w-72 rounded-full bg-accent/15 blur-[120px]" />
            </div>
            <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
                  Destaques
                </p>
                <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Top 3 modelos filtrados</h2>
                <p className="text-lg text-muted-foreground/90 sm:text-xl">
                  Destaque dos modelos com maior acurácia considerando os filtros ativos.
                </p>
              </div>
            </div>
            <div className="relative grid grid-cols-1 gap-5 md:grid-cols-3">
              {topModels.map((model, index) => {
                const modelName = resolveModelName(model);
                const taskLabel = formatLabel(resolveTask(model));
                const accuracyLabel = formatPercentage(model.accuracy_percent);
                const benchmarkRaw = resolveBenchmark(model);
                const techniqueRaw = resolveTechnique(model);
                const benchmarkLabel =
                  benchmarkRaw && benchmarkRaw !== "Benchmark desconhecido"
                    ? formatLabel(benchmarkRaw)
                    : null;
                const techniqueLabel =
                  techniqueRaw && techniqueRaw !== "Técnica desconhecida"
                    ? techniqueRaw
                    : null;
                const runtimeLabel =
                  typeof model.avg_seconds_per_example === "number" && Number.isFinite(model.avg_seconds_per_example)
                    ? `${formatNumber(model.avg_seconds_per_example, 2)}s / exemplo`
                    : null;
                const theme = rankThemes[index] ?? rankThemes[rankThemes.length - 1];
                const infoPills = [benchmarkLabel, techniqueLabel, runtimeLabel].filter(Boolean) as string[];
                const cardKey = model.id ?? `${modelName}-${index}`;
                return (
                  <div
                    key={cardKey}
                    className={cn(
                      "group relative flex h-full flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_48px_140px_-80px_rgba(147,51,234,0.55)]",
                      theme.card
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0">
                      <div className={cn("absolute -top-24 right-12 h-56 w-56 rounded-full blur-3xl opacity-80", theme.glow)} />
                      <div className="absolute bottom-[-30%] left-[-15%] h-64 w-64 rounded-full bg-white/10 blur-[120px]" />
                    </div>
                    <div className="relative flex flex-1 flex-col gap-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white shadow-[0_20px_45px_-20px_rgba(236,72,153,0.7)]",
                              theme.circle
                            )}
                          >
                            {index + 1}
                          </div>
                          <div className="space-y-1">
                            <p className="max-w-[220px] truncate text-2xl font-semibold text-foreground" title={modelName}>
                              {modelName}
                            </p>
                            <p className="text-base text-muted-foreground/80">{taskLabel}</p>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "inline-flex min-w-[82px] items-center justify-center rounded-full px-4 py-1.5 text-base font-semibold leading-none text-white shadow-[0_20px_48px_-28px_rgba(236,72,153,0.55)]",
                            theme.badge
                          )}
                        >
                          {accuracyLabel}
                        </span>
                      </div>

                      {infoPills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {infoPills.map(pill => (
                            <Badge
                              key={pill}
                              variant="outline"
                              className="border-white/15 bg-white/10 px-3 py-[6px] text-[11px] font-semibold text-foreground/85 backdrop-blur-sm"
                            >
                              {pill}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-auto grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
                            Total
                          </span>
                          <span className="text-2xl font-semibold text-foreground">
                            {typeof model.total === "number" ? model.total : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
                            Corretas
                          </span>
                          <span className="text-2xl font-semibold text-foreground">
                            {typeof model.correct === "number" ? model.correct : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Filters */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_-70px_rgba(147,51,234,0.55)] sm:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
                Filtros avançados
              </p>
              <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Refine a lista de benchmarks
              </h3>
            </div>
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="rounded-full border border-white/10 bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary-foreground shadow-[0_18px_50px_-30px_rgba(147,51,234,0.6)] hover:from-primary/90 hover:to-accent/90"
            >
              Limpar filtros
            </Button>
          </div>
          <div
            className={cn(
              "grid gap-4",
              isModelView ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            )}
          >
            <Select
              value={selectedTask}
              onValueChange={value => {
                if (selectedTask === value) {
                  setSelectedTask(value);
                  return;
                }

                if (isModelView) {
                  setSelectedModelFamily("all");
                  setSelectedModel("all");
                  setSelectedTechnique("all");
                } else {
                  setSelectedModelFamily("all");
                  setSelectedModel("all");
                  setSelectedTechnique("all");
                  setSelectedBenchmark("all");
                  setRankingOrder("desc");
                }
                setSelectedTask(value);
              }}
            >
              <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                <SelectValue placeholder="Filtrar por tarefa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tarefas</SelectItem>
                {uniqueTasks.map(task => (
                  <SelectItem key={task} value={task}>
                    {task}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedModelFamily} onValueChange={setSelectedModelFamily}>
              <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                <SelectValue placeholder="Filtrar por família" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Famílias</SelectItem>
                {uniqueModelFamilies.map(family => (
                  <SelectItem key={family} value={family}>
                    {family}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                <SelectValue placeholder="Filtrar por modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Modelos</SelectItem>
                {uniqueModels.map(model => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
              <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                <SelectValue placeholder="Filtrar por técnica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Técnicas</SelectItem>
                {uniqueTechniques.map(technique => (
                  <SelectItem key={technique} value={technique}>
                    {technique}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isListView && (
              <>
                <Select value={selectedBenchmark} onValueChange={setSelectedBenchmark}>
                  <SelectTrigger className="h-12 min-w-[220px] rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground [&>span]:text-left">
                    <SelectValue placeholder="Filtrar por benchmark" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Benchmarks</SelectItem>
                    {uniqueBenchmarks.map(benchmark => (
                      <SelectItem key={benchmark} value={benchmark}>
                        {benchmark}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={rankingOrder} onValueChange={value => setRankingOrder(value as "asc" | "desc")}>
                  <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                    <SelectValue placeholder="Ordenar por ranking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Ranking: Maior → Menor</SelectItem>
                    <SelectItem value="asc">Ranking: Menor → Maior</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </section>

        {/* Benchmarks Table */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_32px_110px_-70px_rgba(147,51,234,0.58)] sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">
                {isListView ? "Resultados detalhados" : "Visão agregada"}
              </p>
              <h3 className="text-2xl font-semibold text-foreground sm:text-3xl">
                {isListView ? "Benchmarks por modelo" : "Média de performance por modelo"}
              </h3>
              <p className="text-base text-muted-foreground">
                {isListView
                  ? "Consulte métricas individuais, tempos de execução e classificações."
                  : "Compare médias de acurácia e identifique destaques de cada modelo."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {isListView && (
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-muted-foreground">
                  {orderedBenchmarks.length} {orderedBenchmarks.length === 1 ? "registro" : "registros"}
                </div>
              )}
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBenchmarkViewMode("list");
                    handleResetFilters();
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em]",
                    isListView
                      ? "bg-primary text-primary-foreground shadow-[0_18px_50px_-30px_rgba(147,51,234,0.6)] hover:bg-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <ListOrdered className="h-3.5 w-3.5" />
                  Lista
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBenchmarkViewMode("models");
                    handleResetFilters();
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em]",
                    isModelView
                      ? "bg-primary text-primary-foreground shadow-[0_18px_50px_-30px_rgba(147,51,234,0.6)] hover:bg-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                >
                  <Gauge className="h-3.5 w-3.5" />
                  Média
                </Button>
              </div>
            </div>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-primary" />
            </div>
          ) : isModelView ? (
            modelAverageStats.length === 0 || !selectedAverageModelStats ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>Nenhum dado agregado disponível para os filtros atuais.</p>
                <p className="mt-2 text-sm">Ajuste os filtros ou importe novos resultados.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="border border-white/10 bg-gradient-to-br from-primary/15 via-primary/5 to-background/90 shadow-[0_24px_90px_-65px_rgba(147,51,234,0.55)] backdrop-blur">
                  <CardHeader className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                        Resumo do modelo
                      </CardTitle>
                      <Badge className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-foreground backdrop-blur">
                        {selectedAverageModelStats.modelName}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground/80">
                      Média calculada com {selectedAverageModelStats.benchmarkCount}{" "}
                      {selectedAverageModelStats.benchmarkCount === 1 ? "benchmark" : "benchmarks"} filtrados.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground/80">
                          Média de acurácia
                        </p>
                        <Gauge className="h-4 w-4 text-primary" />
                      </div>
                      <p className="mt-4 text-4xl font-semibold text-foreground sm:text-5xl">
                        {formatPercentage(selectedAverageModelStats.average)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground/75">
                        Cobertura de {selectedAverageModelBenchmarks.length}{" "}
                        {selectedAverageModelBenchmarks.length === 1 ? "benchmark" : "benchmarks"} avaliados.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          Melhor benchmark
                        </p>
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          {formatLabel(selectedAverageModelStats.best?.name, "—")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(selectedAverageModelStats.best?.accuracy)} de acurácia
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          Ponto de atenção
                        </p>
                        <p className="mt-3 text-sm font-semibold text-foreground">
                          {formatLabel(selectedAverageModelStats.worst?.name, "—")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPercentage(selectedAverageModelStats.worst?.accuracy)} de acurácia
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-white/10 bg-white/5 shadow-none backdrop-blur">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                      Desempenho por benchmark
                    </CardTitle>
                    <Activity className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {displayedAverageBenchmarks.length === 0 ? (
                      <p className="text-sm text-muted-foreground/80">
                        Nenhum registro detalhado disponível para este modelo.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {displayedAverageBenchmarks.map(item => {
                          const formattedName = formatLabel(item.benchmarkName, "—");
                          const accuracyLabel = formatPercentage(item.accuracy);
                          const attemptsLabel =
                            typeof item.correct === "number" && typeof item.total === "number"
                              ? `${item.correct} / ${item.total}`
                              : null;
                          const datasetLabel =
                            item.datasetName && item.datasetName !== "Tarefa desconhecida"
                              ? formatLabel(item.datasetName, "")
                              : null;

                          return (
                            <div
                              key={`${item.id ?? item.benchmarkName}`}
                              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">{formattedName}</p>
                                  {datasetLabel && (
                                    <Badge className="mt-1 w-fit border border-primary/30 bg-primary/10 text-[11px] font-semibold uppercase tracking-[0.35em] text-primary">
                                      {datasetLabel}
                                    </Badge>
                                  )}
                                </div>
                                {item.createdAt && (
                                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
                                    {formatDate(item.createdAt)}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                                  Acurácia {accuracyLabel}
                                </span>
                                {attemptsLabel && (
                                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-foreground">
                                    {attemptsLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          ) : filteredBenchmarks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>Nenhum benchmark encontrado.</p>
              <p className="mt-2 text-sm">Faça upload de dados na página Admin.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {paginatedBenchmarks.map(benchmark => {
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
                      className="rounded-3xl border border-white/10 bg-white/5 p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_25px_90px_-60px_rgba(147,51,234,0.55)]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <h3 className="text-2xl font-semibold text-foreground">{modelName}</h3>
                          <p className="text-base text-muted-foreground">
                            {[datasetLabel].filter(Boolean).join(" • ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {techniqueLabel && techniqueLabel !== "Técnica desconhecida" && (
                            <Badge
                              variant="outline"
                              className="rounded-full border-white/20 bg-white/10 px-4 py-1 text-sm uppercase tracking-wider text-muted-foreground"
                            >
                              {techniqueLabel}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="rounded-full border border-primary/30 bg-primary/15 px-4 py-1 text-xl font-semibold text-primary"
                          >
                            {scoreDisplay !== "—" ? `${scoreDisplay}%` : "Score não disponível"}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-base text-muted-foreground/80">
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
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Activity className="h-3.5 w-3.5" />
                                Accuracy
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {accuracyDisplay !== "—" ? `${accuracyDisplay}%` : "—"}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                              <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                                <Timer className="h-3.5 w-3.5" />
                                Tempo total
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">{runtimeDisplay}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
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
              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground/90">
                  Mostrando {pageStart === 0 ? 0 : pageStart}–{pageEnd} de {totalBenchmarks} {totalBenchmarks === 1 ? "registro" : "registros"}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || totalBenchmarks === 0}
                      className="h-9 w-9 rounded-full border-white/15 bg-white/5 text-muted-foreground hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">
                      Página {totalBenchmarks === 0 ? 0 : currentPage} de {totalBenchmarks === 0 ? 0 : totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || totalBenchmarks === 0}
                      className="h-9 w-9 rounded-full border-white/15 bg-white/5 text-muted-foreground hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
                      Ir para
                    </span>
                    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-background/70 px-3 py-1 shadow-[0_12px_40px_-25px_rgba(147,51,234,0.45)]">
                      <Input
                        value={pageInput}
                        onChange={event => handlePageInputChange(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitPageInput();
                          }
                        }}
                        disabled={totalBenchmarks === 0}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="h-7 w-16 border-0 bg-transparent px-0 text-center text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-0"
                        aria-label="Ir para página específica"
                      />
                      <span className="text-[11px] text-muted-foreground/70">/ {totalBenchmarks === 0 ? 0 : totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={commitPageInput}
                      disabled={totalBenchmarks === 0}
                      className="rounded-full border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground hover:text-primary"
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
        </div>
      </div>
      </main>
    </div>
  );
};

export default Dashboard;
