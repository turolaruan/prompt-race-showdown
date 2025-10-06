import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Download, Database, Cloud } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LeaderboardEntry {
  rank: number;
  modelName: string;
  technique: string;
}

const Leaderboard = () => {
  const [useMockData, setUseMockData] = useState(true);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  // Dados mock mais completos
  const mockData: LeaderboardEntry[] = [
    { rank: 1, modelName: "GPT-4", technique: "Few-shot" },
    { rank: 2, modelName: "Claude 3 Opus", technique: "Zero-shot" },
    { rank: 3, modelName: "Gemini Pro", technique: "Chain-of-thought" },
    { rank: 4, modelName: "LLaMA 3 70B", technique: "Few-shot" },
    { rank: 5, modelName: "Mistral Large", technique: "Zero-shot" },
    { rank: 6, modelName: "Claude 3 Sonnet", technique: "Few-shot" },
    { rank: 7, modelName: "GPT-3.5 Turbo", technique: "Chain-of-thought" },
    { rank: 8, modelName: "LLaMA 2 13B", technique: "Zero-shot" },
  ];

  const models = ["GPT-4", "Claude 3", "Gemini Pro", "LLaMA 3", "Mistral"];
  const tasks = ["Resumo", "Tradução", "Análise", "Criação", "Resposta"];
  const techniques = ["Few-shot", "Zero-shot", "Chain-of-thought", "Self-consistency", "ReAct"];

  // Carregar dados quando o modo mudar
  useEffect(() => {
    loadData();
  }, [useMockData, selectedModels, selectedTask, selectedTechnique]);

  const loadData = async () => {
    setIsLoading(true);
    
    if (useMockData) {
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Aplicar filtros nos dados mock
      let filteredData = [...mockData];
      
      if (selectedModels.length > 0) {
        filteredData = filteredData.filter(entry => 
          selectedModels.some(model => entry.modelName.includes(model))
        );
      }
      
      if (selectedTechnique) {
        filteredData = filteredData.filter(entry => 
          entry.technique === selectedTechnique
        );
      }
      
      setLeaderboardData(filteredData);
      setIsLoading(false);
    } else {
      // Chamar endpoint real
      try {
        const baseUrl = import.meta.env.VITE_API_TCC_BASE_URL ?? "http://localhost:8000";
        const endpoint = `${baseUrl.replace(/\/$/, "")}/leaderboard`;
        
        const params = new URLSearchParams();
        if (selectedModels.length > 0) params.append('models', selectedModels.join(','));
        if (selectedTask) params.append('task', selectedTask);
        if (selectedTechnique) params.append('technique', selectedTechnique);
        
        const url = `${endpoint}${params.toString() ? '?' + params.toString() : ''}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        setLeaderboardData(data);
        
        toast({
          title: "Dados carregados",
          description: "Leaderboard atualizado com sucesso do endpoint."
        });
      } catch (error) {
        console.error("Error loading leaderboard:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do endpoint. Usando dados mock.",
          variant: "destructive"
        });
        setLeaderboardData(mockData);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const toggleModel = (model: string) => {
    setSelectedModels(prev =>
      prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  const handleExport = () => {
    // Implementar lógica de exportação
    console.log("Exportando dados...");
  };

  return (
    <div className="flex-1 flex flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-5xl font-bold text-foreground">Leaderboard</h1>
          
          {/* Toggle Mock/Real */}
          <div className="flex items-center gap-4 px-4 py-2 rounded-lg border border-border bg-card">
            <Database className="h-5 w-5 text-muted-foreground" />
            <Label htmlFor="data-mode" className="text-sm font-medium cursor-pointer">
              Modo Mock
            </Label>
            <Switch
              id="data-mode"
              checked={!useMockData}
              onCheckedChange={(checked) => setUseMockData(!checked)}
            />
            <Label htmlFor="data-mode" className="text-sm font-medium cursor-pointer">
              Endpoint Real
            </Label>
            <Cloud className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {useMockData ? "🟢 Usando dados mock para demonstração" : "🔴 Conectado ao endpoint real"}
        </p>
      </div>

      {/* Filters - Top row */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-sm font-medium text-foreground">Filtros:</span>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Modelos ▼
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Tipo de redação ▼
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Tarefa ▼
        </Badge>
        <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
          Técnica ▼
        </Badge>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-lg mb-8 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-4 text-lg text-muted-foreground">Carregando dados...</span>
          </div>
        ) : leaderboardData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground mb-2">Nenhum resultado encontrado</p>
            <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Rank</TableHead>
                <TableHead>Nome do modelo</TableHead>
                <TableHead>Técnica</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((entry) => (
                <TableRow key={entry.rank}>
                  <TableCell className="font-semibold text-lg">
                    {entry.rank}º
                  </TableCell>
                  <TableCell className="text-base">{entry.modelName}</TableCell>
                  <TableCell className="text-base">{entry.technique}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Filter Selection Area */}
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground mb-4">
          Selecione um modelo para exportar:
        </p>

        {/* Models */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Modelos:
          </label>
          <div className="flex flex-wrap gap-3">
            {models.map((model) => (
              <Button
                key={model}
                variant={selectedModels.includes(model) ? "default" : "outline"}
                onClick={() => toggleModel(model)}
                className="rounded-full px-6"
              >
                {model}
              </Button>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Tarefa:
          </label>
          <div className="flex flex-wrap gap-3">
            {tasks.map((task) => (
              <Button
                key={task}
                variant={selectedTask === task ? "default" : "outline"}
                onClick={() => setSelectedTask(task === selectedTask ? null : task)}
                className="rounded-full px-6"
              >
                {task}
              </Button>
            ))}
          </div>
        </div>

        {/* Techniques */}
        <div>
          <label className="text-sm font-medium text-foreground mb-3 block">
            Técnica:
          </label>
          <div className="flex flex-wrap gap-3">
            {techniques.map((technique) => (
              <Button
                key={technique}
                variant={selectedTechnique === technique ? "default" : "outline"}
                onClick={() => setSelectedTechnique(technique === selectedTechnique ? null : technique)}
                className="rounded-full px-6"
              >
                {technique}
              </Button>
            ))}
            <Button
              onClick={handleExport}
              variant="default"
              className="rounded-full px-6 ml-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
