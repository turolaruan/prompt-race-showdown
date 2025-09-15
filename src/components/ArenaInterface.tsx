import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Trophy, Timer, ThumbsUp, ThumbsDown } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-arena-gradient-subtle">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-arena-gradient px-6 py-3 rounded-full text-white font-bold text-2xl shadow-arena-glow mb-4">
            <Trophy size={28} />
            AI Arena MVP
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Compare modelos de IA em tempo real. Os 2 modelos mais rápidos competem em uma arena de respostas.
          </p>
        </div>

        {/* Prompt Input */}
        <Card className="mb-8 shadow-arena">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send size={20} />
              Seu Prompt
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Digite seu prompt aqui... (ex: Explique como funciona machine learning)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isRunning}
            />
            <Button
              onClick={runArena}
              disabled={isRunning || !prompt.trim()}
              className="w-full bg-arena-gradient hover:opacity-90 text-white font-semibold py-3"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando Arena...
                </>
              ) : (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Iniciar Arena
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Grid */}
        {fastestResponses.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-8">
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
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? "default" : "secondary"} className="bg-arena-gradient text-white">
                          #{index + 1}° Lugar
                        </Badge>
                        <div>
                          <CardTitle className="text-lg">{modelInfo?.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{modelInfo?.provider}</p>
                        </div>
                      </div>
                      {!isLoading && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Timer size={14} />
                          {response.responseTime}ms
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Processando...</span>
                      </div>
                    ) : (
                      <>
                        <div className="bg-muted rounded-lg p-4 mb-4 min-h-[200px]">
                          <p className="text-sm leading-relaxed whitespace-pre-line">
                            {response.response}
                          </p>
                        </div>
                        
                        {!winner && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVote(response.modelId)}
                              className="flex-1 hover:border-winner hover:text-winner"
                            >
                              <ThumbsUp size={16} className="mr-1" />
                              Melhor Resposta
                            </Button>
                          </div>
                        )}
                        
                        {isWinner && (
                          <div className="flex items-center justify-center py-2">
                            <Badge className="bg-winner text-winner-foreground">
                              <Trophy size={14} className="mr-1" />
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

        {/* Available Models Info */}
        <Card>
          <CardHeader>
            <CardTitle>Modelos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {availableModels.map((model) => (
                <div key={model.id} className="text-center p-3 bg-muted rounded-lg">
                  <p className="font-semibold text-sm">{model.name}</p>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                  <p className="text-xs text-muted-foreground mt-1">~{model.speed}ms</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ArenaInterface;