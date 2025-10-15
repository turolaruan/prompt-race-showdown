import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";

interface VoteStats {
  model_name: string;
  total_votes: number;
  win_rate: number;
}

const Leaderboard = () => {
  const [voteStats, setVoteStats] = useState<VoteStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVoteStats();
  }, []);

  const loadVoteStats = async () => {
    try {
      setIsLoading(true);
      
      // Query para calcular estatísticas de votos
      const { data: votes, error } = await supabase
        .from("arena_votes")
        .select("*");

      if (error) throw error;

      // Calcular estatísticas por modelo
      const statsMap = new Map<string, { total: number; wins: number }>();

      votes?.forEach(vote => {
        // Contar participações
        [vote.model_a_id, vote.model_b_id].forEach(modelId => {
          if (!statsMap.has(modelId)) {
            statsMap.set(modelId, { total: 0, wins: 0 });
          }
          const stats = statsMap.get(modelId)!;
          stats.total += 1;
        });

        // Contar vitórias
        if (vote.winner_model_id) {
          if (!statsMap.has(vote.winner_model_id)) {
            statsMap.set(vote.winner_model_id, { total: 0, wins: 0 });
          }
          statsMap.get(vote.winner_model_id)!.wins += 1;
        }
      });

      // Converter para array e calcular win rate
      const stats: VoteStats[] = Array.from(statsMap.entries())
        .map(([model_name, data]) => ({
          model_name,
          total_votes: data.total,
          win_rate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.win_rate - a.win_rate);

      setVoteStats(stats);
    } catch (error) {
      console.error("Error loading vote stats:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas de votos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="h-10 w-10 text-primary" />
          <h1 className="text-5xl font-bold text-foreground">Leaderboard de Votos</h1>
        </div>
        <p className="text-muted-foreground">
          Ranking dos modelos mais votados pelos usuários na Arena
        </p>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <span className="ml-4 text-lg text-muted-foreground">Carregando dados...</span>
          </div>
        ) : voteStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-lg text-muted-foreground mb-2">Nenhum voto registrado ainda</p>
            <p className="text-sm text-muted-foreground">Os votos aparecerão aqui quando os usuários começarem a votar na Arena</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Rank</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Total de Votos</TableHead>
                <TableHead>Taxa de Vitória</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {voteStats.map((stat, index) => (
                <TableRow key={stat.model_name}>
                  <TableCell className="font-semibold text-lg">
                    {index === 0 && <Trophy className="inline h-5 w-5 text-yellow-500 mr-2" />}
                    {index + 1}º
                  </TableCell>
                  <TableCell className="text-base font-medium">{stat.model_name}</TableCell>
                  <TableCell className="text-base">{stat.total_votes}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                        <div 
                          className="bg-primary h-full transition-all duration-500"
                          style={{ width: `${stat.win_rate}%` }}
                        />
                      </div>
                      <Badge variant="default">{stat.win_rate.toFixed(1)}%</Badge>
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
