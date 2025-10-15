import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Database, FileJson } from "lucide-react";

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
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Painel de Administração</h1>
          <p className="text-muted-foreground">Upload de dados para o banco de dados</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Modelos
              </CardTitle>
              <CardDescription>
                Upload do JSON com a lista de modelos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="models-upload">
                <Button asChild disabled={uploading} className="w-full cursor-pointer">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Carregando..." : "Upload Modelos"}
                  </span>
                </Button>
                <input
                  id="models-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "models")}
                  disabled={uploading}
                />
              </label>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => clearTable("models")}
              >
                <Database className="w-4 h-4 mr-2" />
                Limpar Tabela
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Respostas do Arena
              </CardTitle>
              <CardDescription>
                Upload do JSON com respostas dos modelos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="responses-upload">
                <Button asChild disabled={uploading} className="w-full cursor-pointer">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Carregando..." : "Upload Respostas"}
                  </span>
                </Button>
                <input
                  id="responses-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "arena_responses")}
                  disabled={uploading}
                />
              </label>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => clearTable("arena_responses")}
              >
                <Database className="w-4 h-4 mr-2" />
                Limpar Tabela
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Votos do Arena
              </CardTitle>
              <CardDescription>
                Upload do JSON com votos dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="votes-upload">
                <Button asChild disabled={uploading} className="w-full cursor-pointer">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Carregando..." : "Upload Votos"}
                  </span>
                </Button>
                <input
                  id="votes-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "arena_votes")}
                  disabled={uploading}
                />
              </label>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => clearTable("arena_votes")}
              >
                <Database className="w-4 h-4 mr-2" />
                Limpar Tabela
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                Upload do JSON com resultados do leaderboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label htmlFor="leaderboard-upload">
                <Button asChild disabled={uploading} className="w-full cursor-pointer">
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? "Carregando..." : "Upload Leaderboard"}
                  </span>
                </Button>
                <input
                  id="leaderboard-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, "leaderboard")}
                  disabled={uploading}
                />
              </label>
              <Button 
                variant="destructive" 
                className="w-full" 
                onClick={() => clearTable("leaderboard_results")}
              >
                <Database className="w-4 h-4 mr-2" />
                Limpar Tabela
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Formato dos JSONs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="font-semibold mb-1">Modelos:</p>
              <code className="block bg-background p-2 rounded">
                {`[{"model_id": "gpt-4", "model_name": "GPT-4", "provider": "OpenAI"}]`}
              </code>
            </div>
            <div>
              <p className="font-semibold mb-1">Respostas:</p>
              <code className="block bg-background p-2 rounded">
                {`[{"prompt": "...", "model_id": "gpt-4", "response": "...", "response_time": 1.5, "tokens_used": 100}]`}
              </code>
            </div>
            <div>
              <p className="font-semibold mb-1">Votos:</p>
              <code className="block bg-background p-2 rounded">
                {`[{"prompt": "...", "model_a_id": "gpt-4", "model_b_id": "claude", "winner_model_id": "gpt-4"}]`}
              </code>
            </div>
            <div>
              <p className="font-semibold mb-1">Leaderboard:</p>
              <code className="block bg-background p-2 rounded">
                {`[{"model_name": "GPT-4", "technique": "RAG", "task": "QA", "score": 95.5, "rank": 1}]`}
              </code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;