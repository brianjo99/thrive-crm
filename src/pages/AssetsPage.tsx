import { useState, useCallback } from "react";
import { useAssets, useUploadAsset, useDeleteAsset, useClients, useCampaigns, getAssetPublicUrl } from "@/hooks/useSupabaseData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, Upload, Search, Trash2, File, Image, Video, FileText, X, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

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

export default function AssetsPage() {
  const { data: assets = [], isLoading } = useAssets();
  const { data: clients = [] } = useClients();
  const { data: campaigns = [] } = useCampaigns();
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<typeof assets[0] | null>(null);
  const [uploadForm, setUploadForm] = useState({
    files: [] as File[],
    clientId: "",
    campaignId: "",
    notes: "",
  });

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
              <FolderOpen className="h-6 w-6 text-primary" />
              <h1 className="font-display text-2xl font-bold">Assets</h1>
              <span className="text-sm text-muted-foreground">({assets.length})</span>
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2"><Upload className="h-4 w-4" /> Upload</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="p-6 pb-0 shrink-0">
                  <DialogTitle className="font-display">Upload Assets</DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => document.getElementById("fileInput")?.click()}
                  >
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click or drag files to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">Videos, images, documents, project files</p>
                    <input
                      id="fileInput"
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
                    <div className="space-y-2">
                      <Label>Selected Files ({uploadForm.files.length})</Label>
                      {uploadForm.files.map((f, i) => {
                        const FileIcon = getFileIcon(f.type);
                        return (
                          <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded-lg p-2">
                            <FileIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{f.name}</span>
                            <span className="text-muted-foreground text-xs">{formatFileSize(f.size)}</span>
                            <button onClick={() => setUploadForm(prev => ({ ...prev, files: prev.files.filter((_, j) => j !== i) }))}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Link to Client (optional)</Label>
                    <Select value={uploadForm.clientId} onValueChange={(v) => setUploadForm(prev => ({ ...prev, clientId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                      <SelectContent>
                        {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Link to Campaign (optional)</Label>
                    <Select value={uploadForm.campaignId} onValueChange={(v) => setUploadForm(prev => ({ ...prev, campaignId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
                      <SelectContent>
                        {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input value={uploadForm.notes} onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Optional notes about these files" />
                  </div>
                </div>
                <div className="shrink-0 sticky bottom-0 bg-background border-t border-border p-4 flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsUploadOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpload} disabled={uploadAsset.isPending || uploadForm.files.length === 0}>
                    {uploadAsset.isPending ? "Uploading..." : `Upload ${uploadForm.files.length} file(s)`}
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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : filteredAssets.length === 0 ? (
          <Card className="luxury-card p-12 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">No Assets Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">Upload footage, images, documents, and project files. Drag and drop or click Upload.</p>
            <Button onClick={() => setIsUploadOpen(true)} className="gap-2"><Upload className="h-4 w-4" />Upload Files</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredAssets.map((asset, index) => {
              const FileIcon = getFileIcon(asset.file_type);
              const isImage = asset.file_type.startsWith("image/");
              const publicUrl = getAssetPublicUrl(asset.file_path);
              return (
                <motion.div key={asset.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.03 }}>
                  <Card className="luxury-card overflow-hidden group cursor-pointer" onClick={() => setPreviewAsset(asset)}>
                    <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                      {isImage ? (
                        <img src={publicUrl} alt={asset.name} className="w-full h-full object-cover" />
                      ) : (
                        <FileIcon className="h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                        <Eye className="h-6 w-6 text-background opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">{formatFileSize(asset.file_size)}</span>
                        <span className="text-xs text-muted-foreground">{format(new Date(asset.created_at), "MMM d")}</span>
                      </div>
                      {(asset as any).clients?.name && (
                        <p className="text-xs text-primary mt-1 truncate">{(asset as any).clients.name}</p>
                      )}
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
                <DialogTitle className="font-display">{previewAsset.name}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 space-y-4">
                {previewAsset.file_type.startsWith("image/") && (
                  <img src={getAssetPublicUrl(previewAsset.file_path)} alt={previewAsset.name} className="w-full rounded-lg" />
                )}
                {previewAsset.file_type.startsWith("video/") && (
                  <video src={getAssetPublicUrl(previewAsset.file_path)} controls className="w-full rounded-lg" />
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{previewAsset.file_type}</span></div>
                  <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{formatFileSize(previewAsset.file_size)}</span></div>
                  <div><span className="text-muted-foreground">Uploaded:</span> <span className="font-medium">{format(new Date(previewAsset.created_at), "MMM d, yyyy")}</span></div>
                  {(previewAsset as any).clients?.name && <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{(previewAsset as any).clients.name}</span></div>}
                </div>
                {previewAsset.notes && <div><span className="text-muted-foreground text-sm">Notes:</span><p className="text-sm mt-1">{previewAsset.notes}</p></div>}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={getAssetPublicUrl(previewAsset.file_path)} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4" /> Open
                    </a>
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => {
                      deleteAsset.mutate({ id: previewAsset.id, file_path: previewAsset.file_path });
                      setPreviewAsset(null);
                      toast.success("Asset deleted");
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
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
