import { useMemo, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Trophy, Timer, ThumbsUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useChatHistory } from "@/context/ChatHistoryContext";
import type { ChatHistoryEntry } from "@/context/ChatHistoryContext";
import { cn } from "@/lib/utils";

interface ModelResponse {
  modelId: string;
  response: string;
  responseTime: number;
  isLoading: boolean;
}
interface OutputDetails {
  id: string;
  modelId: string;
  modelName: string;
  response: string;
  responseTimeMs: number;
}

export interface ArenaInterfaceHandle {
  startNewChat: () => void;
  loadChat: (chat: ChatHistoryEntry) => void;
}
const getModelDisplayName = (modelId: string): string => {
  if (!modelId) {
    return "Modelo desconhecido";
  }
  const cleanId = modelId.trim();
  const parts = cleanId.split("/").filter(Boolean);
  const lastSegment = parts[parts.length - 1];
  if (lastSegment && lastSegment.length > 0) {
    return lastSegment;
  }
  return cleanId;
};
const ArenaInterface = forwardRef<ArenaInterfaceHandle>((_, ref) => {
  const {
    history: chatHistory,
    currentChatId,
    addChat,
    updateChat,
    setCurrentChat,
  } = useChatHistory();
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [fastestResponses, setFastestResponses] = useState<ModelResponse[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<OutputDetails[]>([]);
  const [useMockData, setUseMockData] = useState(true);
  const promptSuggestions = [
    "Explique como funciona a inteligência artificial",
    "Escreva um código Python para calcular fibonacci",
    "Qual é a diferença entre machine learning e deep learning?",
    "Crie uma receita de bolo de chocolate",
    "Explique a teoria da relatividade de Einstein",
    "Como funciona o algoritmo de ordenação quicksort?",
  ];
  const heroModels = ["Gemini Pro", "Claude 3", "GPT-5", "DeepSeek", "LLaMA 3", "Mixtral"];

  useEffect(() => {
    if (!currentChatId) return;
    const target = chatHistory.find(chat => chat.id === currentChatId);
    if (target) {
      setPrompt(target.prompt);
    }
  }, [currentChatId, chatHistory]);
  const formatTime = (milliseconds: number): string => {
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)}ms`;
    }
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };
  const derivedOutputs = useMemo<OutputDetails[]>(() => {
    if (outputs.length > 0) {
      return outputs;
    }

    const parsed: OutputDetails[] = [];
    fastestResponses.forEach(response => {
      if (!response?.response) return;
      try {
        const payload = JSON.parse(response.response);
        const data = Array.isArray(payload?.outputs) ? payload.outputs : [];
        data.forEach((item: any, index: number) => {
          const outputId = typeof item?.id === "string" ? item.id : `output${index + 1}`;
          parsed.push({
            id: outputId,
            modelId: typeof item?.modelId === "string" ? item.modelId : outputId,
            modelName: typeof item?.modelName === "string" ? item.modelName : getModelDisplayName(item?.modelId ?? outputId),
            response: typeof item?.response === "string" ? item.response : "",
            responseTimeMs: typeof item?.responseTimeMs === "number" ? item.responseTimeMs : 0,
          });
        });
      } catch (error) {
        console.error("Error parsing fallback outputs:", error);
      }
    });
    return parsed;
  }, [outputs, fastestResponses]);

  const outputsById = useMemo(() => {
    return derivedOutputs.reduce<Record<string, OutputDetails>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [derivedOutputs]);
  const generateMockResponse = async (prompt: string): Promise<any> => {
    // Simular delay da API
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    
    const mockModels = [
      { id: "google/gemini-2.5-pro", name: "Gemini Pro" },
      { id: "openai/gpt-5", name: "GPT-5" }
    ];

    const mockResponses = [
      `Esta é uma resposta simulada para "${prompt}". O modelo está processando sua solicitação com base em vastos conjuntos de dados de treinamento. A inteligência artificial moderna utiliza redes neurais profundas para compreender e gerar texto de forma contextualizada, analisando padrões complexos nos dados de treinamento.`,
      `Resposta mock gerada: ${prompt}. Esta resposta demonstra capacidades avançadas de compreensão de linguagem natural e geração de texto contextualizado. Os modelos de linguagem são treinados em bilhões de parâmetros para fornecer respostas precisas e relevantes ao contexto fornecido pelo usuário.`
    ];

    const results = mockModels.map((model, index) => ({
      model: model.id,
      response: mockResponses[index],
      inference_seconds: 0.5 + Math.random() * 2
    }));

    return { results };
  };

  const sendPromptToEndpoint = async (prompt: string): Promise<any> => {
    const baseUrl = import.meta.env.VITE_API_TCC_BASE_URL ?? "http://localhost:8000";
    const endpoint = `${baseUrl.replace(/\/$/, "")}/infer`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: prompt
        })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error sending prompt to endpoint:", error);
      throw error;
    }
  };
  const runArena = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um prompt para continuar.",
        variant: "destructive"
      });
      return;
    }
    const currentPrompt = prompt.trim();

    // Create new chat entry
    const chatId = addChat(currentPrompt);

    setIsRunning(true);
    setFastestResponses([]);
    setHasVoted(false);
    setVotedFor(null);
    setOutputs([]);

    // Clear the prompt input
    setPrompt("");

    // Show loading state
    const loadingResponse: ModelResponse = {
      modelId: "api-tcc",
      response: "",
      responseTime: 0,
      isLoading: true
    };
    setFastestResponses([loadingResponse]);
    try {
      const now = () => typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      const requestStart = now();
      const apiResponse = useMockData 
        ? await generateMockResponse(currentPrompt)
        : await sendPromptToEndpoint(currentPrompt);
      const totalDuration = Math.round(now() - requestStart);
      const results = Array.isArray(apiResponse?.results) ? apiResponse.results : [];
      if (results.length === 0) {
        throw new Error("Nenhuma resposta retornada pela API TCC.");
      }
      const processedOutputs: OutputDetails[] = results.map((result: any, index: number) => {
        const outputId = `output${index + 1}`;
        const rawModelId = typeof result?.model === "string" ? result.model : outputId;
        const modelName = getModelDisplayName(rawModelId);
        const inferenceSeconds = typeof result?.inference_seconds === "number" ? result.inference_seconds : null;
        const responseText = typeof result?.response === "string" && result.response.trim().length > 0 ? result.response.trim() : "Resposta não disponível";
        return {
          id: outputId,
          modelId: rawModelId,
          modelName,
          response: responseText,
          responseTimeMs: inferenceSeconds !== null ? Math.round(inferenceSeconds * 1000) : totalDuration
        };
      });
      setOutputs(processedOutputs);
      const responsePayload = {
        outputs: processedOutputs.map(({
          id,
          modelId,
          modelName,
          response: text,
          responseTimeMs
        }) => ({
          id,
          modelId,
          modelName,
          response: text,
          responseTimeMs
        }))
      };
      const finalResponse: ModelResponse = {
        modelId: "api-tcc",
        response: JSON.stringify(responsePayload),
        responseTime: totalDuration,
        isLoading: false
      };
      setFastestResponses([finalResponse]);
      toast({
        title: "Resposta Recebida!",
        description: "O prompt foi processado com sucesso pela API TCC."
      });
    } catch (error) {
      setFastestResponses([]);
      setOutputs([]);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o prompt para a API TCC.",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };
  const handleVote = async (outputId: string) => {
    if (hasVoted) return;
    const selectedOutput = outputsById[outputId];
    const selectedModelName = selectedOutput?.modelName ?? outputId;
    const selectedModelId = selectedOutput?.modelId ?? outputId;
    
    setVotedFor(outputId);
    setHasVoted(true);

    // Save vote to database
    const currentChat = chatHistory.find(c => c.id === currentChatId);
    const allOutputs = Object.values(outputsById);
    
    try {
      const { error } = await supabase.from("arena_votes").insert({
        winner_model_id: selectedModelId,
        prompt: currentChat?.prompt || "",
        model_a_id: allOutputs[0]?.modelId || "",
        model_b_id: allOutputs[1]?.modelId || "",
        technique: "Modelo base", // Default technique - can be enhanced later
        task: "Geração de Texto" // Default task - can be enhanced later
      });

      if (error) {
        console.error("Error saving vote:", error);
        toast({
          title: "Erro ao salvar voto",
          description: "O voto foi registrado localmente, mas não foi salvo no banco de dados.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error saving vote:", error);
    }

    if (currentChatId) {
      updateChat(currentChatId, { winner: selectedModelName });
    }
    
  toast({
      title: "Voto Registrado!",
      description: selectedOutput ? `Você votou na resposta gerada pelo modelo ${selectedModelName}.` : "Voto registrado."
    });
  };

  const startNewChat = useCallback(() => {
    setPrompt("");
    setFastestResponses([]);
    setCurrentChat(null);
    setHasVoted(false);
    setVotedFor(null);
    setOutputs([]);
  }, [setCurrentChat]);

  const loadChatFromHistory = useCallback((chat: ChatHistoryEntry) => {
    setPrompt(chat.prompt);
    setCurrentChat(chat.id);
    setFastestResponses([]);
    setHasVoted(false);
    setVotedFor(null);
    setOutputs([]);
  }, [setCurrentChat]);

  useImperativeHandle(
    ref,
    () => ({
      startNewChat,
      loadChat: loadChatFromHistory,
    }),
    [startNewChat, loadChatFromHistory]
  );

  const currentPromptLabel = currentChatId
    ? chatHistory.find(entry => entry.id === currentChatId)?.prompt ?? ""
    : "";
  const hasAnyResponses = fastestResponses.length > 0;
  const hasCompletedResponses = fastestResponses.some(response => !response.isLoading);
  const isProcessing = hasAnyResponses && !hasCompletedResponses;
  const outputsCount = derivedOutputs.length;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(140%_140%_at_0%_-20%,rgba(147,51,234,0.18)_0%,rgba(15,23,42,0.88)_45%,rgba(2,6,23,1)_100%)]">
      <div className="border-b border-white/10 bg-white/5/10 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-primary/70">Arena</p>
            <h2 className="text-base font-semibold text-sidebar-foreground">Comparador de Modelos</h2>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 shadow-[0_18px_40px_-25px_rgba(147,51,234,0.8)]">
            <Label htmlFor="mock-mode" className="text-sm font-medium text-sidebar-foreground">
              {useMockData ? "Modo Mock" : "Endpoint Real"}
            </Label>
            <Switch id="mock-mode" checked={useMockData} onCheckedChange={setUseMockData} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
          {!hasAnyResponses ? (
            <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(147,51,234,0.22),rgba(59,130,246,0.12)_45%,rgba(15,23,42,0.55))] px-6 py-14 sm:px-10 shadow-[0_40px_120px_-60px_rgba(79,70,229,0.6)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 left-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
              </div>
              <div className="relative flex flex-col items-center gap-10 text-center">
                <div className="flex flex-wrap justify-center gap-3">
                  {heroModels.map(model => (
                    <span
                      key={model}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold text-sidebar-foreground shadow-[0_20px_50px_-30px_rgba(147,51,234,0.7)]"
                    >
                      {model.charAt(0)}
                    </span>
                  ))}
                </div>
                <div className="space-y-4 sm:space-y-6">
                  <h1 className="text-balance text-4xl font-bold text-foreground sm:text-6xl lg:text-7xl">
                    Encontre a melhor IA para você
                  </h1>
                  <p className="mx-auto max-w-3xl text-balance text-base text-muted-foreground sm:text-lg">
                    Faça perguntas, compare respostas entre modelos e registre seu feedback para evoluir a comunidade.
                  </p>
                </div>
                <div className="grid gap-3 text-left text-sm text-sidebar-foreground/90 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner">
                    🔮 Benchmarks em tempo real
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner">
                    🧪 Experimente modos mock ou endpoint real
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner">
                    🏆 Escolha o modelo com melhor resposta
                  </div>
                </div>
              </div>
            </section>
          ) : isProcessing ? (
            <section className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-primary/25 bg-white/5 text-center shadow-[0_40px_120px_-70px_rgba(147,51,234,0.6)]">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
              <p className="mt-6 text-lg font-semibold text-foreground">Processando respostas...</p>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Estamos consultando os modelos selecionados. Este processo pode levar alguns segundos.
              </p>
            </section>
          ) : (
            <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/85 to-background shadow-[0_50px_140px_-80px_rgba(147,51,234,0.6)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute bottom-0 left-12 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
              </div>
              <div className="relative space-y-8 p-6 sm:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">Resultado</p>
                    <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Comparativo de Respostas</h2>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      Prompt analisado: {" "}
                      <span className="font-medium text-primary/85">
                        {currentPromptLabel || "Prompt não definido"}
                      </span>
                    </p>
                  </div>
                  <div className="rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                    {outputsCount} {outputsCount === 1 ? "resposta" : "respostas"}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                  {derivedOutputs.map((item, index) => {
                    const outputId = item.id;
                    const modelLabel = item.modelName || getModelDisplayName(item.modelId);
                    const isWinner = hasVoted && votedFor === outputId;
                    const isRunnerUp = hasVoted && votedFor !== outputId;
                    const answerText = item.response && item.response.length > 0 ? item.response : "Resposta não disponível";
                    const durationMs = Number.isFinite(item.responseTimeMs) ? item.responseTimeMs : 0;

                    return (
                      <Card
                        key={outputId}
                        className={cn(
                          "overflow-hidden border border-white/10 bg-white/5 backdrop-blur transition-all duration-300",
                          "shadow-[0_30px_90px_-70px_rgba(79,70,229,0.6)] hover:border-primary/50 hover:shadow-[0_45px_120px_-70px_rgba(147,51,234,0.7)]",
                          isWinner && "border-primary/60 bg-primary/15"
                        )}
                      >
                        <CardHeader className="flex flex-col gap-3 border-b border-white/10 bg-white/5 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1">
                              <CardTitle className="text-lg font-semibold text-foreground sm:text-xl">
                                Modelo {String.fromCharCode(65 + index)}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">{modelLabel}</p>
                            </div>
                            <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sidebar-foreground/70">
                              <Timer className="h-4 w-4 text-primary" />
                              <span>{formatTime(durationMs)}</span>
                            </div>
                          </div>
                          {isWinner && <Badge className="w-fit border border-primary/50 bg-primary/20 text-primary">Selecionado</Badge>}
                          {isRunnerUp && <Badge className="w-fit border border-white/10 bg-white/5 text-muted-foreground">Não selecionado</Badge>}
                        </CardHeader>
                        <CardContent className="p-5">
                          <p className="min-h-[150px] text-lg leading-relaxed whitespace-pre-line text-foreground sm:text-xl">
                            {answerText}
                          </p>
                          {!hasVoted && (
                            <Button
                              onClick={() => handleVote(outputId)}
                              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-primary to-primary/70 py-5 text-base font-semibold text-primary-foreground shadow-[0_20px_50px_-30px_rgba(147,51,234,0.7)] hover:from-primary/90 hover:to-accent"
                            >
                              <ThumbsUp className="mr-2 h-4 w-4" /> Votar nesta resposta
                            </Button>
                          )}
                          {hasVoted && votedFor === outputId && (
                            <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4">
                              <div className="mb-2 flex items-center gap-3">
                                <Trophy className="h-6 w-6 text-primary" />
                                <h4 className="text-lg font-semibold text-primary">Seu voto contabilizado</h4>
                              </div>
                              <p className="text-sm text-foreground">
                                Você escolheu <span className="font-medium">{modelLabel}</span> como melhor resposta.
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_70px_-60px_rgba(147,51,234,0.6)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">Sugestões</p>
                <h3 className="text-lg font-semibold text-sidebar-foreground sm:text-xl">Comece com uma ideia pronta</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha um prompt para testar rapidamente diferentes modelos na arena.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {promptSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion}-${index}`}
                  onClick={() => setPrompt(suggestion)}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/0 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/10"
                >
                  <span className="text-sm font-medium text-sidebar-foreground transition group-hover:text-primary-foreground/90">
                    {suggestion}
                  </span>
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    Usar
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>

      <div className="border-t border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,0.95))] backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_-50px_rgba(147,51,234,0.6)] sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-primary/70">Envie um desafio</p>
                <h3 className="text-lg font-semibold text-sidebar-foreground sm:text-xl">Compare respostas em segundos</h3>
              </div>
              {outputsCount > 0 && (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold text-primary">
                  {outputsCount} {outputsCount === 1 ? "resposta" : "respostas"} analisadas
                </span>
              )}
            </div>
            {fastestResponses.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Use um dos prompts sugeridos acima ou descreva seu próprio cenário no campo abaixo.
              </p>
            )}
            <div className="relative mt-6">
              <Textarea
                placeholder="Pergunte qualquer coisa..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[110px] resize-none rounded-2xl border border-white/10 bg-black/30 pr-16 text-base text-foreground placeholder:text-muted-foreground/60 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary sm:min-h-[130px] lg:min-h-[150px]"
                disabled={isRunning}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    runArena();
                  }
                }}
              />

              <Button
                onClick={runArena}
                disabled={isRunning || !prompt.trim()}
                className="absolute bottom-5 right-5 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-0 text-primary-foreground shadow-[0_25px_60px_-30px_rgba(147,51,234,0.8)] transition hover:from-primary/90 hover:to-accent"
              >
                {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ArenaInterface;
