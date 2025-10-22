import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Sparkles, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  model: string;
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

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const KNOWN_TASKS = ["aqua_rat", "esnli", "gsm8k", "math_qa", "strategy_qa"];
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

  const taskOptions = mergeOptions(
    KNOWN_TASKS,
    uniqueTasks.filter(task => !KNOWN_TASKS.includes(task)),
    DISALLOWED_TASKS
  );
  const modelFamilyOptions = mergeOptions(
    KNOWN_MODEL_FAMILIES,
    uniqueModelFamilies.filter(family => !KNOWN_MODEL_FAMILIES.includes(family)),
    DISALLOWED_MODEL_FAMILIES
  );
  const techniqueOptions = mergeOptions(
    KNOWN_TECHNIQUES,
    uniqueTechniques.filter(tech => !KNOWN_TECHNIQUES.includes(tech)),
    DISALLOWED_TECHNIQUES
  );

  // Filter data
  const filteredData = leaderboardData.filter(entry => {
    if (filterTechnique !== "all" && entry.technique !== filterTechnique) return false;
    if (filterTask !== "all" && entry.task !== filterTask) return false;
    if (filterModelFamily !== "all" && entry.modelFamily !== filterModelFamily) return false;
    return true;
  });

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);

      const { data: votes, error } = await supabase
        .from("arena_votes")
        .select("*");

      if (error) throw error;

      if (votes && votes.length > 0) {
        // Agregar votos por modelo
        const votesByModel = votes.reduce((acc: Record<string, {
          votes: number;
          techniques: Set<string>;
          tasks: Set<string>;
          modelFamilies: Set<string>;
          benchmarks: Set<string>;
        }>, vote) => {
          const model = vote.winner_model_id || "Desconhecido";
          if (!acc[model]) {
            acc[model] = { votes: 0, techniques: new Set(), tasks: new Set(), modelFamilies: new Set(), benchmarks: new Set() };
          }
          acc[model].votes += 1;
          const technique = vote.technique ?? vote.model_technique;
          const task = vote.task ?? vote.benchmark_task;
          const modelFamily = vote.model_family ?? vote.modelFamily;
          const benchmark = vote.benchmark ?? vote.benchmark_name ?? vote.benchmarkName;
          if (technique) acc[model].techniques.add(technique);
          if (task) acc[model].tasks.add(task);
          if (modelFamily) acc[model].modelFamilies.add(modelFamily);
          if (benchmark) acc[model].benchmarks.add(benchmark);
          return acc;
        }, {});

        // Converter para array e ordenar por votos
        const processedData: LeaderboardEntry[] = Object.entries(votesByModel)
          .map(([model, data]) => ({
            rank: 0, // Will be set after sorting
            model,
            votes: data.votes,
            technique: Array.from(data.techniques).join(", ") || "Não especificada",
            task: Array.from(data.tasks).join(", ") || "Não especificada",
            modelFamily: Array.from(data.modelFamilies).join(", ") || "Não especificada",
            benchmark: Array.from(data.benchmarks).join(", ") || "Não especificado",
          }))
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
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70">Leaderboard</p>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Arena de Modelos</h1>
            <p className="text-sm text-muted-foreground">
              Ranking atualizado com base nos votos da comunidade.
            </p>
          </div>
          {topModel && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/15 px-4 py-2 text-sm text-primary shadow-[0_18px_40px_-20px_rgba(147,51,234,0.6)]">
              <Trophy className="h-5 w-5" />
              <span className="font-semibold">Topo atual: {topModel.model}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_38px_120px_-60px_rgba(147,51,234,0.6)] sm:p-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />
            </div>
            <div className="relative grid gap-6 sm:grid-cols-3">
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Sparkles className="h-4 w-4" />
                  Modelos ativos
                </p>
                <p className="text-3xl font-semibold text-foreground">{filteredData.length}</p>
                <p className="text-xs text-muted-foreground">Modelos ranqueados com votos recebidos</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Users className="h-4 w-4" />
                  Votos somados
                </p>
                <p className="text-3xl font-semibold text-foreground">{totalVotes}</p>
                <p className="text-xs text-muted-foreground">Feedbacks registrados pelos usuários</p>
              </div>
              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">
                  <Flame className="h-4 w-4" />
                  Técnicas variadas
                </p>
                <p className="text-3xl font-semibold text-foreground">{uniqueTechniquesCount}</p>
                <p className="text-xs text-muted-foreground">Estilos de treinamento aplicados</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_90px_-60px_rgba(147,51,234,0.5)] sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">Filtros</p>
                <h2 className="text-lg font-semibold text-foreground">Personalize sua visão</h2>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Select value={filterTask} onValueChange={setFilterTask}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-foreground">
                  <SelectValue placeholder="Filtrar por tarefa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Tarefas</SelectItem>
                  {taskOptions.map(task => (
                    <SelectItem key={task} value={task}>
                      {task}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterModelFamily} onValueChange={setFilterModelFamily}>
                <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-foreground">
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
                <SelectTrigger className="h-12 rounded-2xl border border-white/10 bg-white/5 text-foreground">
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
              filteredData.map(entry => {
                const theme = rankThemes[entry.rank - 1] ?? {
                  card: "border-white/10 bg-white/5",
                  crown: "text-white",
                };

                return (
                  <div
                    key={`${entry.model}-${entry.rank}`}
                    className={cn(
                      "flex flex-col gap-4 rounded-3xl border p-6 transition sm:flex-row sm:items-center sm:justify-between",
                      theme.card
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl font-bold text-primary shadow-[0_18px_40px_-20px_rgba(147,51,234,0.6)]">
                        {entry.rank}º
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">{entry.model}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {entry.task}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                            {entry.modelFamily}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground sm:text-right">
                      <div>
                        <p className="font-semibold text-foreground">Técnica</p>
                        <p>{entry.technique}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-primary shadow-[0_18px_40px_-25px_rgba(147,51,234,0.7)]">
                      <Trophy className={cn("h-5 w-5", theme.crown)} />
                      <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Votos</span>
                        <span className="text-lg font-semibold text-foreground">{entry.votes}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
