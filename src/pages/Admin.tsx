import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useChatHistory } from "@/context/ChatHistoryContext";
import { supabase } from "@/integrations/supabase/client";
import AppSidebar from "@/components/AppSidebar";
import { useSidebar } from "@/context/SidebarContext";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Database,
  Trash2,
  MessageSquare,
  Vote,
  TrendingUp,
  BarChart,
  ShieldCheck,
  Layers,
  Server,
  Loader2,
} from "lucide-react";

type UploadCategory = "models" | "arena_responses" | "arena_votes" | "leaderboard" | "benchmarks";
type TableName = "models" | "arena_responses" | "arena_votes" | "leaderboard_results" | "benchmarks";

const Admin = () => {
  const [uploading, setUploading] = useState(false);
  const [clearingLeaderboard, setClearingLeaderboard] = useState(false);
  const { toast } = useToast();
  const { clearHistory } = useChatHistory();
  const { collapsed: isSidebarCollapsed, toggle: toggleSidebar } = useSidebar();

  // Helper function to extract model name from path
  const extractModelName = (modelPath: string): string => {
    // Extract from path like: /home/.../outputs/grpo/Llama-3.2-3B-Instruct/aqua_rat/merged_fp16
    const parts = modelPath.split('/');
    // Find the model name (usually after technique like grpo, lora, etc.)
    for (let i = 0; i < parts.length - 1; i++) {
      if (parts[i] === 'grpo' || parts[i] === 'lora' || parts[i] === 'qlora' || parts[i] === 'outputs') {
        const modelName = parts[i + 1];
        if (modelName && !modelName.includes('.')) {
          return modelName;
        }
      }
    }
    // Fallback: return the last meaningful part
    return parts.filter(p => p && !p.includes('.')).pop() || 'Unknown Model';
  };

  const asObjectArray = (payload: unknown): Record<string, unknown>[] => {
    if (Array.isArray(payload)) {
      return payload.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
    }
    if (typeof payload === "object" && payload !== null) {
      return [payload as Record<string, unknown>];
    }
    throw new Error("Formato JSON inválido. Esperado objeto ou array de objetos.");
  };

  const readString = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return typeof value === "string" ? value : undefined;
  };

  const readNumber = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return typeof value === "number" ? value : undefined;
  };

  const readBoolean = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return typeof value === "boolean" ? value : undefined;
  };

  const uploadSections: Array<{
    key: UploadCategory;
    title: string;
    description: string;
    icon: LucideIcon;
    table: TableName;
    sample: string;
    highlight?: string;
    wide?: boolean;
  }> = [
    {
      key: "models",
      title: "Modelos",
    description: "Importe ou limpe o catálogo de modelos disponíveis para comparações.",
    icon: Database,
    table: "models",
    sample: `[
  {
    "model_id": "gpt-4",
    "model_name": "GPT-4",
    "provider": "OpenAI"
  }
]`,
    highlight: "Catálogo",
  },
  {
    key: "arena_responses",
    title: "Respostas da Arena",
    description: "Gerencie respostas retornadas pelos modelos em competições recentes.",
    icon: MessageSquare,
    table: "arena_responses",
    sample: `[
  {
    "model_id": "gpt-4",
    "prompt": "Explique redes neurais.",
    "response": "Resposta gerada pelo modelo",
    "response_time": 1.45,
    "tokens_used": 120
  }
]`,
    highlight: "Histórico",
  },
  {
    key: "arena_votes",
    title: "Votos da Arena",
    description: "Cadastre ou reinicie os votos computados nas disputas da Arena.",
    icon: Vote,
    table: "arena_votes",
    sample: `[
  {
    "prompt": "Explique redes neurais.",
    "model_a_id": "gpt-4",
    "model_b_id": "claude-3",
    "winner_model_id": "gpt-4"
  }
]`,
    highlight: "Competição",
  },
  {
    key: "leaderboard",
    title: "Leaderboard",
    description: "Atualize o ranking consolidado com scores e posições.",
    icon: TrendingUp,
    table: "leaderboard_results",
    sample: `[
  {
    "model_name": "GPT-4",
    "task": "Resumo",
    "technique": "Few-shot",
    "score": 95.5,
    "rank": 1
  }
]`,
    highlight: "Ranking",
  },
  {
    key: "benchmarks",
    title: "Benchmarks dos Modelos",
    description: "Sincronize resultados completos de avaliações e métricas de modelos.",
    icon: BarChart,
    table: "benchmarks",
      sample: `{
  "total": 100,
  "correct": 51,
  "accuracy_percent": 51.0,
  "by_answer_type": {
    "mcq": {
      "correct": 51,
      "total": 100,
      "acc": 51.0
    }
  },
  "model": "/path/to/model/Llama-3.2-3B-Instruct/task/merged_fp16",
  "val_json": "/path/to/data/tasks/aqua_rat/val.json",
  "mode": "concise_cot",
  "generated_max_new_tokens": 512,
  "stop_on_answer": false,
  "out_dir": "/path/to/outputs/",
  "runtime_seconds": 936.9,
  "avg_seconds_per_example": 9.369
}`,
    highlight: "Métricas",
    wide: true,
  },
  ];

  const quickStats: Array<{
    icon: LucideIcon;
    label: string;
    value: string;
    hint: string;
  }> = [
    {
      icon: Layers,
      label: "Categorias importáveis",
      value: uploadSections.length.toString(),
      hint: "Modelos, respostas, votos e benchmarks",
    },
    {
      icon: Trash2,
      label: "Ações de limpeza",
      value: (uploadSections.length + 1).toString(),
      hint: "Restaurar tabelas e limpar histórico local",
    },
    {
      icon: Server,
      label: "Origem dos dados",
      value: "Supabase",
      hint: "Operações executadas diretamente no banco",
    },
  ];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: UploadCategory) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (type === "models") {
        const models = asObjectArray(parsed).map(model => {
          const modelId = readString(model, "model_id") ?? readString(model, "id");
          const modelName = readString(model, "model_name") ?? readString(model, "name");
          if (!modelId || !modelName) {
            throw new Error("Cada modelo deve conter os campos model_id/id e model_name/name.");
          }
          return {
            model_id: modelId,
            model_name: modelName,
            provider: readString(model, "provider") ?? null,
          };
        });

        const { error } = await supabase.from("models").insert(models);
        if (error) throw error;
        toast({
          title: "Modelos carregados!",
          description: `${models.length} modelo(s) adicionado(s) ao banco.`,
        });
      } else if (type === "arena_responses") {
        const responses = asObjectArray(parsed).map(response => {
          const prompt = readString(response, "prompt");
          const modelId = readString(response, "model_id");
          const output = readString(response, "response");
          if (!prompt || !modelId || !output) {
            throw new Error("Cada resposta deve conter os campos prompt, model_id e response.");
          }
          return {
            prompt,
            model_id: modelId,
            response: output,
            response_time: readNumber(response, "response_time") ?? null,
            tokens_used: readNumber(response, "tokens_used") ?? null,
          };
        });

        const { error } = await supabase.from("arena_responses").insert(responses);
        if (error) throw error;
        toast({
          title: "Respostas carregadas!",
          description: `${responses.length} resposta(s) adicionada(s) ao banco.`,
        });
      } else if (type === "arena_votes") {
        const votes = asObjectArray(parsed).map(vote => {
          const modelA = readString(vote, "model_a_id");
          const modelB = readString(vote, "model_b_id");
          const winner = readString(vote, "winner_model_id");
          if (!modelA || !modelB || !winner) {
            throw new Error("Cada voto deve informar model_a_id, model_b_id e winner_model_id.");
          }
          return {
            prompt: readString(vote, "prompt") ?? "",
            model_a_id: modelA,
            model_b_id: modelB,
            winner_model_id: winner,
          };
        });

        const { error } = await supabase.from("arena_votes").insert(votes);
        if (error) throw error;
        toast({
          title: "Votos carregados!",
          description: `${votes.length} voto(s) adicionado(s) ao banco.`,
        });
      } else if (type === "leaderboard") {
        const results = asObjectArray(parsed).map(result => {
          const modelName = readString(result, "model_name") ?? readString(result, "modelName");
          const technique = readString(result, "technique");
          const task = readString(result, "task");
          const score = readNumber(result, "score");
          if (!modelName || !technique || !task || score === undefined) {
            throw new Error("Cada entrada do leaderboard precisa de model_name, technique, task e score.");
          }
          return {
            model_name: modelName,
            technique,
            task,
            score,
            rank: readNumber(result, "rank") ?? null,
          };
        });

        const { error } = await supabase.from("leaderboard_results").insert(results);
        if (error) throw error;
        toast({
          title: "Leaderboard carregado!",
          description: `${results.length} resultado(s) adicionado(s) ao banco.`,
        });
      } else if (type === "benchmarks") {
        const benchmarks = asObjectArray(parsed).map(benchmark => {
          const modelPath = readString(benchmark, "model");
          const valJson = readString(benchmark, "val_json");
          const mode = readString(benchmark, "mode");
          const total = readNumber(benchmark, "total");
          const correct = readNumber(benchmark, "correct");
          const accuracy = readNumber(benchmark, "accuracy_percent");

          if (!modelPath || !valJson || !mode || total === undefined || correct === undefined || accuracy === undefined) {
            throw new Error("Benchmark JSON inválido. Verifique se total, correct, accuracy_percent, model, val_json e mode estão presentes.");
          }

          const byAnswerTypeValue = benchmark["by_answer_type"];
          const byAnswerType: Json | null =
            typeof byAnswerTypeValue === "object" && byAnswerTypeValue !== null
              ? (byAnswerTypeValue as Json)
              : null;

          return {
            model_name: extractModelName(modelPath),
            model_path: modelPath,
            total,
            correct,
            accuracy_percent: accuracy,
            by_answer_type: byAnswerType,
            val_json: valJson,
            mode,
            generated_max_new_tokens: readNumber(benchmark, "generated_max_new_tokens") ?? null,
            stop_on_answer: readBoolean(benchmark, "stop_on_answer") ?? null,
            out_dir: readString(benchmark, "out_dir") ?? null,
            runtime_seconds: readNumber(benchmark, "runtime_seconds") ?? null,
            avg_seconds_per_example: readNumber(benchmark, "avg_seconds_per_example") ?? null,
          };
        });

        const { error } = await supabase.from("benchmarks").insert(benchmarks);
        if (error) throw error;
        toast({
          title: "Benchmarks carregados!",
          description: `${benchmarks.length} benchmark(s) adicionado(s) ao banco.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Verifique o formato do JSON e tente novamente.";
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao carregar arquivo",
        description: message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };


  const handleClearHistory = () => {
    clearHistory();
    toast({
      title: "Histórico limpo",
      description: "Todos os chats locais foram removidos.",
    });
  };
  const handleClearLeaderboard = async () => {
    try {
      setClearingLeaderboard(true);
      await clearTable("leaderboard_results");
    } finally {
      setClearingLeaderboard(false);
    }
  };
  const clearTable = async (tableName: TableName) => {
    try {
      const { error } = await supabase.from(tableName).delete().not("id", "is", null);

      if (error) throw error;

      toast({
        title: "Tabela limpa!",
        description: `Todos os dados de ${tableName} foram removidos.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível limpar a tabela.";
      toast({
        title: "Erro ao limpar tabela",
        description: message,
        variant: "destructive",
      });
    }
  };

  const cardBaseClass =
    "border border-white/10 bg-white/5/80 backdrop-blur rounded-3xl shadow-[0_32px_120px_-70px_rgba(147,51,234,0.55)]";
  const sampleBoxClass = "rounded-2xl border border-white/10 bg-background/70 p-4 text-xs leading-relaxed text-muted-foreground/90";

  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <AppSidebar collapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <main className="relative flex-1 overflow-hidden bg-[radial-gradient(140%_140%_at_0%_-20%,rgba(147,51,234,0.22)_0%,rgba(17,24,39,0.92)_45%,rgba(3,7,18,1)_100%)]">
        <div className="border-b border-white/10 bg-white/5/10 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-12">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70">Admin</p>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Central de Administração</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie dados da Arena, rankings e benchmarks em um só lugar.
              </p>
            </div>
            <Badge className="rounded-full border border-primary/40 bg-primary/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-primary">
              Acesso Restrito
            </Badge>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[110rem] flex-col gap-8 px-6 py-8 sm:px-10 lg:px-12">
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_40px_140px_-70px_rgba(147,51,234,0.6)] sm:p-10">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 right-16 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute bottom-0 left-12 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
              </div>
              <div className="relative grid gap-6 sm:grid-cols-3">
                {quickStats.map(({ icon: Icon, label, value, hint }) => (
                  <div key={label} className="flex items-start justify-between gap-5 rounded-2xl border border-white/10 bg-white/5/60 p-5">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/70">{label}</p>
                      <p className="text-3xl font-semibold text-foreground">{value}</p>
                      <p className="text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <span className="rounded-2xl border border-primary/30 bg-primary/10 p-2 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <Card className={cardBaseClass}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="w-fit rounded-full border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                      Local
                    </Badge>
                    <CardTitle className="text-xl text-foreground">Histórico de Chats</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Remove todos os chats salvos localmente na aplicação. Não afeta dados persistidos no banco.
                    </p>
                  </div>
                  <span className="rounded-2xl border border-white/10 bg-white/10 p-2 text-muted-foreground">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Button
                    variant="destructive"
                    onClick={handleClearHistory}
                    disabled={uploading}
                    className="w-full rounded-2xl"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Limpar histórico local
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Utilize esta ação caso esteja configurando um novo ambiente ou precise reiniciar testes.
                  </p>
                </CardContent>
              </Card>
              <Card className={cardBaseClass}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="w-fit rounded-full border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                      Leaderboard
                    </Badge>
                    <CardTitle className="text-xl text-foreground">Ranking Consolidado</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Limpa todos os registros da tabela de ranking do leaderboard para iniciar uma nova apuração.
                    </p>
                  </div>
                  <span className="rounded-2xl border border-white/10 bg-white/10 p-2 text-muted-foreground">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Button
                    variant="destructive"
                    onClick={handleClearLeaderboard}
                    disabled={clearingLeaderboard}
                    className="w-full rounded-2xl"
                  >
                    {clearingLeaderboard ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Limpando ranking...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" /> Limpar ranking do leaderboard
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Esta ação remove todos os modelos ranqueados e libera a tabela <code>leaderboard_results</code>.
                  </p>
                </CardContent>
              </Card>

              {uploadSections.map(section => {
                const InputIcon = section.icon;
                const inputId = `${section.key}-upload`;
                return (
                  <Card
                    key={section.key}
                    className={cn(cardBaseClass, section.wide && "xl:col-span-2")}
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div className="space-y-2">
                        {section.highlight && (
                          <Badge variant="outline" className="w-fit rounded-full border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                            {section.highlight}
                          </Badge>
                        )}
                        <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                          <InputIcon className="h-5 w-5 text-primary" />
                          {section.title}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                      <span className="rounded-2xl border border-white/10 bg-white/10 p-2 text-muted-foreground">
                        <ShieldCheck className="h-5 w-5" />
                      </span>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <input
                          id={inputId}
                          type="file"
                          accept=".json"
                          onChange={event => handleFileUpload(event, section.key)}
                          className="hidden"
                        />
                        <Button
                          onClick={() => document.getElementById(inputId)?.click()}
                          disabled={uploading}
                          className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground hover:from-primary/90 hover:to-accent"
                        >
                          <Upload className="mr-2 h-4 w-4" /> Upload JSON
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => clearTable(section.table)}
                          disabled={uploading}
                          className="w-full rounded-2xl"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Limpar tabela
                        </Button>
                      </div>
                      <div className={sampleBoxClass}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">
                          Formato esperado
                        </p>
                        <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">{section.sample}</pre>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
