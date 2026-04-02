import { useState, useCallback } from "react";
import { useAssets, useUploadAsset, useDeleteAsset, useClients, useCampaigns, getAssetPublicUrl } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, Upload, Search, Trash2, File, Image, Video, FileText, Eye, Download, Scissors } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.startsWith("video/")) return Video;
  if (fileType.startsWith("application/pdf") || fileType.startsWith("text/")) return FileText;
  return File;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function EditorAssetsPage() {
  const { data: assets = [], isLoading } = useAssets();
  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useCampaigns();
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<typeof assets[0] | null>(null);
  const [uploadForm, setUploadForm] = useState({ files: [] as File[], clientId: "", campaignId: "", notes: "" });

  // Filter to show video and image assets most relevant to editors
  const filteredAssets = assets.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleUpload = async () => {
    if (uploadForm.files.length === 0) return;
    try {
      for (const file of uploadForm.files) {
        await uploadAsset.mutateAsync({
          file,
          clientId: uploadForm.clientId || undefined,
          campaignId: uploadForm.campaignId || undefined,
          notes: uploadForm.notes || undefined,
        });
      }
      toast.success(`${uploadForm.files.length} file(s) uploaded!`);
      setUploadForm({ files: [], clientId: "", campaignId: "", notes: "" });
      setIsUploadOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploadForm(prev => ({ ...prev, files: [...prev.files, ...files] }));
    setIsUploadOpen(true);
  }, []);

  return (
    <div className="min-h-screen" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[hsl(280_60%_55%/0.15)] flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-[hsl(280_60%_55%)]" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold">Assets</h1>
                <p className="text-sm text-muted-foreground">Footage and project files ({assets.length})</p>
              </div>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-[hsl(280_60%_55%)] hover:bg-[hsl(280_60%_45%)]">
                  <Upload className="h-4 w-4" /> Upload Files
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Upload Assets</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4">
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-[hsl(280_60%_55%/0.5)] transition-colors"
                    onClick={() => document.getElementById("editorFileInput")?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click or drag files to upload</p>
                    <input
                      id="editorFileInput"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        setUploadForm(prev => ({ ...prev, files: [...prev.files, ...files] }));
                      }}
                    />
                  </div>
                  {uploadForm.files.length > 0 && (
                    <div className="space-y-1">
                      {uploadForm.files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-muted rounded-lg px-3 py-2">
                          <span className="truncate">{f.name}</span>
                          <span className="text-muted-foreground ml-2 flex-shrink-0">{formatFileSize(f.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Campaign</Label>
                    <Select value={uploadForm.campaignId} onValueChange={(v) => setUploadForm(p => ({ ...p, campaignId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select campaign (optional)" /></SelectTrigger>
                      <SelectContent>
                        {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Client</Label>
                    <Select value={uploadForm.clientId} onValueChange={(v) => setUploadForm(p => ({ ...p, clientId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadForm.files.length === 0 || uploadAsset.isPending}
                    className="bg-[hsl(280_60%_55%)] hover:bg-[hsl(280_60%_45%)]"
                  >
                    Upload {uploadForm.files.length > 0 ? `(${uploadForm.files.length})` : ""}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search assets..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
        </div>
      </header>

      <main className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">No Assets Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Upload footage, project files, and deliverables here.
            </p>
            <Button onClick={() => setIsUploadOpen(true)} className="gap-2 bg-[hsl(280_60%_55%)]">
              <Upload className="h-4 w-4" /> Upload Files
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset, index) => {
              const FileIcon = getFileIcon(asset.file_type);
              const isImage = asset.file_type.startsWith("image/");
              const isVideo = asset.file_type.startsWith("video/");
              const publicUrl = getAssetPublicUrl(asset.file_path);
              const client = clients.find(c => c.id === asset.client_id);
              const campaign = campaigns.find(c => c.id === asset.campaign_id);

              return (
                <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03 }}>
                  <Card className="luxury-card overflow-hidden group cursor-pointer hover:border-[hsl(280_60%_55%/0.4)] transition-colors" onClick={() => setPreviewAsset(asset)}>
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      {isImage ? (
                        <img src={publicUrl} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className={cn("h-10 w-10", isVideo ? "text-[hsl(280_60%_55%)]" : "text-muted-foreground")} />
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:text-white hover:bg-white/20">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this asset?")) deleteAsset.mutate({ id: asset.id, file_path: asset.file_path });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {campaign?.name || client?.name || "No campaign"} • {formatFileSize(asset.file_size)}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {previewAsset && (
          <Dialog open={!!previewAsset} onOpenChange={() => setPreviewAsset(null)}>
            <DialogContent className="sm:max-w-2xl p-0 flex flex-col max-h-[90vh]">
              <DialogHeader className="p-6 pb-4 shrink-0">
                <DialogTitle className="font-display flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-[hsl(280_60%_55%)]" />
                  {previewAsset.name}
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                {previewAsset.file_type.startsWith("image/") && (
                  <img src={getAssetPublicUrl(previewAsset.file_path)} alt={previewAsset.name} className="w-full rounded-lg max-h-80 object-contain bg-muted" />
                )}
                {previewAsset.file_type.startsWith("video/") && (
                  <video src={getAssetPublicUrl(previewAsset.file_path)} controls className="w-full rounded-lg" />
                )}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Size</p><p className="font-medium">{formatFileSize(previewAsset.file_size)}</p></div>
                  <div><p className="text-muted-foreground">Type</p><p className="font-medium">{previewAsset.file_type}</p></div>
                  <div><p className="text-muted-foreground">Uploaded</p><p className="font-medium">{format(new Date(previewAsset.created_at), "MMM d, yyyy")}</p></div>
                  {previewAsset.notes && <div className="col-span-2"><p className="text-muted-foreground">Notes</p><p className="font-medium">{previewAsset.notes}</p></div>}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="outline" className="gap-2">
                    <a href={getAssetPublicUrl(previewAsset.file_path)} download={previewAsset.name} target="_blank">
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
