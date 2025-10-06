import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Timer, ThumbsUp, MessageSquare, Clock, TrendingUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import gbcsrtLogo from "@/assets/gb-cs-rt-logo.png";
import Leaderboard from "./Leaderboard";
interface ModelResponse {
  modelId: string;
  response: string;
  responseTime: number;
  isLoading: boolean;
}
interface ChatHistory {
  id: string;
  prompt: string;
  timestamp: Date;
  winner?: string;
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
  const [currentView, setCurrentView] = useState<"chat" | "leaderboard">("chat");
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [fastestResponses, setFastestResponses] = useState<ModelResponse[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<OutputDetails[]>([]);
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
    const chatId = Date.now().toString();
    const newChat: ChatHistory = {
      id: chatId,
      prompt: currentPrompt,
      timestamp: new Date()
    };
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(chatId);
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
      const apiResponse = await sendPromptToEndpoint(currentPrompt);
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
  const handleVote = (outputId: string) => {
    if (hasVoted) return;
    const selectedOutput = outputsById[outputId];
    const selectedModelName = selectedOutput?.modelName ?? outputId;
    setVotedFor(outputId);
    setHasVoted(true);
    if (currentChatId) {
      setChatHistory(prev => prev.map(chat => chat.id === currentChatId ? {
        ...chat,
        winner: selectedModelName
      } : chat));
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
    setCurrentChatId(null);
    setHasVoted(false);
    setVotedFor(null);
    setOutputs([]);
  };
  const loadChatFromHistory = (chat: ChatHistory) => {
    setPrompt(chat.prompt);
    setCurrentChatId(chat.id);
    // You could reload the responses here if needed
  };
  return <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4">
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
            className="w-full justify-start gap-2 mb-6"
          >
            <TrendingUp size={16} />
            Leaderboard
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
                      {chat.timestamp.toLocaleDateString()}
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
                <h1 className="text-8xl font-bold text-foreground mb-8 text-center">Encontre a melhor IA para você</h1>
                
                <p className="text-2xl text-muted-foreground text-center mb-16 max-w-5xl">Faça perguntas e obtenha respostas inteligentes, compare as respostas entre os diversos modelos e compartilhe o seu feedback </p>
              </div>) : (/* Results View */
          <div className="p-12">
                <div className="max-w-full mx-auto px-8">
                  {/* Header */}
                  <div className="mb-12">
                    <h2 className="text-4xl font-semibold text-foreground mb-4">Resposta da IA</h2>
                    <p className="text-2xl text-muted-foreground">Prompt: "{currentChatId ? chatHistory.find(c => c.id === currentChatId)?.prompt : ""}"</p>
                  </div>

                  {/* Results Display */}
                  <div className="max-w-4xl mx-auto">
                    {fastestResponses.map((response, index) => {
                  const isLoading = response.isLoading;
                  const selectedOutput = votedFor ? outputsById[votedFor] : undefined;
                  return <Card key={response.modelId} className="relative overflow-hidden transition-all duration-300 hover:shadow-md">
                          <CardHeader className="pb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className="bg-primary text-primary-foreground text-xl px-6 py-3">
                                  API TCC
                                </Badge>
                                <div>
                                  <CardTitle className="text-3xl">
                                    Resposta da IA
                                  </CardTitle>
                                  <p className="text-xl text-muted-foreground">
                                    Processado via API TCC
                                  </p>
                                </div>
                              </div>
                              {!isLoading && <div className="flex items-center gap-1 text-xl text-muted-foreground">
                                  <Timer size={22} />
                                  {formatTime(response.responseTime)}
                                </div>}
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            {isLoading ? <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                <span className="ml-4 text-xl text-muted-foreground">Processando...</span>
                              </div> : <div className="space-y-6">
                                {(() => {
                          try {
                            const parsedResponse = JSON.parse(response.response);
                            const outputsData = Array.isArray(parsedResponse?.outputs) ? parsedResponse.outputs : [];
                            if (outputsData.length === 0) {
                              return <div className="bg-muted rounded-lg p-12 min-h-[300px]">
                                          <p className="text-xl leading-relaxed whitespace-pre-line">
                                            {response.response}
                                          </p>
                                        </div>;
                            }
                            return <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {outputsData.map((item: any, outputIndex: number) => {
                                  const outputId = typeof item?.id === "string" ? item.id : `output${outputIndex + 1}`;
                                  const outputLetter = String.fromCharCode(65 + outputIndex);
                                  const outputDetails = outputsById[outputId];
                                  const title = hasVoted ? outputDetails?.modelName ?? `Modelo ${outputLetter}` : `Resposta ${outputLetter}`;
                                  const subtitle = hasVoted ? outputDetails?.modelId ?? "Modelo não identificado" : `Modelo ${outputLetter}`;
                                  const isWinner = hasVoted && votedFor === outputId;
                                  const isRunnerUp = hasVoted && votedFor !== outputId;
                                  const durationMs = typeof item?.responseTimeMs === "number" ? item.responseTimeMs : response.responseTime;
                                  const answerText = typeof item?.response === "string" && item.response.length > 0 ? item.response : "Resposta não disponível";
                                  return <div key={outputId} className="bg-card border border-border rounded-xl overflow-hidden">
                                                <div className="p-6 pb-4 border-b border-border">
                                                  <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                      {isWinner && <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
                                                          #1º Lugar
                                                        </Badge>}
                                                      {isRunnerUp && <Badge variant="outline" className="px-3 py-1">
                                                          Finalista
                                                        </Badge>}
                                                      <div>
                                                        <h3 className="text-lg font-semibold text-foreground">
                                                          {title}
                                                        </h3>
                                                        {hasVoted && <p className="text-sm text-muted-foreground break-all">
                                                            {subtitle}
                                                          </p>}
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                      <Clock size={14} />
                                                      <span className="text-sm">{formatTime(durationMs)}</span>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="p-6">
                                                  <p className="text-xl leading-relaxed whitespace-pre-line mb-6 text-foreground/90">
                                                    {answerText}
                                                  </p>
                                                  {!hasVoted && <Button onClick={() => handleVote(outputId)} className="w-full bg-primary hover:bg-primary/90">
                                                      <ThumbsUp className="h-4 w-4 mr-2" />
                                                      Votar nesta resposta
                                                    </Button>}
                                                </div>
                                              </div>;
                                })}
                                        </div>

                                        {hasVoted && selectedOutput && <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
                                            <p className="text-lg text-foreground">
                                              🏆 Você votou na resposta gerada por {selectedOutput.modelName}.
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2 break-all">
                                              Identificador do modelo: {selectedOutput.modelId}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                              Obrigado por sua avaliação! Os modelos foram revelados.
                                            </p>
                                          </div>}
                                      </div>;
                          } catch (error) {
                            return <div className="bg-muted rounded-lg p-12 min-h-[300px]">
                                        <p className="text-xl leading-relaxed whitespace-pre-line">
                                          {response.response}
                                        </p>
                                      </div>;
                          }
                        })()}
                              </div>}
                          </CardContent>
                        </Card>;
                })}
                  </div>
                </div>
              </div>)}
          </div>

          {/* Input Area - Always at bottom */}
          <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-6xl mx-auto p-8">
              {/* Suggestions - only show when no results */}
              {fastestResponses.length === 0 && <div className="mb-8">
                  <p className="text-xl text-muted-foreground mb-6">Sugestões de prompt:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promptSuggestions.map((suggestion, index) => <button key={index} onClick={() => setPrompt(suggestion)} className="text-left p-6 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-lg">
                        {suggestion}
                      </button>)}
                  </div>
                </div>}
              
              <div className="relative">
                <Textarea placeholder="Pergunte qualquer coisa..." value={prompt} onChange={e => setPrompt(e.target.value)} className="min-h-[200px] text-xl resize-none pr-20 border-input bg-background" disabled={isRunning} onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  runArena();
                }
              }} />
                
                <Button onClick={runArena} disabled={isRunning || !prompt.trim()} className="absolute bottom-6 right-6 h-12 w-12 p-0 bg-primary hover:bg-primary/90">
                  {isRunning ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
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