import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Timer, ThumbsUp, MessageSquare, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import gbcsrtLogo from "@/assets/gb-cs-rt-logo.png";

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
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);

  const promptSuggestions = [
    "Explique como funciona a inteligência artificial",
    "Escreva um código Python para calcular fibonacci",
    "Qual é a diferença entre machine learning e deep learning?",
    "Crie uma receita de bolo de chocolate",
    "Explique a teoria da relatividade de Einstein",
    "Como funciona o algoritmo de ordenação quicksort?"
  ];

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `0:${seconds.toString().padStart(2, '0')}`;
  };

  const sendPromptToEndpoint = async (prompt: string): Promise<any> => {
    const endpoint = "https://n8n.utopiaco.com.br/webhook/ca195c1a-f7dc-498d-916e-0c62a18bdc36";
    
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          timestamp: new Date().toISOString(),
        }),
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
        variant: "destructive",
      });
      return;
    }

    const currentPrompt = prompt.trim();
    
    // Create new chat entry
    const chatId = Date.now().toString();
    const newChat: ChatHistory = {
      id: chatId,
      prompt: currentPrompt,
      timestamp: new Date(),
    };
    
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChatId(chatId);
    setIsRunning(true);
    setFastestResponses([]);
    setWinner(null);
    setHasVoted(false);
    setVotedFor(null);

    // Clear the prompt input
    setPrompt("");

    // Show loading state
    const loadingResponse: ModelResponse = {
      modelId: "api-response",
      response: "",
      responseTime: 0,
      isLoading: true,
    };
    setFastestResponses([loadingResponse]);

    try {
      const startTime = Date.now();
      const apiResponse = await sendPromptToEndpoint(currentPrompt);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Process the expected response format with output1 and output2
      const finalResponse: ModelResponse = {
        modelId: "api-response",
        response: JSON.stringify({
          output1: apiResponse.output1 || "Resposta não disponível",
          output2: apiResponse.output2 || "Resposta não disponível"
        }),
        responseTime: responseTime,
        isLoading: false,
      };

      setFastestResponses([finalResponse]);
      
      toast({
        title: "Resposta Recebida!",
        description: "O prompt foi processado com sucesso pelo n8n.",
      });
    } catch (error) {
      setFastestResponses([]);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao enviar o prompt para o endpoint.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleVote = (outputId: string) => {
    if (hasVoted) return;
    
    setVotedFor(outputId);
    setHasVoted(true);
    
    // Update chat history with winner
    if (currentChatId) {
      setChatHistory(prev => prev.map(chat => 
        chat.id === currentChatId 
          ? { ...chat, winner: outputId }
          : chat
      ));
    }
    
    toast({
      title: "Voto Registrado!",
      description: `Você votou no ${outputId === 'output1' ? 'Output 1' : 'Output 2'}. Os modelos foram revelados.`,
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
    setHasVoted(false);
    setVotedFor(null);
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
          <div className="flex items-center gap-3 text-sidebar-foreground font-bold text-lg mb-6">
            <img src={gbcsrtLogo} alt="GB-CS-RT" className="w-8 h-8" />
            GB-CS-RT
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
                <h1 className="text-8xl font-bold text-foreground mb-8 text-center">
                  Converse com IA
                </h1>
                
                <p className="text-2xl text-muted-foreground text-center mb-16 max-w-5xl">
                  Faça perguntas e obtenha respostas inteligentes processadas por nossa IA
                </p>
              </div>
            ) : (
              /* Results View */
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
                      
                      return (
                        <Card 
                          key={response.modelId} 
                          className="relative overflow-hidden transition-all duration-300 hover:shadow-md"
                        >
                          <CardHeader className="pb-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge className="bg-primary text-primary-foreground text-xl px-6 py-3">
                                  API Response
                                </Badge>
                                <div>
                                  <CardTitle className="text-3xl">
                                    Resposta da IA
                                  </CardTitle>
                                  <p className="text-xl text-muted-foreground">
                                    Processado via n8n
                                  </p>
                                </div>
                              </div>
                              {!isLoading && (
                                <div className="flex items-center gap-1 text-xl text-muted-foreground">
                                  <Timer size={22} />
                                  {formatTime(response.responseTime)}
                                </div>
                              )}
                            </div>
                          </CardHeader>
                          
                          <CardContent>
                            {isLoading ? (
                              <div className="flex items-center justify-center py-16">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                <span className="ml-4 text-xl text-muted-foreground">Processando...</span>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {(() => {
                                  try {
                                    const parsedResponse = JSON.parse(response.response);
                                    return (
                                      <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                          {/* Output 1 */}
                                          <div className="bg-muted rounded-lg p-8 relative">
                                            <div className="flex items-center justify-between mb-4">
                                              <h4 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                                {hasVoted ? (
                                                  <>
                                                    <Badge variant="outline" className="text-sm">Modelo A</Badge>
                                                    {votedFor === 'output1' && (
                                                      <Trophy className="h-5 w-5 text-winner" />
                                                    )}
                                                  </>
                                                ) : (
                                                  <Badge variant="outline" className="text-sm">Resposta A</Badge>
                                                )}
                                              </h4>
                                            </div>
                                            <p className="text-lg leading-relaxed whitespace-pre-line mb-6">
                                              {parsedResponse.output1}
                                            </p>
                                            {!hasVoted && (
                                              <Button
                                                onClick={() => handleVote('output1')}
                                                className="w-full bg-primary hover:bg-primary/90"
                                              >
                                                <ThumbsUp className="h-4 w-4 mr-2" />
                                                Votar nesta resposta
                                              </Button>
                                            )}
                                          </div>

                                          {/* Output 2 */}
                                          <div className="bg-muted rounded-lg p-8 relative">
                                            <div className="flex items-center justify-between mb-4">
                                              <h4 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                                {hasVoted ? (
                                                  <>
                                                    <Badge variant="outline" className="text-sm">Modelo B</Badge>
                                                    {votedFor === 'output2' && (
                                                      <Trophy className="h-5 w-5 text-winner" />
                                                    )}
                                                  </>
                                                ) : (
                                                  <Badge variant="outline" className="text-sm">Resposta B</Badge>
                                                )}
                                              </h4>
                                            </div>
                                            <p className="text-lg leading-relaxed whitespace-pre-line mb-6">
                                              {parsedResponse.output2}
                                            </p>
                                            {!hasVoted && (
                                              <Button
                                                onClick={() => handleVote('output2')}
                                                className="w-full bg-primary hover:bg-primary/90"
                                              >
                                                <ThumbsUp className="h-4 w-4 mr-2" />
                                                Votar nesta resposta
                                              </Button>
                                            )}
                                          </div>
                                        </div>

                                        {hasVoted && (
                                          <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 text-center">
                                            <p className="text-lg text-foreground">
                                              {votedFor === 'output1' 
                                                ? '🏆 Você votou na Resposta A (Modelo A)' 
                                                : '🏆 Você votou na Resposta B (Modelo B)'}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-2">
                                              Obrigado por sua avaliação! Os modelos foram revelados.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  } catch (error) {
                                    return (
                                      <div className="bg-muted rounded-lg p-12 min-h-[300px]">
                                        <p className="text-xl leading-relaxed whitespace-pre-line">
                                          {response.response}
                                        </p>
                                      </div>
                                    );
                                  }
                                })()}
                              </div>
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
            <div className="max-w-6xl mx-auto p-8">
              {/* Suggestions - only show when no results */}
              {fastestResponses.length === 0 && (
                <div className="mb-8">
                  <p className="text-xl text-muted-foreground mb-6">Sugestões:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {promptSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setPrompt(suggestion)}
                        className="text-left p-6 rounded-lg border border-input bg-background hover:bg-muted transition-colors text-lg"
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
                  className="min-h-[200px] text-xl resize-none pr-20 border-input bg-background"
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
                  className="absolute bottom-6 right-6 h-12 w-12 p-0 bg-primary hover:bg-primary/90"
                >
                  {isRunning ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Send className="h-6 w-6" />
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