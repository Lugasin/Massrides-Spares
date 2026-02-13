import React, { useState, useEffect } from 'react';
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit,
  Plus,
  Eye,
  Download,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaFile {
  id: string;
  vendor_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  alt_text?: string;
  description?: string;
  tags: string[];
  created_at: string;
}

interface AdData {
  title: string;
  description: string;
  image_url: string;
  target_url: string;
  ad_type: string;
}

export const VendorMediaManager = () => {
  const { profile } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [adForm, setAdForm] = useState<AdData>({
    title: '',
    description: '',
    image_url: '',
    target_url: '',
    ad_type: 'banner'
  });

  useEffect(() => {
    if (profile) {
      fetchMediaFiles();
    }
  }, [profile]);

  const fetchMediaFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendor_media' as any)
        .select('*')
        .eq('vendor_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMediaFiles((data as any[])?.map(item => ({
        ...item,
        tags: item.tags || []
      })) || []);
    } catch (error: any) {
      console.error('Error fetching media files:', error);
      toast.error('Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    if (!profile?.id) {
      toast.error('You must be logged in to upload files');
      return;
    }

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        // Upload to Supabase Storage
        // Filename format: {user_id}/{timestamp}-{clean_filename}
        const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${profile.id}/${Date.now()}-${cleanFileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vendor-media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('vendor-media')
          .getPublicUrl(filePath);

        // Save file record to database
        const { error: dbError } = await supabase
          .from('vendor_media' as any)
          .insert({
            vendor_id: profile.id,
            file_name: file.name,
            file_url: urlData.publicUrl,
            file_type: file.type,
            file_size: file.size,
            tags: [] // Initialize tags
          });

        if (dbError) throw dbError;
      }

      toast.success('Files uploaded successfully');
      setSelectedFiles([]);
      fetchMediaFiles();
    } catch (error: any) {
      logger.error('Error uploading files:', error);
      toast.error(`Failed to upload files: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (id: string, fileUrl: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      // 1. Delete from DB
      const { error: dbError } = await supabase
        .from('vendor_media' as any)
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Delete from Storage (Optional but recommended)
      // Extract path from URL: .../vendor-media/{path}
      const path = fileUrl.split('/vendor-media/')[1];
      if (path) {
        const { error: storageError } = await supabase.storage
          .from('vendor-media')
          .remove([path]);

        if (storageError) console.error('Error deleting file from storage:', storageError);
      }

      toast.success('File deleted');
      setMediaFiles(prev => prev.filter(f => f.id !== id));
    } catch (error: any) {
      console.error('Error deleting media:', error);
      toast.error('Failed to delete file');
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('ads' as any) // Cast until types are updated
        .insert({
          vendor_id: profile.id,
          ...adForm,
          status: 'pending' // Default status
        });

      if (error) throw error;

      toast.success('Advertisement submitted for approval');
      setShowAdForm(false);
      setAdForm({
        title: '',
        description: '',
        image_url: '',
        target_url: '',
        ad_type: 'banner'
      });
    } catch (error: any) {
      console.error('Error creating ad:', error);
      toast.error(`Failed to create advertisement: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Media Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-muted/5">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer block">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2 font-medium">
                  Click to select images or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">
                  Your uploaded images will appear in the gallery below
                </p>
              </Label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="bg-card border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Selected Files ({selectedFiles.length})</h4>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])}>Clear All</Button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded border">
                      <div className="flex items-center gap-2 truncate">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                        <span className="text-xs text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="w-full mt-4"
                >
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Advertisement */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Create Advertisement</CardTitle>
            <Button onClick={() => setShowAdForm(!showAdForm)} variant={showAdForm ? "secondary" : "default"}>
              {showAdForm ? 'Cancel' : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  New Ad Campaign
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showAdForm && (
          <CardContent>
            <form onSubmit={handleCreateAd} className="space-y-4 border p-4 rounded-lg bg-muted/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ad-title">Campaign Title</Label>
                  <Input
                    id="ad-title"
                    value={adForm.title}
                    onChange={(e) => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Summer Sale, New Arrival"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="ad-type">Ad Type</Label>
                  <select
                    id="ad-type"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={adForm.ad_type}
                    onChange={(e) => setAdForm(prev => ({ ...prev, ad_type: e.target.value }))}
                  >
                    <option value="banner">Banner</option>
                    <option value="sidebar">Sidebar</option>
                    <option value="featured">Featured Product</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="ad-description">Description</Label>
                <Textarea
                  id="ad-description"
                  value={adForm.description}
                  onChange={(e) => setAdForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your advertisement..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ad-image">Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="ad-image"
                      value={adForm.image_url}
                      onChange={(e) => setAdForm(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="https://..."
                      required
                    />
                    {/* Could add a 'Select from Gallery' button here later */}
                  </div>
                </div>

                <div>
                  <Label htmlFor="ad-target">Target URL</Label>
                  <Input
                    id="ad-target"
                    value={adForm.target_url}
                    onChange={(e) => setAdForm(prev => ({ ...prev, target_url: e.target.value }))}
                    placeholder="Where user goes on click"
                  />
                </div>
              </div>

              {adForm.image_url && (
                <div className="mt-2">
                  <Label>Preview</Label>
                  <img src={adForm.image_url} alt="Ad Preview" className="h-32 object-cover rounded border mt-1" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAdForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit Campaign</Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Media Gallery */}
      <Card>
        <CardHeader>
          <CardTitle>Media Gallery</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading media files...</p>
            </div>
          ) : mediaFiles.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No media files yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-4">
                Upload images above to build your asset library for products and ads.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaFiles.map((file) => (
                <div key={file.id} className="group relative border rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-square relative bg-muted">
                    <img
                      src={file.file_url}
                      alt={file.alt_text || file.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Overlay Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        title="View"
                        onClick={() => window.open(file.file_url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        title="Copy URL"
                        onClick={() => {
                          navigator.clipboard.writeText(file.file_url);
                          toast.success('URL copied to clipboard');
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        title="Delete"
                        onClick={() => handleDeleteMedia(file.id, file.file_url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-sm font-medium truncate" title={file.file_name}>{file.file_name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs text-muted-foreground">
                        {(file.file_size / 1024).toFixed(1)} KB
                      </p>
                      <Badge variant="outline" className="text-[10px] h-5 px-1">{file.file_type.split('/')[1]}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};