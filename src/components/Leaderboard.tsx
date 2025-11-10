import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Trophy, Sparkles, Flame, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import evalResultsArray from "../../eval_results_array.json";

interface EvalResultTask {
  total?: number;
  correct?: number;
  accuracy_percent?: number;
  by_answer_type?: Record<string, { total: number; correct: number; acc: number }> | null;
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

interface NormalizedBenchmark {
  id: string;
  model_path: string;
  model_name: string | null;
  model_family: string | null;
  task: string | null;
  benchmark_name: string | null;
  technique: string | null;
  created_at: string | null;
  total: number;
  correct: number;
  accuracy_percent: number;
  val_json: string;
}

interface ModelMetadata {
  modelFamily: string | null;
  technique: string | null;
  task: string | null;
  benchmark: string | null;
}

const KNOWN_TASKS = ["aqua_rat", "esnli", "gsm8k", "math_qa", "strategy_qa"];
const ITEMS_PER_PAGE = 5;
const LEADERBOARD_CONTAINER = "mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10 xl:px-16";
type ArenaVoteRow = Database["public"]["Tables"]["arena_votes"]["Row"] & {
  model_family?: string | null;
  modelFamily?: string | null;
  model_technique?: string | null;
  benchmark?: string | null;
  benchmark_name?: string | null;
  benchmarkName?: string | null;
  benchmark_task?: string | null;
};

const normalizeForComparison = (value?: string | null): string => {
  if (!value) return "";
  return value.toLowerCase().replace(/[\s_-]/g, "");
};

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

const normalizeEvalResults = (data: EvalResultsFile): NormalizedBenchmark[] => {
  if (!data?.eval_results || !Array.isArray(data.eval_results)) {
    return [];
  }

  const benchmarks: NormalizedBenchmark[] = [];

  data.eval_results.forEach(entry => {
    Object.entries(entry ?? {}).forEach(([runKey, tasks]) => {
      Object.entries(tasks ?? {}).forEach(([taskName, taskDetails]) => {
        if (!taskDetails) return;

        const modelPath = taskDetails.model ?? "";
        const modelFamily = inferModelFamilyFromRunKey(runKey) ?? inferModelNameFromPath(modelPath);
        const trainingTask = inferTrainingTaskFromRunKey(runKey);
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
          model_name: runKey ?? null,
          model_family: modelFamily ?? null,
          task: trainingTask ?? null,
          benchmark_name: taskName,
          technique: inferTechniqueFromModelPath(modelPath),
          created_at: taskDetails.created_at ?? null,
          total: Number.isFinite(totalValue) ? totalValue : 0,
          correct: Number.isFinite(correctValue) ? correctValue : 0,
          accuracy_percent: Number.isFinite(accuracyValue) ? accuracyValue : 0,
          val_json: taskDetails.val_json ?? "",
        });
      });
    });
  });

  return benchmarks;
};

const formatLabel = (value?: string | null, fallback = "Não especificada") => {
  if (!value) return fallback;
  return value
    .split(/[\/_-]/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const normalizeTechniqueLabel = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized) return null;
  const lower = normalized.toLowerCase();
  if (lower.includes("grpo") && (lower.includes("lora") || lower.includes("qlora"))) {
    return "Lora+GRPO";
  }
  if (lower.includes("grpo")) return "GRPO";
  if (lower.includes("qlora") || lower.includes("lora")) return "Lora/QLora";
  if (["base", "modelo base", "base model"].includes(lower)) return "Modelo base";
  if (/[\\/]|__/.test(normalized)) return null;
  const pretty = normalized
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  return pretty || null;
};

const dedupeParts = (parts: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  const forbidden = new Set(["não especificada", "não especificado"]);
  const result: string[] = [];
  parts
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part))
    .forEach(part => {
      const key = part.toLowerCase();
      if (forbidden.has(key) || seen.has(key)) return;
      seen.add(key);
      result.push(part);
    });
  return result;
};

const normalizedBenchmarks = normalizeEvalResults(evalResultsArray as EvalResultsFile);

const buildMetadataMap = (benchmarks: NormalizedBenchmark[]) => {
  const map = new Map<string, ModelMetadata>();
  benchmarks.forEach(entry => {
    const modelKey = entry.model_name ?? "";
    if (!modelKey || map.has(modelKey)) return;

    const inferredFamily = entry.model_family ?? inferModelFamilyFromRunKey(modelKey) ?? inferModelNameFromPath(entry.model_path);
    const inferredTask = entry.task ?? inferTrainingTaskFromRunKey(modelKey);
    const inferredTechnique = entry.technique ?? inferTechniqueFromModelPath(entry.model_path);
    const inferredBenchmark = entry.benchmark_name ?? inferBenchmarkFromValJson(entry.val_json);

    map.set(modelKey, {
      modelFamily: inferredFamily ? formatLabel(inferredFamily) : null,
      task: inferredTask ? formatLabel(inferredTask) : null,
      technique: normalizeTechniqueLabel(inferredTechnique),
      benchmark: inferredBenchmark ? formatLabel(inferredBenchmark, "Não especificado") : null,
    });
  });
  return map;
};

const MODEL_METADATA = buildMetadataMap(normalizedBenchmarks);

const inferMetadataFromModelId = (modelId: string): ModelMetadata => {
  if (!modelId) {
    return {
      modelFamily: null,
      technique: null,
      task: null,
      benchmark: null,
    };
  }
  const parts = inferPartsFromRunKey(modelId);
  const task = parts[0] ? formatLabel(parts[0]) : null;
  const modelFamily = parts[1] ? formatLabel(parts[1]) : null;
  const technique = normalizeTechniqueLabel(modelId);
  return {
    modelFamily,
    technique,
    task,
    benchmark: task,
  };
};

const getModelMetadata = (modelId: string, fallbackVote?: Partial<ModelMetadata>): ModelMetadata => {
  const fromMap = MODEL_METADATA.get(modelId);
  const inferred = inferMetadataFromModelId(modelId);
  const fallback = fallbackVote ?? {};

  const selectValue = (...candidates: (string | null | undefined)[]) => {
    for (const candidate of candidates) {
      if (candidate && candidate.trim() && candidate !== "Não especificada") {
        return candidate.trim();
      }
    }
    return null;
  };

  const fallbackTechnique = normalizeTechniqueLabel(fallback.technique);
  const fallbackFamily = fallback.modelFamily ? formatLabel(fallback.modelFamily) : null;
  const fallbackTask = fallback.task ? formatLabel(fallback.task) : null;
  const fallbackBenchmark = fallback.benchmark ? formatLabel(fallback.benchmark, "Não especificado") : null;

  const technique = selectValue(
    normalizeTechniqueLabel(fromMap?.technique),
    normalizeTechniqueLabel(inferred.technique),
    fallbackTechnique
  ) ?? "Modelo base";

  const modelFamily = selectValue(
    fromMap?.modelFamily,
    inferred.modelFamily,
    fallbackFamily
  );

  const task = selectValue(
    fromMap?.task,
    inferred.task,
    fallbackTask
  );

  const benchmark = selectValue(
    fromMap?.benchmark,
    inferred.benchmark,
    fallbackBenchmark
  );

  return {
    modelFamily: modelFamily ?? "Não especificada",
    technique,
    task: task ?? "Não especificada",
    benchmark: benchmark ?? "Não especificado",
  };
};

interface LeaderboardEntry {
  rank: number;
  modelId: string;
  displayName: string;
  votes: number;
  technique: string;
  task: string;
  modelFamily: string;
  benchmark: string;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTechnique, setFilterTechnique] = useState<string>("all");
  const [filterTask, setFilterTask] = useState<string>("all");
  const [filterModelFamily, setFilterModelFamily] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const KNOWN_MODEL_FAMILIES = [
    "Llama-3.2-3B-Instruct",
    "Phi-4-mini-instruct",
    "Qwen3-4B-Instruct-2507",
    "gemma-3-4b-it",
  ];
  const KNOWN_TECHNIQUES = ["GRPO", "Lora+GRPO", "Lora/QLora"];
  const DISALLOWED_TASKS = ["Geração de Texto"];
  const DISALLOWED_MODEL_FAMILIES = ["Não especificada"];
  const DISALLOWED_TECHNIQUES = ["Base Model, Modelo base"];

  const mergeOptions = (known: string[], dynamic: string[], disallowed: string[]) => {
    const result: string[] = [];
    const seen = new Set<string>();
    for (const option of [...known, ...dynamic]) {
      if (!option) continue;
      if (disallowed.includes(option)) continue;
      if (seen.has(option)) continue;
      seen.add(option);
      result.push(option);
    }
    return result;
  };

  // Get unique values for filters
  const uniqueTechniques = Array.from(new Set(leaderboardData.map(entry => entry.technique).filter(Boolean)));
  const uniqueTasks = Array.from(new Set(leaderboardData.map(entry => entry.task).filter(Boolean)));
  const uniqueModelFamilies = Array.from(
    new Set(leaderboardData.map(entry => entry.modelFamily).filter(Boolean))
  );

  const taskOptions = KNOWN_TASKS;
  const modelFamilyOptions = KNOWN_MODEL_FAMILIES;
  const techniqueOptions = mergeOptions(
    KNOWN_TECHNIQUES,
    uniqueTechniques.filter(tech => !KNOWN_TECHNIQUES.includes(tech)),
    DISALLOWED_TECHNIQUES
  );

  const handleResetFilters = () => {
    setFilterTask("all");
    setFilterModelFamily("all");
    setFilterTechnique("all");
  };

  // Filter data
  const filteredData = leaderboardData.filter(entry => {
    if (filterTechnique !== "all" && entry.technique !== filterTechnique) return false;
    if (filterTask !== "all") {
      const normalizedFilterTask = formatLabel(filterTask);
      const normalizedEntryTask = entry.task;
      if (normalizedEntryTask !== normalizedFilterTask) return false;
    }
    if (filterModelFamily !== "all") {
      // Normalize both values for comparison (case-insensitive, ignore spaces/hyphens/underscores)
      const normalizedFilter = normalizeForComparison(filterModelFamily);
      const normalizedEntry = normalizeForComparison(entry.modelFamily);
      if (normalizedEntry !== normalizedFilter) return false;
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTechnique, filterTask, filterModelFamily]);

  const totalEntries = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const pageStart = totalEntries === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const pageEnd = totalEntries === 0 ? 0 : Math.min(pageStart + ITEMS_PER_PAGE - 1, totalEntries);

  const goToPage = (pageNumber: number) => {
    if (totalEntries === 0) return;
    const sanitized = Math.min(Math.max(1, Math.trunc(pageNumber)), totalPages);
    setCurrentPage(sanitized);
  };

  useEffect(() => {
    if (totalEntries === 0) {
      setPageInput("0");
    } else {
      setPageInput(String(currentPage));
    }
  }, [currentPage, totalEntries]);

  const handlePageInputChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, "");
    setPageInput(sanitized);
  };

  const commitPageInput = () => {
    if (totalEntries === 0) return;
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

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);

      const { data: votes, error } = await supabase
        .from("arena_votes")
        .select("*");

      if (error) throw error;

      const voteRows: ArenaVoteRow[] = (votes ?? []) as ArenaVoteRow[];

      if (voteRows.length > 0) {
        const votesByModel = voteRows.reduce((acc: Record<string, {
          votes: number;
          technique: string | null;
          task: string | null;
          modelFamily: string | null;
          benchmark: string | null;
        }>, voteRow) => {
          const modelId = voteRow.winner_model_id || "Desconhecido";
          const fallbackMeta: Partial<ModelMetadata> = {
            technique: voteRow.technique ?? voteRow.model_technique ?? null,
            task: voteRow.task ?? voteRow.benchmark_task ?? null,
            modelFamily: voteRow.model_family ?? voteRow.modelFamily ?? null,
            benchmark: voteRow.benchmark ?? voteRow.benchmark_name ?? voteRow.benchmarkName ?? null,
          };
          const metadata = getModelMetadata(modelId, fallbackMeta);

          const record = acc[modelId] ?? {
            votes: 0,
            technique: metadata.technique,
            task: metadata.task,
            modelFamily: metadata.modelFamily,
            benchmark: metadata.benchmark,
          };

          record.votes += 1;
          record.technique = metadata.technique || record.technique;
          record.task = metadata.task || record.task;
          record.modelFamily = metadata.modelFamily || record.modelFamily;
          record.benchmark = metadata.benchmark || record.benchmark;

          acc[modelId] = record;
          return acc;
        }, {});

        const processedData: LeaderboardEntry[] = Object.entries(votesByModel)
          .map(([modelId, data]) => {
            const modelFamily =
              data.modelFamily && data.modelFamily !== "Não especificada"
                ? data.modelFamily
                : formatLabel(modelId);
            const technique = data.technique ?? "Modelo base";
            const task =
              data.task && data.task !== "Não especificada"
                ? data.task
                : "Não especificada";
            const displayParts = dedupeParts([modelFamily, technique, task]);
            const displayName = displayParts.length > 0 ? displayParts.join(" • ") : formatLabel(modelId);

            return {
              rank: 0,
              modelId,
              displayName,
              votes: data.votes,
              technique,
              task,
              modelFamily,
              benchmark: data.benchmark ?? "Não especificado",
            };
          })
          .sort((a, b) => b.votes - a.votes)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

        setLeaderboardData(processedData);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
      setLeaderboardData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalVotes = filteredData.reduce((sum, item) => sum + item.votes, 0);
  const topModel = filteredData[0];
  const topModelLabel = topModel
    ? topModel.modelFamily && topModel.modelFamily !== "Não especificada"
      ? topModel.modelFamily
      : formatLabel(topModel.modelId)
    : null;
  const uniqueTechniquesCount = techniqueOptions.length;

  const rankThemes = [
    {
      card: "border-primary/60 bg-gradient-to-br from-primary/15 via-background/90 to-background shadow-[0_28px_80px_-50px_rgba(147,51,234,0.7)]",
      crown: "text-yellow-400",
    },
    {
      card: "border-accent/40 bg-gradient-to-br from-accent/10 via-background/90 to-background shadow-[0_20px_70px_-55px_rgba(168,85,247,0.6)]",
      crown: "text-accent",
    },
    {
      card: "border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-background/90 to-background shadow-[0_20px_60px_-55px_rgba(99,102,241,0.55)]",
      crown: "text-indigo-400",
    },
  ];

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(140%_140%_at_0%_-20%,rgba(147,51,234,0.22)_0%,rgba(17,24,39,0.92)_45%,rgba(3,7,18,1)_100%)]">
      <div className="border-b border-white/10 bg-white/5/10 backdrop-blur">
        <div className={cn(LEADERBOARD_CONTAINER, "flex w-full flex-wrap items-center justify-between gap-4 py-6")}>
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.4em] text-primary/70">Leaderboard</p>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Arena de Modelos</h1>
            <p className="max-w-3xl text-lg text-muted-foreground/90 sm:text-xl">
              Ranking atualizado com base nos votos da comunidade.
            </p>
          </div>
          {topModel && topModelLabel && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm text-white shadow-[0_18px_40px_-20px_rgba(147,51,234,0.6)]">
              <Trophy className="h-5 w-5" />
              <div className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/70">
                  Topo Atual
                </span>
                <span className="text-base font-semibold text-white">{topModelLabel}</span>
              </div>
              <Badge className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                {topModel.technique || "Modelo base"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto">
        <div className={cn(LEADERBOARD_CONTAINER, "flex w-full flex-col gap-8 py-10")}>
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_38px_120px_-60px_rgba(147,51,234,0.6)] sm:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
            </div>
            <div className="relative grid gap-6 sm:grid-cols-3">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Sparkles className="h-4 w-4" />
                  Modelos ativos
                </p>
                <p className="text-4xl font-semibold text-foreground">{totalEntries}</p>
                <p className="text-base text-muted-foreground/90 sm:text-lg">Modelos ranqueados com votos recebidos</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Users className="h-4 w-4" />
                  Votos somados
                </p>
                <p className="text-4xl font-semibold text-foreground">{totalVotes}</p>
                <p className="text-base text-muted-foreground/90 sm:text-lg">Feedbacks registrados pelos usuários</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Flame className="h-4 w-4" />
                  Técnicas variadas
                </p>
                <p className="text-4xl font-semibold text-foreground">{uniqueTechniquesCount}</p>
                <p className="text-base text-muted-foreground/90 sm:text-lg">Estilos de treinamento aplicados</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_90px_-60px_rgba(147,51,234,0.5)] sm:p-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">Filtros</p>
                <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Personalize sua visão</h2>
              </div>
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="rounded-full border border-white/10 bg-gradient-to-r from-primary to-accent px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary-foreground shadow-[0_18px_50px_-30px_rgba(147,51,234,0.6)] hover:from-primary/90 hover:to-accent/90"
              >
                Limpar filtros
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={filterTask} onValueChange={setFilterTask}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                  <SelectValue placeholder="Filtrar por tarefa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tarefas</SelectItem>
                  {taskOptions.map(task => (
                    <SelectItem key={task} value={task}>
                      {formatLabel(task)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterModelFamily} onValueChange={setFilterModelFamily}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                  <SelectValue placeholder="Filtrar por família" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Famílias</SelectItem>
                  {modelFamilyOptions.map(family => (
                    <SelectItem key={family} value={family}>
                      {family}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTechnique} onValueChange={setFilterTechnique}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-lg text-foreground">
                  <SelectValue placeholder="Filtrar por técnica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Técnicas</SelectItem>
                  {techniqueOptions.map(technique => (
                    <SelectItem key={technique} value={technique}>
                      {technique}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </section>

          <section className="space-y-4">
            {isLoading ? (
              <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center shadow-[0_20px_80px_-50px_rgba(147,51,234,0.5)]">
                <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-primary/70" />
                <p className="mt-4 text-sm text-muted-foreground">Carregando dados do leaderboard...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center text-muted-foreground">
                Nenhum modelo encontrado com os filtros selecionados.
              </div>
            ) : (
              paginatedData.map(entry => {
                const theme = rankThemes[entry.rank - 1] ?? {
                  card: "border-white/10 bg-white/5",
                  crown: "text-white",
                };
                const primaryLabel =
                  entry.modelFamily && entry.modelFamily !== "Não especificada"
                    ? entry.modelFamily
                    : formatLabel(entry.modelId);
                const techniqueLabel = entry.technique || "Modelo base";
                const taskLabel = entry.task !== "Não especificada" ? entry.task : null;
                const badges = taskLabel ? [{ prefix: "Tarefa", value: taskLabel }] : [];

                return (
                  <div
                    key={`${entry.modelId}-${entry.rank}`}
                    className={cn(
                      "flex flex-col gap-6 rounded-3xl border p-6 transition sm:grid sm:grid-cols-[minmax(0,1.6fr)_minmax(200px,0.7fr)_minmax(150px,0.5fr)] sm:items-center sm:gap-8",
                      theme.card
                    )}
                  >
                    <div className="flex items-start gap-4 sm:items-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-bold text-primary shadow-[0_18px_40px_-20px_rgba(147,51,234,0.6)]">
                        {entry.rank}º
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">
                            {primaryLabel}
                          </p>
                          <p className="text-base text-muted-foreground/80">{entry.modelId}</p>
                        </div>
                        {badges.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            {badges.map(({ prefix, value }) => (
                              <Badge
                                key={`${entry.modelId}-${prefix}`}
                                variant="secondary"
                                className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground"
                              >
                                <span className="text-muted-foreground/80">{prefix}:</span>{" "}
                                <span className="ml-1 text-foreground">{value}</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 text-base text-muted-foreground sm:items-end sm:justify-center sm:text-right">
                      <span className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/70">
                        Técnica
                      </span>
                      <Badge className="rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold uppercase tracking-[0.35em] text-primary">
                        {techniqueLabel}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-primary shadow-[0_18px_40px_-25px_rgba(147,51,234,0.7)] sm:justify-self-end">
                      <Trophy className={cn("h-5 w-5", theme.crown)} />
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Votos</span>
                        <span className="text-2xl font-semibold text-foreground">{entry.votes}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            {totalEntries > 0 && (
              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base text-muted-foreground/90">
                  Mostrando {pageStart === 0 ? 0 : pageStart}–{pageEnd} de {totalEntries} {totalEntries === 1 ? "voto" : "votos"}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1 || totalEntries === 0}
                      className="h-9 w-9 rounded-full border-white/15 bg-white/5 text-muted-foreground hover:text-primary"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-base font-medium text-muted-foreground">
                      Página {totalEntries === 0 ? 0 : currentPage} de {totalEntries === 0 ? 0 : totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || totalEntries === 0}
                      className="h-9 w-9 rounded-full border-white/15 bg-white/5 text-muted-foreground hover:text-primary"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
                      Ir para
                    </span>
                    <div className="flex items-center gap-2 rounded-full border border-white/15 bg-background/70 px-3 py-1.5 shadow-[0_12px_40px_-25px_rgba(147,51,234,0.45)]">
                      <Input
                        value={pageInput}
                        onChange={event => handlePageInputChange(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitPageInput();
                          }
                        }}
                        disabled={totalEntries === 0}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="h-7 w-16 border-0 bg-transparent px-0 text-center text-base font-semibold text-foreground focus-visible:outline-none focus-visible:ring-0"
                        aria-label="Ir para página específica"
                      />
                      <span className="text-[11px] text-muted-foreground/70">/ {totalEntries === 0 ? 0 : totalPages}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={commitPageInput}
                      disabled={totalEntries === 0}
                      className="rounded-full border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground hover:text-primary"
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
