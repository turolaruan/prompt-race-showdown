import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy, Database, TestTube, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LeaderboardEntry {
  rank: number;
  model: string;
  technique: string;
  votes: number;
  task: string;
}

// Dados mock para fallback
const mockLeaderboardData: LeaderboardEntry[] = [
  { rank: 1, model: "GPT-4", technique: "Base Model", votes: 245, task: "Text Generation" },
  { rank: 2, model: "Claude 3", technique: "Lora/QLora", votes: 198, task: "Text Generation" },
  { rank: 3, model: "Gemini Pro", technique: "GRPO", votes: 156, task: "Translation" },
  { rank: 4, model: "LLaMA 3", technique: "Lora+GRPO", votes: 132, task: "Summarization" },
  { rank: 5, model: "Mistral", technique: "Base Model", votes: 98, task: "Analysis" },
];

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(mockLeaderboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);
  const [forceMode, setForceMode] = useState<'auto' | 'mock' | 'real'>('auto');
  const [filterModel, setFilterModel] = useState<string>("all");
  const [filterTechnique, setFilterTechnique] = useState<string>("all");
  const [filterTask, setFilterTask] = useState<string>("all");

  useEffect(() => {
    loadLeaderboardData();
  }, [forceMode]);

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);
      
      // Se forçar modo mock, usar dados mock
      if (forceMode === 'mock') {
        setLeaderboardData(mockLeaderboardData);
        setUseMock(true);
        setIsLoading(false);
        return;
      }

      // Tentar buscar dados reais do Supabase (tabela arena_votes)
      const { data: votes, error } = await supabase
        .from("arena_votes")
        .select("winner_model_id, prompt, technique");

      if (error) throw error;

      if (votes && votes.length > 0) {
        // Processar votos e contar
        const voteCount: Record<string, { votes: number; technique: string; tasks: Set<string> }> = {};
        
        votes.forEach((vote) => {
          if (vote.winner_model_id) {
            if (!voteCount[vote.winner_model_id]) {
              voteCount[vote.winner_model_id] = {
                votes: 0,
                technique: vote.technique || "Base Model",
                tasks: new Set()
              };
            }
            voteCount[vote.winner_model_id].votes++;
            voteCount[vote.winner_model_id].tasks.add(vote.prompt?.substring(0, 30) || "General");
          }
        });

        // Converter para array e ordenar por votos
        const processedData: LeaderboardEntry[] = Object.entries(voteCount)
          .map(([model, data]) => ({
            model,
            technique: data.technique,
            votes: data.votes,
            task: Array.from(data.tasks).join(", "),
            rank: 0
          }))
          .sort((a, b) => b.votes - a.votes)
          .map((entry, index) => ({
            ...entry,
            rank: index + 1
          }));

        setLeaderboardData(processedData);
        setUseMock(false);
      } else {
        // Usar dados mock se não houver dados reais (apenas em modo auto)
        if (forceMode === 'auto') {
          setLeaderboardData(mockLeaderboardData);
          setUseMock(true);
        } else {
          setLeaderboardData([]);
          setUseMock(false);
        }
      }
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
      
      // Em caso de erro no modo real, mostrar erro
      if (forceMode === 'real') {
        setLeaderboardData([]);
        setUseMock(false);
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível conectar à API.",
          variant: "destructive",
        });
      } else {
        // Em modo auto, usar dados mock
        setLeaderboardData(mockLeaderboardData);
        setUseMock(true);
        toast({
          title: "Usando dados de exemplo",
          description: "Não foi possível carregar dados do servidor. Mostrando dados de exemplo.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDataSource = () => {
    if (forceMode === 'auto' || forceMode === 'real') {
      setForceMode('mock');
    } else {
      setForceMode('real');
    }
  };

  // Filtrar dados
  const filteredData = leaderboardData.filter(entry => {
    const modelMatch = filterModel === "all" || entry.model.includes(filterModel);
    const techniqueMatch = filterTechnique === "all" || entry.technique === filterTechnique;
    const taskMatch = filterTask === "all" || entry.task.includes(filterTask);
    return modelMatch && techniqueMatch && taskMatch;
  });

  // Obter listas únicas para os filtros
  const uniqueModels = Array.from(new Set(leaderboardData.map(e => e.model)));
  const uniqueTechniques = Array.from(new Set(leaderboardData.map(e => e.technique)));
  const uniqueTasks = Array.from(new Set(leaderboardData.flatMap(e => e.task.split(", "))));

  return (
    <div className="flex-1 flex flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-10 w-10 text-primary" />
              <h1 className="text-5xl font-bold text-foreground">Leaderboard</h1>
            </div>
            <p className="text-muted-foreground">
              Ranking dos melhores modelos de IA baseado em votos dos usuários
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={toggleDataSource}
              variant="outline"
              className="gap-2"
            >
              {forceMode === 'mock' ? (
                <>
                  <TestTube className="h-4 w-4" />
                  Modo Mock
                </>
              ) : (
                <>
                  <Database className="h-4 w-4" />
                  Modo API
                </>
              )}
            </Button>
            {useMock && forceMode === 'auto' && (
              <Badge variant="secondary">Dados de Exemplo</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todos os Modelos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Modelos</SelectItem>
            {uniqueModels.map(model => (
              <SelectItem key={model} value={model}>{model}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTechnique} onValueChange={setFilterTechnique}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as Técnicas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Técnicas</SelectItem>
            {uniqueTechniques.map(technique => (
              <SelectItem key={technique} value={technique}>{technique}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTask} onValueChange={setFilterTask}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Todas as Tarefas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Tarefas</SelectItem>
            {uniqueTasks.map(task => (
              <SelectItem key={task} value={task}>{task}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filterModel !== "all" || filterTechnique !== "all" || filterTask !== "all") && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setFilterModel("all");
              setFilterTechnique("all");
              setFilterTask("all");
            }}
          >
            Limpar Filtros
          </Button>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-4 text-lg text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Rank</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Técnica</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Votos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum resultado encontrado com os filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((entry, index) => (
                  <TableRow key={`${entry.model}-${index}`}>
                    <TableCell className="font-semibold text-lg">
                      {entry.rank === 1 && <Trophy className="inline h-5 w-5 text-yellow-500 mr-2" />}
                      {entry.rank}º
                    </TableCell>
                    <TableCell className="text-base font-medium">{entry.model}</TableCell>
                    <TableCell className="text-base">
                      <Badge variant="outline">{entry.technique}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                      {entry.task}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[150px]">
                          <div 
                            className="bg-primary h-full transition-all duration-500"
                            style={{ width: `${Math.min((entry.votes / Math.max(...filteredData.map(e => e.votes))) * 100, 100)}%` }}
                          />
                        </div>
                        <Badge variant="default">{entry.votes}</Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
