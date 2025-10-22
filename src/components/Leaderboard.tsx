import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy, Database, TestTube } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  model: string;
  votes: number;
  technique: string;
  task: string;
}

// Dados mock para fallback
const mockLeaderboardData: LeaderboardEntry[] = [
  { rank: 1, model: "GPT-5", votes: 150, technique: "Modelo base", task: "Geração de Texto" },
  { rank: 2, model: "Gemini Pro", votes: 120, technique: "Lora/QLora", task: "Tradução" },
  { rank: 3, model: "Claude 3", votes: 95, technique: "GRPO", task: "Análise" },
  { rank: 4, model: "LLaMA 3", votes: 80, technique: "Lora+GRPO", task: "Resumo" },
  { rank: 5, model: "Mistral", votes: 65, technique: "Modelo base", task: "Criação" },
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

  // Get unique values for filters
  const uniqueModels = Array.from(new Set(leaderboardData.map(entry => entry.model)));
  const uniqueTechniques = Array.from(new Set(leaderboardData.map(entry => entry.technique)));
  const uniqueTasks = Array.from(new Set(leaderboardData.map(entry => entry.task)));

  // Filter data
  const filteredData = leaderboardData.filter(entry => {
    if (filterModel !== "all" && entry.model !== filterModel) return false;
    if (filterTechnique !== "all" && entry.technique !== filterTechnique) return false;
    if (filterTask !== "all" && entry.task !== filterTask) return false;
    return true;
  });

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

      // Tentar buscar dados reais do Supabase (votos da arena)
      const { data: votes, error } = await supabase
        .from("arena_votes")
        .select("*");

      if (error) throw error;

      if (votes && votes.length > 0) {
        // Agregar votos por modelo
        const votesByModel = votes.reduce((acc: Record<string, { votes: number; techniques: Set<string>; tasks: Set<string> }>, vote) => {
          const model = vote.winner_model_id || "Desconhecido";
          if (!acc[model]) {
            acc[model] = { votes: 0, techniques: new Set(), tasks: new Set() };
          }
          acc[model].votes += 1;
          if (vote.technique) acc[model].techniques.add(vote.technique);
          if (vote.task) acc[model].tasks.add(vote.task);
          return acc;
        }, {});

        // Converter para array e ordenar por votos
        const processedData: LeaderboardEntry[] = Object.entries(votesByModel)
          .map(([model, data]) => ({
            rank: 0, // Will be set after sorting
            model,
            votes: data.votes,
            technique: Array.from(data.techniques).join(", ") || "Não especificada",
            task: Array.from(data.tasks).join(", ") || "Não especificada",
          }))
          .sort((a, b) => b.votes - a.votes)
          .map((entry, index) => ({ ...entry, rank: index + 1 }));

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

  return (
    <div className="flex-1 flex flex-col px-4 py-6 sm:px-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="h-10 w-10 text-primary" />
              <h1 className="text-5xl font-bold text-foreground">Leaderboard</h1>
            </div>
            <p className="text-muted-foreground">
              Ranking dos modelos baseado nos votos dos usuários
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

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select value={filterModel} onValueChange={setFilterModel}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por Modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Modelos</SelectItem>
            {uniqueModels.map(model => (
              <SelectItem key={model} value={model}>{model}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTechnique} onValueChange={setFilterTechnique}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por Técnica" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Técnicas</SelectItem>
            {uniqueTechniques.map(technique => (
              <SelectItem key={technique} value={technique}>{technique}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterTask} onValueChange={setFilterTask}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por Tarefa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Tarefas</SelectItem>
            {uniqueTasks.map(task => (
              <SelectItem key={task} value={task}>{task}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-4 text-lg text-muted-foreground">Carregando dados...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                {filteredData.map((entry, index) => (
                  <TableRow key={`${entry.model}-${index}`}>
                    <TableCell className="font-semibold text-lg">
                      {entry.rank === 1 && <Trophy className="inline h-5 w-5 text-yellow-500 mr-2" />}
                      {entry.rank}º
                    </TableCell>
                    <TableCell className="text-base font-medium whitespace-nowrap">{entry.model}</TableCell>
                    <TableCell className="text-base whitespace-nowrap">{entry.technique}</TableCell>
                    <TableCell className="text-base whitespace-nowrap">{entry.task}</TableCell>
                    <TableCell>
                      <Badge variant="default">{entry.votes}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
