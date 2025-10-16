import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";

interface LeaderboardEntry {
  rank: number;
  model: string;
  score: number;
  task: string;
}

// Dados mock para fallback
const mockLeaderboardData: LeaderboardEntry[] = [
  { rank: 1, model: "GPT-4", score: 95.2, task: "Text Generation" },
  { rank: 2, model: "Claude 3", score: 93.8, task: "Text Generation" },
  { rank: 3, model: "Gemini Pro", score: 91.5, task: "Text Generation" },
  { rank: 4, model: "LLaMA 3", score: 89.3, task: "Text Generation" },
  { rank: 5, model: "Mistral", score: 87.1, task: "Text Generation" },
];

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>(mockLeaderboardData);
  const [isLoading, setIsLoading] = useState(true);
  const [useMock, setUseMock] = useState(false);

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);
      
      // Tentar buscar dados reais do Supabase
      const { data: benchmarks, error } = await supabase
        .from("benchmarks")
        .select("*")
        .order("score", { ascending: false });

      if (error) throw error;

      if (benchmarks && benchmarks.length > 0) {
        // Processar dados reais
        const processedData: LeaderboardEntry[] = benchmarks.map((benchmark, index) => ({
          rank: index + 1,
          model: benchmark.model_name,
          score: Number(benchmark.score),
          task: benchmark.task_type,
        }));
        setLeaderboardData(processedData);
        setUseMock(false);
      } else {
        // Usar dados mock se não houver dados reais
        setLeaderboardData(mockLeaderboardData);
        setUseMock(true);
      }
    } catch (error) {
      console.error("Error loading leaderboard data:", error);
      // Em caso de erro, usar dados mock
      setLeaderboardData(mockLeaderboardData);
      setUseMock(true);
      toast({
        title: "Usando dados de exemplo",
        description: "Não foi possível carregar dados do servidor. Mostrando dados de exemplo.",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              Ranking dos melhores modelos de IA baseado em benchmarks
            </p>
          </div>
          {useMock && (
            <Badge variant="secondary">Dados de Exemplo</Badge>
          )}
        </div>
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
                <TableHead>Tarefa</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboardData.map((entry, index) => (
                <TableRow key={`${entry.model}-${index}`}>
                  <TableCell className="font-semibold text-lg">
                    {entry.rank === 1 && <Trophy className="inline h-5 w-5 text-yellow-500 mr-2" />}
                    {entry.rank}º
                  </TableCell>
                  <TableCell className="text-base font-medium">{entry.model}</TableCell>
                  <TableCell className="text-base">{entry.task}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-[200px]">
                        <div 
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${entry.score}%` }}
                        />
                      </div>
                      <Badge variant="default">{entry.score.toFixed(1)}</Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
