import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Timer, ThumbsUp, MessageSquare, BarChart3, User, Settings, Plus, Paperclip, Image, Upload } from "lucide-react";
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
  const [showResults, setShowResults] = useState(false);

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

    setIsRunning(true);
    setFastestResponses([]);
    setWinner(null);
    setShowResults(true);

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
        description: `Os 2 modelos mais rápidos foram ${availableModels.find(m => m.id === fastest[0].modelId)?.name} e ${availableModels.find(m => m.id === fastest[1].modelId)?.name}`,
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
    setShowResults(false);
    setFastestResponses([]);
    setWinner(null);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4">
          <div className="flex items-center gap-2 text-sidebar-foreground font-bold text-lg mb-6">
            <Trophy size={24} className="text-primary" />
            AI Arena
          </div>
          
          <Button 
            onClick={startNewChat}
            className="w-full justify-start gap-2 mb-4 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
          >
            <MessageSquare size={16} />
            Novo Chat
          </Button>
          
          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
              <BarChart3 size={16} />
              Leaderboard
            </Button>
          </nav>
        </div>
        
        {/* Bottom section */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent">
            <User size={16} />
            Login
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!showResults ? (
          /* Initial View */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            {/* Model Icons */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">G</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xs font-bold text-accent">C</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-secondary/40 flex items-center justify-center">
                <span className="text-xs font-bold text-secondary-foreground">G</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">D</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                <span className="text-xs font-bold text-accent">L</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/25 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">M</span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl font-bold text-foreground mb-6 text-center">
              Encontre a melhor IA para você
            </h1>
            
            <p className="text-lg text-muted-foreground text-center mb-12 max-w-3xl">
              Compare respostas entre os principais modelos de IA, compartilhe seu feedback e contribua para nosso ranking público
            </p>

            {/* Input Area */}
            <div className="w-full max-w-4xl">
              <div className="relative">
                <Textarea
                  placeholder="Pergunte qualquer coisa..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[140px] text-base resize-none pr-16 border-input bg-background"
                  disabled={isRunning}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      runArena();
                    }
                  }}
                />
                
                {/* Action Buttons */}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Plus size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Paperclip size={16} />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Image size={16} />
                  </Button>
                </div>
                
                <Button
                  onClick={runArena}
                  disabled={isRunning || !prompt.trim()}
                  className="absolute bottom-3 right-3 h-8 w-8 p-0 bg-primary hover:bg-primary/90"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Results View */
          <div className="flex-1 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header with back button */}
              <div className="flex items-center gap-4 mb-8">
                <Button 
                  onClick={startNewChat}
                  variant="outline" 
                  size="sm"
                  className="text-sm"
                >
                  ← Nova Conversa
                </Button>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold text-foreground">Comparação de Modelos</h2>
                  <p className="text-base text-muted-foreground">Prompt: "{prompt}"</p>
                </div>
              </div>

              {/* Results Grid */}
              {fastestResponses.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
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
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Badge variant={index === 0 ? "default" : "secondary"} className="bg-primary text-primary-foreground text-sm px-3 py-1">
                                #{index + 1}° Lugar
                              </Badge>
                              <div>
                                <CardTitle className="text-xl">{modelInfo?.name}</CardTitle>
                                <p className="text-base text-muted-foreground">{modelInfo?.provider}</p>
                              </div>
                            </div>
                            {!isLoading && (
                              <div className="flex items-center gap-1 text-base text-muted-foreground">
                                <Timer size={16} />
                                {response.responseTime}ms
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        
                        <CardContent>
                          {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                              <Loader2 className="h-10 w-10 animate-spin text-primary" />
                              <span className="ml-3 text-base text-muted-foreground">Processando...</span>
                            </div>
                          ) : (
                            <>
                              <div className="bg-muted rounded-lg p-6 mb-6 min-h-[300px]">
                                <p className="text-base leading-relaxed whitespace-pre-line">
                                  {response.response}
                                </p>
                              </div>
                              
                              {!winner && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="default"
                                    onClick={() => handleVote(response.modelId)}
                                    className="flex-1 hover:border-winner hover:text-winner text-base py-3"
                                  >
                                    <ThumbsUp size={18} className="mr-2" />
                                    Melhor Resposta
                                  </Button>
                                </div>
                              )}
                              
                              {isWinner && (
                                <div className="flex items-center justify-center py-3">
                                  <Badge className="bg-winner text-winner-foreground text-base px-4 py-2">
                                    <Trophy size={16} className="mr-2" />
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
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArenaInterface;