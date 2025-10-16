import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BarChart3, Trophy, TrendingUp } from "lucide-react";

interface BenchmarkData {
  id: string;
  model_name: string;
  task_type: string;
  score: number;
  metric: string;
  dataset: string | null;
  created_at: string;
}

const Dashboard = () => {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("benchmarks")
        .select("*")
        .order("score", { ascending: false });

      if (error) throw error;

      setBenchmarks(data || []);
    } catch (error) {
      console.error("Error loading benchmarks:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os benchmarks.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBenchmarks = benchmarks.filter(b => {
    if (selectedTask !== "all" && b.task_type !== selectedTask) return false;
    if (selectedModel !== "all" && b.model_name !== selectedModel) return false;
    return true;
  });

  const uniqueTasks = Array.from(new Set(benchmarks.map(b => b.task_type)));
  const uniqueModels = Array.from(new Set(benchmarks.map(b => b.model_name)));

  const topModels = [...filteredBenchmarks]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const averageScore = filteredBenchmarks.length > 0
    ? (filteredBenchmarks.reduce((sum, b) => sum + b.score, 0) / filteredBenchmarks.length).toFixed(2)
    : "0";

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard de Benchmarks</h1>
            <p className="text-muted-foreground">Análise de performance dos modelos em diferentes tarefas</p>
          </div>
          <BarChart3 className="h-12 w-12 text-primary" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Benchmarks</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredBenchmarks.length}</div>
              <p className="text-xs text-muted-foreground">Resultados registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{averageScore}</div>
              <p className="text-xs text-muted-foreground">Média geral de performance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Modelos Avaliados</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueModels.length}</div>
              <p className="text-xs text-muted-foreground">Diferentes modelos</p>
            </CardContent>
          </Card>
        </div>

        {/* Top 3 Models */}
        {topModels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top 3 Modelos (Filtros Aplicados)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topModels.map((model, index) => (
                  <div key={model.id} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{model.model_name}</p>
                      <p className="text-sm text-muted-foreground">{model.task_type}</p>
                    </div>
                    <Badge variant="default">{model.score.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <Select value={selectedTask} onValueChange={setSelectedTask}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tarefa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Tarefas</SelectItem>
                {uniqueTasks.map(task => (
                  <SelectItem key={task} value={task}>{task}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Modelos</SelectItem>
                {uniqueModels.map(model => (
                  <SelectItem key={model} value={model}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Benchmarks Table */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Benchmarks</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : filteredBenchmarks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nenhum benchmark encontrado.</p>
                <p className="text-sm mt-2">Faça upload de dados na página Admin.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBenchmarks.map((benchmark) => (
                    <TableRow key={benchmark.id}>
                      <TableCell className="font-medium">{benchmark.model_name}</TableCell>
                      <TableCell>{benchmark.task_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{benchmark.score.toFixed(2)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{benchmark.metric}</TableCell>
                      <TableCell className="text-muted-foreground">{benchmark.dataset || "N/A"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(benchmark.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
