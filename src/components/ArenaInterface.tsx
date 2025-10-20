import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Send, Trophy, Timer, ThumbsUp, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import gbcsrtLogo from "@/assets/gb-cs-rt-logo.png";
import Leaderboard from "./Leaderboard";
import { useChatHistory } from "@/context/ChatHistoryContext";
import type { ChatHistoryEntry } from "@/context/ChatHistoryContext";

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
const ArenaInterface = () => {
  const {
    history: chatHistory,
    currentChatId,
    addChat,
    updateChat,
    setCurrentChat,
  } = useChatHistory();
  const [currentView, setCurrentView] = useState<"chat" | "leaderboard">("chat");
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [fastestResponses, setFastestResponses] = useState<ModelResponse[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<OutputDetails[]>([]);
  const [useMockData, setUseMockData] = useState(true);
  const promptSuggestions = ["Explique como funciona a inteligência artificial", "Escreva um código Python para calcular fibonacci", "Qual é a diferença entre machine learning e deep learning?", "Crie uma receita de bolo de chocolate", "Explique a teoria da relatividade de Einstein", "Como funciona o algoritmo de ordenação quicksort?"];
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
  const outputsById = useMemo(() => {
    return outputs.reduce<Record<string, OutputDetails>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }, [outputs]);
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
  const startNewChat = () => {
    setCurrentView("chat");
    setPrompt("");
    setFastestResponses([]);
    setCurrentChat(null);
    setHasVoted(false);
    setVotedFor(null);
    setOutputs([]);
  };
  const loadChatFromHistory = (chat: ChatHistoryEntry) => {
    setPrompt(chat.prompt);
    setCurrentChat(chat.id);
    // You could reload the responses here if needed
  };
  return <div className="flex flex-col lg:flex-row h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <div className="w-full lg:w-80 bg-sidebar border-r border-sidebar-border flex flex-col max-h-screen overflow-hidden">
        <div className="p-4 overflow-y-auto">
          <div className="flex items-center gap-3 text-sidebar-foreground font-bold text-lg mb-6">
            <img src={gbcsrtLogo} alt="GB-CS-RT" className="w-8 h-8" />
            GB-CS-RT
          </div>
          
          <Button onClick={startNewChat} className="w-full justify-start gap-2 mb-4 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground">
            <MessageSquare size={16} />
            Novo Chat
          </Button>

          <Button 
            onClick={() => setCurrentView("leaderboard")} 
            variant={currentView === "leaderboard" ? "default" : "outline"}
            className="w-full justify-start gap-2 mb-2"
          >
            <TrendingUp size={16} />
            Leaderboard
          </Button>

          <Button 
            onClick={() => window.location.href = "/dashboard"} 
            variant="outline"
            className="w-full justify-start gap-2 mb-6"
          >
            <Trophy size={16} />
            Dashboard
          </Button>
          
          {/* Chat History */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-sidebar-foreground mb-3">Histórico</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {chatHistory.map(chat => <button key={chat.id} onClick={() => loadChatFromHistory(chat)} className="w-full text-left p-3 rounded-lg hover:bg-sidebar-accent/50 transition-colors group">
                  <div className="text-sm text-sidebar-foreground truncate mb-1">
                    {chat.prompt}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(chat.timestamp).toLocaleDateString()}
                    </span>
                    {chat.winner && <span className="flex items-center gap-1 text-winner">
                        <Trophy size={12} />
                        {chat.winner}
                      </span>}
                  </div>
                </button>)}
              {chatHistory.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum chat realizado ainda
                </p>}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {currentView === "leaderboard" ? (
          <Leaderboard />
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Toggle Mock/Real Mode */}
            <div className="border-b border-border bg-muted/30 px-8 py-4">
              <div className="flex items-center gap-3">
                <Switch
                  id="mock-mode"
                  checked={useMockData}
                  onCheckedChange={setUseMockData}
                />
                <Label htmlFor="mock-mode" className="text-sm font-medium cursor-pointer">
                  {useMockData ? "Modo Mock" : "Endpoint Real"}
                </Label>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
            {fastestResponses.length === 0 ? (/* Initial View */
          <div className="flex flex-col items-center justify-center h-full px-[32px]">
                {/* Model Icons */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">G</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-accent">C</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center">
                    <span className="text-sm font-bold text-secondary-foreground">G</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">D</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center">
                    <span className="text-sm font-bold text-accent">L</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/25 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">M</span>
                  </div>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-6xl lg:text-8xl font-bold text-foreground mb-8 text-center px-4">Encontre a melhor IA para você</h1>
                
                <p className="text-2xl text-muted-foreground text-center mb-16 max-w-5xl">Faça perguntas e obtenha respostas inteligentes, compare as respostas entre os diversos modelos e compartilhe o seu feedback </p>
              </div>) : (/* Results View */
           <div className="p-4 sm:p-6 lg:p-8">
                <div className="max-w-full mx-auto px-2 sm:px-4">
                  {/* Header */}
                  <div className="mb-6 sm:mb-8">
                    <h2 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">Respostas da IA</h2>
                    <p className="text-base sm:text-lg text-muted-foreground">Prompt: "{currentChatId ? chatHistory.find(c => c.id === currentChatId)?.prompt : ""}"</p>
                  </div>

                  {/* Results Display */}
                  <div className="w-full">
                    {fastestResponses.map((response, index) => {
                  const isLoading = response.isLoading;
                  const selectedOutput = votedFor ? outputsById[votedFor] : undefined;
                  return <div key={response.modelId} className="relative overflow-hidden">
                            {isLoading ? <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                <span className="ml-4 text-2xl text-muted-foreground">Processando...</span>
                              </div> : <div className="space-y-8">
                                {(() => {
                          try {
                            const parsedResponse = JSON.parse(response.response);
                            const outputsData = Array.isArray(parsedResponse?.outputs) ? parsedResponse.outputs : [];
                            if (outputsData.length === 0) {
                              return <div className="bg-muted rounded-lg p-12 min-h-[300px]">
                                          <p className="text-2xl leading-relaxed whitespace-pre-line">
                                            {response.response}
                                          </p>
                                        </div>;
                            }
                            return <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                        {outputsData.map((item: any, outputIndex: number) => {
                                  const outputId = typeof item?.id === "string" ? item.id : `output${outputIndex + 1}`;
                                  const outputLetter = String.fromCharCode(65 + outputIndex);
                                  const outputDetails = outputsById[outputId];
                                  const title = `Modelo ${outputLetter}`;
                                  const subtitle = hasVoted ? outputDetails?.modelId ?? "Modelo não identificado" : "";
                                  const isWinner = hasVoted && votedFor === outputId;
                                  const isRunnerUp = hasVoted && votedFor !== outputId;
                                  const durationMs = typeof item?.responseTimeMs === "number" ? item.responseTimeMs : response.responseTime;
                                  const answerText = typeof item?.response === "string" && item.response.length > 0 ? item.response : "Resposta não disponível";
                                  return <Card key={outputId} className="bg-card border-2 border-border hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-xl">
                                                <CardHeader className="pb-3 border-b border-border p-4 sm:p-6">
                                                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                      {isWinner && <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1 text-sm">
                                                          #1º Lugar
                                                        </Badge>}
                                                      {isRunnerUp && <Badge variant="outline" className="px-3 py-1 text-sm">
                                                          Finalista
                                                        </Badge>}
                                                      <div>
                                                        <h3 className="text-lg sm:text-xl font-bold text-foreground">
                                                          {title}
                                                        </h3>
                                                        {hasVoted && <p className="text-xs sm:text-sm text-muted-foreground break-all mt-0.5">
                                                            {subtitle}
                                                          </p>}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                      <Clock size={16} />
                                                      <span className="text-sm font-medium">{formatTime(durationMs)}</span>
                                                    </div>
                                                  </div>
                                                </CardHeader>

                                                <CardContent className="p-4 sm:p-6">
                                                  <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed whitespace-pre-line mb-4 sm:mb-6 text-foreground min-h-[150px]">
                                                    {answerText}
                                                  </p>
                                                  {!hasVoted && <Button onClick={() => handleVote(outputId)} className="w-full bg-primary hover:bg-primary/90 text-base py-5">
                                                      <ThumbsUp className="h-4 w-4 mr-2" />
                                                      Votar nesta resposta
                                                    </Button>}
                                                  {hasVoted && votedFor === outputId && (
                                                    <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 mt-4">
                                                      <div className="flex items-center gap-3 mb-2">
                                                        <Trophy className="h-6 w-6 text-primary" />
                                                        <h4 className="text-xl font-bold text-primary">Parabéns!</h4>
                                                      </div>
                                                      <p className="text-base text-foreground">
                                                        Você votou em: <span className="font-semibold">{subtitle}</span>
                                                      </p>
                                                    </div>
                                                  )}
                                                </CardContent>
                                              </Card>;
                                })}
                                      </div>;
                          } catch (err) {
                            console.error("Error parsing response:", err);
                            return <div className="bg-muted rounded-lg p-12 min-h-[300px]">
                                        <p className="text-2xl leading-relaxed whitespace-pre-line">
                                          {response.response}
                                        </p>
                                      </div>;
                          }
                        })()}
                              </div>}
                          </div>;
                })}
                  </div>
                </div>
              </div>)}
          </div>

          {/* Input Area - Always at bottom */}
          <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-6xl mx-auto p-3 sm:p-4 lg:p-6">
              {/* Suggestions - only show when no results */}
              {fastestResponses.length === 0 && <div className="mb-4">
                  <p className="text-lg sm:text-xl text-muted-foreground mb-3">Sugestões de prompt:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                    {promptSuggestions.map((suggestion, index) => <button key={index} onClick={() => setPrompt(suggestion)} className="text-left p-3 sm:p-4 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-base sm:text-lg">
                        {suggestion}
                      </button>)}
                  </div>
                </div>}
              
              <div className="relative">
                <Textarea placeholder="Pergunte qualquer coisa..." value={prompt} onChange={e => setPrompt(e.target.value)} className="min-h-[80px] sm:min-h-[100px] lg:min-h-[120px] text-base sm:text-lg resize-none pr-14 sm:pr-16 border-input bg-background" disabled={isRunning} onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  runArena();
                }
              }} />
                
                <Button onClick={runArena} disabled={isRunning || !prompt.trim()} className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 h-9 w-9 sm:h-10 sm:w-10 p-0 bg-primary hover:bg-primary/90">
                  {isRunning ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" /> : <Send className="h-4 w-4 sm:h-5 sm:w-5" />}
                </Button>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>;
};
export default ArenaInterface;
