import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Database, Trash2, MessageSquare, Vote, TrendingUp, BarChart } from "lucide-react";

const Admin = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (type === "models") {
        // Upload models data
        const models = Array.isArray(data) ? data : [data];
        const { error } = await supabase.from("models").insert(
          models.map((model: any) => ({
            model_id: model.model_id || model.id,
            model_name: model.model_name || model.name,
            provider: model.provider,
          }))
        );

        if (error) throw error;
        toast({
          title: "Modelos carregados!",
          description: `${models.length} modelo(s) adicionado(s) ao banco.`,
        });
      } else if (type === "arena_responses") {
        // Upload arena responses
        const responses = Array.isArray(data) ? data : [data];
        const { error } = await supabase.from("arena_responses").insert(
          responses.map((response: any) => ({
            prompt: response.prompt,
            model_id: response.model_id,
            response: response.response,
            response_time: response.response_time,
            tokens_used: response.tokens_used,
          }))
        );

        if (error) throw error;
        toast({
          title: "Respostas carregadas!",
          description: `${responses.length} resposta(s) adicionada(s) ao banco.`,
        });
      } else if (type === "arena_votes") {
        // Upload arena votes
        const votes = Array.isArray(data) ? data : [data];
        const { error } = await supabase.from("arena_votes").insert(
          votes.map((vote: any) => ({
            prompt: vote.prompt,
            model_a_id: vote.model_a_id,
            model_b_id: vote.model_b_id,
            winner_model_id: vote.winner_model_id,
          }))
        );

        if (error) throw error;
        toast({
          title: "Votos carregados!",
          description: `${votes.length} voto(s) adicionado(s) ao banco.`,
        });
      } else if (type === "leaderboard") {
        // Upload leaderboard results
        const results = Array.isArray(data) ? data : [data];
        const { error } = await supabase.from("leaderboard_results").insert(
          results.map((result: any) => ({
            model_name: result.model_name || result.modelName,
            technique: result.technique,
            task: result.task,
            score: result.score,
            rank: result.rank,
          }))
        );

        if (error) throw error;
        toast({
          title: "Leaderboard carregado!",
          description: `${results.length} resultado(s) adicionado(s) ao banco.`,
        });
      } else if (type === "benchmarks") {
        // Upload benchmarks data
        const benchmarks = Array.isArray(data) ? data : [data];
        const { error } = await supabase.from("benchmarks").insert(
          benchmarks.map((benchmark: any) => ({
            model_name: benchmark.model_name,
            task_type: benchmark.task_type,
            score: benchmark.score,
            metric: benchmark.metric,
            dataset: benchmark.dataset,
          }))
        );

        if (error) throw error;
        toast({
          title: "Benchmarks carregados!",
          description: `${benchmarks.length} benchmark(s) adicionado(s) ao banco.`,
        });
      }
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Erro ao carregar arquivo",
        description: error.message || "Verifique o formato do JSON e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const clearTable = async (tableName: string) => {
    try {
      const { error } = await supabase.from(tableName as any).delete().gte('created_at', '1970-01-01');
      
      if (error) throw error;
      
      toast({
        title: "Tabela limpa!",
        description: `Todos os dados de ${tableName} foram removidos.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao limpar tabela",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Admin Panel</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Models Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Modelos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, "models")}
                    className="hidden"
                    id="models-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById("models-upload")?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON (Modelos)
                  </Button>
                </label>
                
                <Button
                  variant="destructive"
                  onClick={() => clearTable("models")}
                  disabled={uploading}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tabela
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-semibold mb-2">Formato esperado:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "model_id": "gpt-4",
    "model_name": "GPT-4",
    "provider": "OpenAI"
  }
]`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Arena Responses Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Respostas Arena
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, "responses")}
                    className="hidden"
                    id="responses-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById("responses-upload")?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON (Respostas)
                  </Button>
                </label>
                
                <Button
                  variant="destructive"
                  onClick={() => clearTable("arena_responses")}
                  disabled={uploading}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tabela
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-semibold mb-2">Formato esperado:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "model_id": "gpt-4",
    "prompt": "texto",
    "response": "resposta",
    "response_time": 1.5,
    "tokens_used": 100
  }
]`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Arena Votes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5" />
                Votos Arena
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, "votes")}
                    className="hidden"
                    id="votes-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById("votes-upload")?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON (Votos)
                  </Button>
                </label>
                
                <Button
                  variant="destructive"
                  onClick={() => clearTable("arena_votes")}
                  disabled={uploading}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tabela
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-semibold mb-2">Formato esperado:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "prompt": "texto",
    "model_a_id": "gpt-4",
    "model_b_id": "claude-3",
    "winner_model_id": "gpt-4"
  }
]`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Leaderboard (Votos)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, "leaderboard")}
                    className="hidden"
                    id="leaderboard-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById("leaderboard-upload")?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON (Leaderboard)
                  </Button>
                </label>
                
                <Button
                  variant="destructive"
                  onClick={() => clearTable("leaderboard_results")}
                  disabled={uploading}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tabela
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-semibold mb-2">Formato esperado:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "model_name": "GPT-4",
    "task": "Resumo",
    "technique": "Few-shot",
    "score": 95.5,
    "rank": 1
  }
]`}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Benchmarks Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Benchmarks dos Modelos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="block">
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => handleFileUpload(e, "benchmarks")}
                    className="hidden"
                    id="benchmarks-upload"
                  />
                  <Button 
                    onClick={() => document.getElementById("benchmarks-upload")?.click()}
                    disabled={uploading}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload JSON (Benchmarks)
                  </Button>
                </label>
                
                <Button
                  variant="destructive"
                  onClick={() => clearTable("benchmarks")}
                  disabled={uploading}
                  className="w-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Tabela
                </Button>
              </div>
              
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-semibold mb-2">Formato esperado:</p>
                <pre className="text-xs overflow-x-auto">
{`[
  {
    "model_name": "GPT-4",
    "task_type": "text-generation",
    "score": 92.5,
    "metric": "accuracy",
    "dataset": "MMLU"
  }
]`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Admin;