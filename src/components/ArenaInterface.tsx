import { useMemo, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Trophy, Timer, ThumbsUp, Lightbulb, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useChatHistory } from "@/context/ChatHistoryContext";
import type { ChatHistoryEntry, ChatTurn, ChatTurnOutput } from "@/context/ChatHistoryContext";
import { cn } from "@/lib/utils";

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
    appendTurn,
    setTurnWinner,
    setCurrentChat,
  } = useChatHistory();
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatTurn[]>([]);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [useMockData, setUseMockData] = useState(false);
  const activeChat = useMemo(
    () => chatHistory.find(chat => chat.id === currentChatId) ?? null,
    [chatHistory, currentChatId]
  );
  const promptSuggestions = [
    "Explique como funciona a inteligência artificial",
    "Escreva um código Python para calcular fibonacci",
    "Qual é a diferença entre machine learning e deep learning?",
    "Crie uma receita de bolo de chocolate",
    "Explique a teoria da relatividade de Einstein",
    "Como funciona o algoritmo de ordenação quicksort?",
  ];
  useEffect(() => {
    if (!activeChat) {
      setConversation([]);
      return;
    }

    if (Array.isArray(activeChat.turns) && activeChat.turns.length > 0) {
      setConversation(
        activeChat.turns.map(turn => ({
          ...turn,
          outputs: Array.isArray(turn.outputs) ? [...turn.outputs] : [],
          winnerOutputId: turn.winnerOutputId ?? null,
          winnerModelId: turn.winnerModelId ?? null,
          winnerModelName: turn.winnerModelName ?? null,
        }))
      );
    } else {
      setConversation([]);
    }
  }, [activeChat]);

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
  const latestTurn = useMemo(() => {
    if (conversation.length === 0) return null;
    return conversation[conversation.length - 1];
  }, [conversation]);

  const latestOutputs = useMemo<ChatTurnOutput[]>(() => {
    if (!latestTurn) return [];
    return latestTurn.outputs ?? [];
  }, [latestTurn]);

  const outputsById = useMemo(() => {
    return latestOutputs.reduce<Record<string, ChatTurnOutput>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [latestOutputs]);

  const getWinnerInfoForTurn = useCallback(
    (turn: ChatTurn | null): { outputId: string | null; modelName: string | null } => {
      if (!turn) return { outputId: null, modelName: null };
      const outputs = Array.isArray(turn.outputs) ? turn.outputs : [];

      if (turn.winnerOutputId) {
        const matched = outputs.find(output => output.id === turn.winnerOutputId);
        return {
          outputId: turn.winnerOutputId,
          modelName:
            turn.winnerModelName ??
            matched?.modelName ??
            (matched ? getModelDisplayName(matched.modelId) : null),
        };
      }

      if (turn.winnerModelId) {
        const matchedByModelId = outputs.find(output => output.modelId === turn.winnerModelId);
        if (matchedByModelId) {
          return {
            outputId: matchedByModelId.id,
            modelName:
              turn.winnerModelName ??
              matchedByModelId.modelName ??
              getModelDisplayName(matchedByModelId.modelId),
          };
        }
      }

      if (turn.winnerModelName) {
        const normalized = turn.winnerModelName.trim().toLowerCase();
        const matchedByName = outputs.find(output => {
          const label =
            (output.modelName || getModelDisplayName(output.modelId)).trim().toLowerCase();
          return label === normalized;
        });
        if (matchedByName) {
          return {
            outputId: matchedByName.id,
            modelName: turn.winnerModelName,
          };
        }
        return {
          outputId: null,
          modelName: turn.winnerModelName,
        };
      }

      return { outputId: null, modelName: null };
    },
    []
  );

  const restoreVoteState = useCallback(
    (turn: ChatTurn | null) => {
      const winnerInfo = getWinnerInfoForTurn(turn);
      if (winnerInfo.outputId) {
        setHasVoted(true);
        setVotedFor(winnerInfo.outputId);
      } else {
        setHasVoted(false);
        setVotedFor(null);
      }
    },
    [getWinnerInfoForTurn]
  );

  useEffect(() => {
    restoreVoteState(latestTurn ?? null);
  }, [latestTurn, restoreVoteState]);
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
    const configuredBase = import.meta.env.VITE_API_TCC_BASE_URL?.trim();
    const baseWithoutTrailingSlash = configuredBase?.replace(/\/$/, "");
    const endpoint =
      baseWithoutTrailingSlash && baseWithoutTrailingSlash.length > 0
        ? baseWithoutTrailingSlash.endsWith("/infer")
          ? baseWithoutTrailingSlash
          : `${baseWithoutTrailingSlash}/infer`
        : "http://localhost:8000/infer";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const forwardedHost = import.meta.env.VITE_API_TCC_FORWARD_HOST?.trim();
    if (forwardedHost) {
      headers["X-Forwarded-Host"] = forwardedHost;
    }
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          prompt: prompt
        })
      });
      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}${
            responseText ? ` - ${responseText.slice(0, 200)}` : ""
          }`
        );
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        return await response.json();
      }
      const responseText = await response.text();
      try {
        return JSON.parse(responseText);
      } catch {
        throw new Error(
          responseText
            ? `Não foi possível interpretar a resposta da API (${responseText.slice(0, 200)})`
            : "Não foi possível interpretar a resposta da API."
        );
      }
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
    const existingChatId = currentChatId;
    let chatId = existingChatId ?? null;

    setIsRunning(true);
    setHasVoted(false);
    setVotedFor(null);
    setPendingPrompt(currentPrompt);

    try {
      const now = () =>
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const requestStart = now();
      const apiResponse = useMockData
        ? await generateMockResponse(currentPrompt)
        : await sendPromptToEndpoint(currentPrompt);
      console.log("API TCC response:", apiResponse);
      const totalDuration = Math.round(now() - requestStart);
      const results = Array.isArray(apiResponse)
        ? apiResponse
        : Array.isArray(apiResponse?.results)
          ? apiResponse.results
          : [];
      if (results.length === 0) {
        throw new Error("Nenhuma resposta retornada pela API TCC.");
      }
      const processedOutputs: ChatTurnOutput[] = results.map((result: any, index: number) => {
        const outputId = `output${index + 1}`;
        const rawModelId = typeof result?.model === "string" ? result.model : outputId;
        const modelName = getModelDisplayName(rawModelId);
        const inferenceSeconds =
          typeof result?.inference_seconds === "number" ? result.inference_seconds : null;
        const responseText =
          typeof result?.response === "string" && result.response.trim().length > 0
            ? result.response.trim()
            : "Resposta não disponível";
        return {
          id: outputId,
          modelId: rawModelId,
          modelName,
          response: responseText,
          responseTimeMs: inferenceSeconds !== null ? Math.round(inferenceSeconds * 1000) : totalDuration,
        };
      });

      if (!chatId) {
        chatId = addChat(currentPrompt);
      }

      const turnTimestamp = new Date().toISOString();
      const turn: ChatTurn = {
        id: `${chatId}-${turnTimestamp}`,
        prompt: currentPrompt,
        timestamp: turnTimestamp,
        outputs: processedOutputs,
        winnerOutputId: null,
        winnerModelId: null,
        winnerModelName: null,
      };

      appendTurn(chatId, turn);
      setConversation(prev => (chatId === existingChatId ? [...prev, turn] : [turn]));
      setPrompt("");
      setCurrentChat(chatId);
      toast({
        title: "Resposta Recebida!",
        description: "O prompt foi processado com sucesso pela API TCC."
      });
    } catch (error) {
      console.error("Error running arena:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o prompt para a API TCC.",
        variant: "destructive"
      });
    } finally {
      setPendingPrompt(null);
      setIsRunning(false);
    }
  };
  const handleVote = async (outputId: string) => {
    if (hasVoted) return;
    if (!latestTurn || !currentChatId) return;
    const selectedOutput = outputsById[outputId];
    const selectedModelName = selectedOutput?.modelName ?? outputId;
    const selectedModelId = selectedOutput?.modelId ?? outputId;
    
    setVotedFor(outputId);
    setHasVoted(true);
    setConversation(prev =>
      prev.map(turn =>
        turn.id === latestTurn.id
          ? {
              ...turn,
              winnerOutputId: outputId,
              winnerModelId: selectedModelId,
              winnerModelName: selectedModelName,
            }
          : turn
      )
    );

    // Save vote to database
    const allOutputs = latestOutputs;
    
    try {
      const { error } = await supabase.from("arena_votes").insert({
        winner_model_id: selectedModelId,
        prompt: latestTurn.prompt || activeChat?.prompt || "",
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

    setTurnWinner(currentChatId, latestTurn.id, {
      outputId,
      modelId: selectedModelId,
      modelName: selectedModelName,
    });
    toast({
      title: "Voto Registrado!",
      description: selectedOutput
        ? `Você votou na resposta gerada pelo modelo ${selectedModelName}.`
        : "Voto registrado."
    });
  };

  const startNewChat = useCallback(() => {
    setPrompt("");
    setConversation([]);
    setPendingPrompt(null);
    setCurrentChat(null);
    setHasVoted(false);
    setVotedFor(null);
    setIsRunning(false);
  }, [setCurrentChat]);

  const loadChatFromHistory = useCallback((chat: ChatHistoryEntry) => {
    const turns = Array.isArray(chat.turns)
      ? chat.turns.map(turn => ({
          ...turn,
          outputs: Array.isArray(turn.outputs) ? [...turn.outputs] : [],
          winnerOutputId: turn.winnerOutputId ?? null,
          winnerModelId: turn.winnerModelId ?? null,
          winnerModelName: turn.winnerModelName ?? null,
        }))
      : [];

    setCurrentChat(chat.id);
    setConversation(turns);
    setPrompt("");
    setPendingPrompt(null);
    setIsRunning(false);
    const latestSavedTurn = turns.length > 0 ? turns[turns.length - 1] : null;
    restoreVoteState(latestSavedTurn ?? null);
  }, [restoreVoteState, setCurrentChat]);

  useImperativeHandle(
    ref,
    () => ({
      startNewChat,
      loadChat: loadChatFromHistory,
    }),
    [startNewChat, loadChatFromHistory]
  );

  const turnsForDisplay = useMemo(() => [...conversation].reverse(), [conversation]);
  const hasAnyResponses = conversation.length > 0;
  const currentPromptLabel = latestTurn?.prompt ?? pendingPrompt ?? "";
  const outputsCount = latestOutputs.length;
  const isProcessing = isRunning;

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(140%_140%_at_0%_-20%,rgba(147,51,234,0.18)_0%,rgba(15,23,42,0.88)_45%,rgba(2,6,23,1)_100%)]">
      <div className="border-b border-white/10 bg-white/5/10 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex-1 min-w-[260px] space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-primary/70">Arena</p>
            <h1 className="text-lg font-semibold text-foreground sm:text-xl">
              Encontre a melhor IA para você
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Faça perguntas, compare respostas entre modelos e registre seu feedback.
            </p>
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
        <div
          className={cn(
            "mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8",
            !hasAnyResponses && "min-h-[70vh] justify-center"
          )}
        >
          {isProcessing && pendingPrompt && (
            <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-background/85 to-background shadow-[0_50px_140px_-80px_rgba(147,51,234,0.6)]">
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 right-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
                <div className="absolute bottom-0 left-12 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
              </div>
              <div className="relative space-y-6 p-6 sm:p-10">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/70">Processando</p>
                    <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Gerando respostas...</h2>
                    <p className="max-w-3xl text-sm text-muted-foreground">
                      Prompt enviado:{" "}
                      <span className="font-medium text-primary/85">{pendingPrompt}</span>
                    </p>
                  </div>
                </div>
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="mt-4 text-base font-semibold text-foreground">Consultando modelos...</p>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Estamos analisando as respostas dos modelos selecionados. Isso pode levar alguns segundos.
                  </p>
                </div>
              </div>
            </section>
          )}

          {turnsForDisplay.map((turn, index) => {
            const isLatest = index === 0;
            const turnOutputs = Array.isArray(turn.outputs) ? turn.outputs : [];
            const turnOutputsCount = turnOutputs.length;
            const turnDate = new Date(turn.timestamp).toLocaleString();
            const storedWinner = getWinnerInfoForTurn(turn);
            const fallbackLatestWinnerId =
              !storedWinner.outputId && isLatest && hasVoted ? votedFor : null;
            const fallbackLatestWinnerName = (() => {
              if (storedWinner.modelName || !isLatest || !fallbackLatestWinnerId) return null;
              const fallbackOutput = outputsById[fallbackLatestWinnerId];
              if (!fallbackOutput) return null;
              return (
                fallbackOutput.modelName ||
                getModelDisplayName(fallbackOutput.modelId)
              );
            })();
            const resolvedWinnerOutputId = storedWinner.outputId ?? fallbackLatestWinnerId;
            const resolvedWinnerModelName =
              storedWinner.modelName ?? fallbackLatestWinnerName ?? null;
            const hasResolvedWinner = Boolean(resolvedWinnerOutputId);
            return (
              <section
                key={turn.id}
                className={cn(
                  "relative overflow-hidden rounded-3xl border bg-gradient-to-br shadow-[0_40px_120px_-80px_rgba(147,51,234,0.55)]",
                  isLatest
                    ? "border-primary/30 from-primary/10 via-background/85 to-background"
                    : "border-white/10 from-background/80 via-background/95 to-background"
                )}
              >
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -top-24 right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
                  <div className="absolute bottom-0 left-12 h-72 w-72 rounded-full bg-accent/8 blur-3xl" />
                </div>
                <div className="relative space-y-8 p-6 sm:p-10">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em]">
                        <span className={cn(isLatest ? "text-primary/70" : "text-muted-foreground/70")}>
                          {isLatest ? "Resultado atual" : "Histórico"}
                        </span>
                        <span className="text-muted-foreground/60">•</span>
                        <span className="text-muted-foreground/60">{turnDate}</span>
                      </div>
                      <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                        Comparativo de Respostas
                      </h2>
                      <p className="max-w-3xl text-sm text-muted-foreground">
                        Prompt analisado:{" "}
                        <span className="font-medium text-primary/85">{turn.prompt}</span>
                      </p>
                    </div>
                    <div
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-semibold",
                        isLatest
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-white/10 bg-white/5 text-muted-foreground/80"
                      )}
                    >
                      {turnOutputsCount} {turnOutputsCount === 1 ? "resposta" : "respostas"}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
                    {turnOutputs.map((item, turnIndex) => {
                      const outputId = item.id;
                      const modelLabel = item.modelName || getModelDisplayName(item.modelId);
                      const isWinner = hasResolvedWinner && resolvedWinnerOutputId === outputId;
                      const isRunnerUp = hasResolvedWinner && resolvedWinnerOutputId !== outputId;
                      const answerText =
                        item.response && item.response.length > 0 ? item.response : "Resposta não disponível";
                      const durationMs = Number.isFinite(item.responseTimeMs) ? item.responseTimeMs : 0;

                      return (
                        <Card
                          key={outputId}
                          className={cn(
                            "overflow-hidden border border-white/10 bg-white/5 backdrop-blur transition-all duration-300",
                            isLatest
                              ? "shadow-[0_30px_90px_-70px_rgba(79,70,229,0.6)] hover:border-primary/50 hover:shadow-[0_45px_120px_-70px_rgba(147,51,234,0.7)]"
                              : "shadow-[0_24px_70px_-70px_rgba(79,70,229,0.35)]",
                            isWinner && "border-primary/60 bg-primary/15"
                          )}
                        >
                          <CardHeader className="flex flex-col gap-3 border-b border-white/10 bg-white/5 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-1">
                                <CardTitle className="text-lg font-semibold text-foreground sm:text-xl">
                                  Modelo {String.fromCharCode(65 + turnIndex)}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">{modelLabel}</p>
                              </div>
                              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sidebar-foreground/70">
                                <Timer className="h-4 w-4 text-primary" />
                                <span>{formatTime(durationMs)}</span>
                              </div>
                            </div>
                            {isWinner && (
                              <Badge className="w-fit border border-primary/50 bg-primary/20 text-primary">
                                Selecionado
                              </Badge>
                            )}
                            {isRunnerUp && (
                              <Badge className="w-fit border border-white/10 bg-white/5 text-muted-foreground">
                                Não selecionado
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className="p-5">
                            <p className="min-h-[150px] whitespace-pre-line text-lg leading-relaxed text-foreground sm:text-xl">
                              {answerText}
                            </p>
                            {isLatest && !hasResolvedWinner && (
                              <Button
                                onClick={() => handleVote(outputId)}
                                className="mt-5 w-full rounded-2xl bg-gradient-to-r from-primary to-primary/70 py-5 text-base font-semibold text-primary-foreground shadow-[0_20px_50px_-30px_rgba(147,51,234,0.7)] hover:from-primary/90 hover:to-accent"
                              >
                                <ThumbsUp className="mr-2 h-4 w-4" /> Votar nesta resposta
                              </Button>
                            )}
                            {hasResolvedWinner && resolvedWinnerOutputId === outputId && (
                              <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/10 p-4">
                                <div className="mb-2 flex items-center gap-3">
                                  <Trophy className="h-6 w-6 text-primary" />
                                  <h4 className="text-lg font-semibold text-primary">Seu voto contabilizado</h4>
                                </div>
                                <p className="text-sm text-foreground">
                                  Você escolheu{" "}
                                  <span className="font-medium">
                                    {resolvedWinnerModelName ?? modelLabel}
                                  </span>{" "}
                                  como melhor resposta.
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
            );
          })}

          <div
            className={cn(
              "flex justify-center transition-all duration-300",
              showSuggestions ? "pt-20 sm:pt-24" : hasAnyResponses ? "pt-16 sm:pt-20" : "pt-24 sm:pt-28"
            )}
          >
            <section className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_30px_80px_-50px_rgba(147,51,234,0.6)] sm:p-6">
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
              {!hasAnyResponses && !isProcessing && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Clique no botão de ideias para acessar sugestões ou descreva seu próprio cenário no campo abaixo.
                </p>
              )}
              <div className="relative mt-6">
                {showSuggestions && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity"
                      onClick={() => setShowSuggestions(false)}
                    />
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 sm:px-6">
                      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-[#1b1242]/95 via-[#090e28]/96 to-[#040817]/98 p-6 shadow-[0_45px_160px_-70px_rgba(147,51,234,0.95)] backdrop-blur-2xl">
                        <button
                          type="button"
                          onClick={() => setShowSuggestions(false)}
                          aria-label="Fechar sugestões"
                          className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 p-2 text-muted-foreground transition hover:border-primary/40 hover:bg-primary/25 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="flex flex-col gap-2 pr-10">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-primary/60">
                            Sugestões
                          </p>
                          <h4 className="text-2xl font-semibold text-foreground">Precisa de inspiração rápida?</h4>
                          <p className="text-sm text-muted-foreground/80">
                            Selecione um dos prompts abaixo para preencher o campo automaticamente e iniciar um desafio.
                          </p>
                        </div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                          {promptSuggestions.map((suggestion, index) => (
                            <button
                              key={`${suggestion}-${index}`}
                              type="button"
                              onClick={() => {
                                setPrompt(suggestion);
                                setShowSuggestions(false);
                              }}
                              className="group flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left text-sm text-foreground transition-all hover:border-primary/60 hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99]"
                            >
                              <span className="font-medium leading-snug transition-colors group-hover:text-white group-active:text-white group-focus:text-white">
                                {suggestion}
                              </span>
                              <span className="rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                                Usar
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                <button
                  type="button"
                  onClick={() => setShowSuggestions(prev => !prev)}
                  aria-label={showSuggestions ? "Ocultar sugestões" : "Mostrar sugestões"}
                  className="absolute bottom-5 right-20 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary shadow-[0_15px_40px_-25px_rgba(147,51,234,0.8)] transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95 sm:right-24"
                >
                  {showSuggestions ? <X className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
                </button>

                <Button
                  onClick={runArena}
                  disabled={isRunning || !prompt.trim()}
                  className="absolute bottom-5 right-5 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-0 text-primary-foreground shadow-[0_25px_60px_-30px_rgba(147,51,234,0.8)] transition hover:from-primary/90 hover:to-accent"
                >
                  {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ArenaInterface;
