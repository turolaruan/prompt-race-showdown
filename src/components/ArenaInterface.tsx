import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Timer, ThumbsUp, MessageSquare, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Model {
  id: string;
  name: string;
  provider: string;
  speed: number; // milliseconds
}

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

const availableModels: Model[] = [
  { id: "gpt-4", name: "GPT-4", provider: "OpenAI", speed: 2000 },
  { id: "claude-3", name: "Claude 3", provider: "Anthropic", speed: 1800 },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google", speed: 2200 },
  { id: "deepseek", name: "DeepSeek", provider: "DeepSeek", speed: 1500 },
  { id: "llama-2", name: "Llama 2", provider: "Meta", speed: 2500 },
  { id: "mixtral", name: "Mixtral", provider: "Mistral", speed: 1900 },
];

const ArenaInterface = () => {
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [fastestResponses, setFastestResponses] = useState<ModelResponse[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

  const promptSuggestions = [
    "Explique como funciona a inteligência artificial",
    "Escreva um código Python para calcular fibonacci",
    "Qual é a diferença entre machine learning e deep learning?",
    "Crie uma receita de bolo de chocolate",
    "Explique a teoria da relatividade de Einstein",
    "Como funciona o algoritmo de ordenação quicksort?"
  ];

  const formatTime = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  const simulateModelResponse = async (model: Model, prompt: string): Promise<ModelResponse> => {
    const baseTime = model.speed;
    const variation = Math.random() * 500 - 250; // ±250ms variation
    const actualTime = Math.max(1000, baseTime + variation);

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          modelId: model.id,
          response: `Esta é uma resposta simulada do ${model.name} para: "${prompt}". 
          
O modelo ${model.name} da ${model.provider} processou sua solicitação e fornece esta resposta detalhada que demonstra suas capacidades de compreensão e geração de texto. 

Esta simulação mostra como diferentes modelos podem ter velocidades e estilos de resposta variados, permitindo uma comparação efetiva entre eles.`,
          responseTime: actualTime,
          isLoading: false,
        });
      }, actualTime);
    });
  };

  const runArena = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um prompt para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Create new chat entry
    const chatId = Date.now().toString();
    const newChat: ChatHistory = {
      id: chatId,
      prompt: prompt.trim(),
      timestamp: new Date(),
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(chatId);
    setIsRunning(true);
    setFastestResponses([]);
    setWinner(null);

    // Initialize loading states for all models
    const loadingResponses = availableModels.map(model => ({
      modelId: model.id,
      response: "",
      responseTime: 0,
      isLoading: true,
    }));
    setFastestResponses(loadingResponses);

    try {
      // Start all model requests simultaneously
      const responses = await Promise.all(
        availableModels.map(model => simulateModelResponse(model, prompt))
      );

      // Sort by response time and get the 2 fastest
      const sortedResponses = responses.sort((a, b) => a.responseTime - b.responseTime);
      const fastest = sortedResponses.slice(0, 2);

      setFastestResponses(fastest);
      
      toast({
        title: "Arena Concluída!",
        description: `Os 2 modelos mais rápidos foram selecionados para comparação`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro durante a execução do arena.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleVote = (modelId: string) => {
    setWinner(modelId);
    
    // Update chat history with winner
    setChatHistory(prev => 
      prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, winner: modelId }
          : chat
      )
    );
    
    toast({
      title: "Voto registrado!",
      description: `Você votou no ${availableModels.find(m => m.id === modelId)?.name}`,
    });
  };

  const getModelInfo = (modelId: string) => {
    return availableModels.find(model => model.id === modelId);
  };

  const startNewChat = () => {
    setPrompt("");
    setFastestResponses([]);
    setWinner(null);
    setCurrentChatId(null);
  };

  const loadChatFromHistory = (chat: ChatHistory) => {
    setPrompt(chat.prompt);
    setCurrentChatId(chat.id);
    // You could reload the responses here if needed
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4">
          <div className="flex items-center gap-2 text-sidebar-foreground font-bold text-lg mb-6">
            <Trophy size={24} className="text-primary" />
            LM Arena
          </div>
          
          <Button 
            onClick={startNewChat}
            className="w-full justify-start gap-2 mb-6 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
          >
            <MessageSquare size={16} />
            Novo Chat
          </Button>
          
          {/* Chat History */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-sidebar-foreground mb-3">Histórico</h3>
            <div className="space-y-1 max-h-96 overflow-y-auto">
              {chatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => loadChatFromHistory(chat)}
                  className="w-full text-left p-3 rounded-lg hover:bg-sidebar-accent/50 transition-colors group"
                >
                  <div className="text-sm text-sidebar-foreground truncate mb-1">
                    {chat.prompt}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {chat.timestamp.toLocaleDateString()}
                    </span>
                    {chat.winner && (
                      <span className="flex items-center gap-1 text-winner">
                        <Trophy size={12} />
                        {availableModels.find(m => m.id === chat.winner)?.name}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              {chatHistory.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum chat realizado ainda
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col">
          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {fastestResponses.length === 0 ? (
              /* Initial View */
              <div className="flex flex-col items-center justify-center h-full px-8">
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
                <h1 className="text-6xl font-bold text-foreground mb-6 text-center">
                  Encontre a melhor IA para você
                </h1>
                
                <p className="text-xl text-muted-foreground text-center mb-12 max-w-4xl">
                  Compare respostas entre os principais modelos de IA, compartilhe seu feedback e contribua para nosso ranking público
                </p>
              </div>
            ) : (
              /* Results View */
              <div className="p-8">
                <div className="max-w-7xl mx-auto">
                  {/* Header */}
                  <div className="mb-8">
                    <h2 className="text-3xl font-semibold text-foreground mb-2">Comparação de Modelos</h2>
                    <p className="text-lg text-muted-foreground">Prompt: "{prompt}"</p>
                  </div>

                  {/* Results Grid */}
                  <div className="grid md:grid-cols-2 gap-8">
                    {fastestResponses.slice(0, 2).map((response, index) => {
                      const modelInfo = getModelInfo(response.modelId);
                      const isWinner = winner === response.modelId;
                      const isLoading = response.isLoading;
                      
                      return (
                        <Card 
                          key={response.modelId} 
                          className={`relative overflow-hidden transition-all duration-300 ${
                            isWinner ? 'ring-2 ring-winner shadow-lg' : 'hover:shadow-md'
                          }`}
                        >
                          <CardHeader className="pb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant={index === 0 ? "default" : "secondary"} className="bg-primary text-primary-foreground text-base px-4 py-2">
                                  #{index + 1}° Lugar
                                </Badge>
                                <div>
                                  <CardTitle className="text-2xl">
                                    {winner ? modelInfo?.name : `Modelo ${String.fromCharCode(65 + index)}`}
                                  </CardTitle>
                                  <p className="text-lg text-muted-foreground">
                                    {winner ? modelInfo?.provider : "Provedor oculto"}
                                  </p>
                                </div>
                              </div>
                              {!isLoading && (
                                <div className="flex items-center gap-1 text-lg text-muted-foreground">
                                  <Timer size={18} />
                                  {formatTime(response.responseTime)}
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            {isLoading ? (
                              <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                <span className="ml-4 text-lg text-muted-foreground">Processando...</span>
                              </div>
                            ) : (
                              <>
                                <div className="bg-muted rounded-lg p-8 mb-8 min-h-[400px]">
                                  <p className="text-lg leading-relaxed whitespace-pre-line">
                                    {response.response}
                                  </p>
                                </div>
                                
                                {!winner && (
                                  <div className="flex gap-3">
                                    <Button
                                      variant="outline"
                                      size="lg"
                                      onClick={() => handleVote(response.modelId)}
                                      className="flex-1 hover:border-winner hover:text-winner text-lg py-4"
                                    >
                                      <ThumbsUp size={20} className="mr-3" />
                                      Melhor Resposta
                                    </Button>
                                  </div>
                                )}
                                
                                {isWinner && (
                                  <div className="flex items-center justify-center py-4">
                                    <Badge className="bg-winner text-winner-foreground text-lg px-6 py-3">
                                      <Trophy size={18} className="mr-3" />
                                      Vencedor!
                                    </Badge>
                                  </div>
                                )}
                              </>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area - Always at bottom */}
          <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="max-w-4xl mx-auto p-6">
              {/* Suggestions - only show when no results */}
              {fastestResponses.length === 0 && (
                <div className="mb-6">
                  <p className="text-base text-muted-foreground mb-4">Sugestões:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {promptSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(suggestion)}
                        className="text-left p-4 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-base"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="relative">
                <Textarea
                  placeholder="Pergunte qualquer coisa..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[160px] text-lg resize-none pr-16 border-input bg-background"
                  disabled={isRunning}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      runArena();
                    }
                  }}
                />
                
                <Button
                  onClick={runArena}
                  disabled={isRunning || !prompt.trim()}
                  className="absolute bottom-4 right-4 h-10 w-10 p-0 bg-primary hover:bg-primary/90"
                >
                  {isRunning ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArenaInterface;