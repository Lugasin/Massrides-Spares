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
  Download
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
      // For now, use placeholder data since vendor_media table doesn't exist
      setMediaFiles([]);
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

    setUploading(true);

    try {
      for (const file of selectedFiles) {
        // Upload to Supabase Storage
        const fileName = `${profile?.id}/${Date.now()}-${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('vendor-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('vendor-media')
          .getPublicUrl(fileName);

        // Save file record to database (when table exists)
        // const { error: dbError } = await supabase
        //   .from('vendor_media')
        //   .insert({
        //     vendor_id: profile?.id,
        //     file_name: file.name,
        //     file_url: urlData.publicUrl,
        //     file_type: file.type,
        //     file_size: file.size
        //   });

        // if (dbError) throw dbError;
      }

      toast.success('Files uploaded successfully');
      setSelectedFiles([]);
      fetchMediaFiles();
    } catch (error: any) {
      logger.error('Error uploading files:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Placeholder until 'ads' table exists. Store ad data locally or send to backend when available.
      logger.log('Ad created (placeholder):', { vendor_id: profile?.id, ...adForm });

      toast.success('Advertisement saved (preview mode)');
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
      toast.error('Failed to create advertisement');
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
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  Click to select images or drag and drop
                </p>
                <p className="text-sm text-muted-foreground">
                  PNG, JPG, WEBP up to 5MB each
                </p>
              </Label>
            </div>

            {selectedFiles.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Selected Files:</h4>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleFileUpload}
                  disabled={uploading}
                  className="w-full mt-4"
                >
                  {uploading ? 'Uploading...' : 'Upload Files'}
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
            <Button onClick={() => setShowAdForm(!showAdForm)}>
              <Plus className="h-4 w-4 mr-2" />
              New Ad
            </Button>
          </div>
        </CardHeader>
        {showAdForm && (
          <CardContent>
            <form onSubmit={handleCreateAd} className="space-y-4">
              <div>
                <Label htmlFor="ad-title">Ad Title</Label>
                <Input
                  id="ad-title"
                  value={adForm.title}
                  onChange={(e) => setAdForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter ad title"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ad-description">Description</Label>
                <Textarea
                  id="ad-description"
                  value={adForm.description}
                  onChange={(e) => setAdForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter ad description"
                />
              </div>

              <div>
                <Label htmlFor="ad-image">Image URL</Label>
                <Input
                  id="ad-image"
                  value={adForm.image_url}
                  onChange={(e) => setAdForm(prev => ({ ...prev, image_url: e.target.value }))}
                  placeholder="Enter image URL"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ad-target">Target URL</Label>
                <Input
                  id="ad-target"
                  value={adForm.target_url}
                  onChange={(e) => setAdForm(prev => ({ ...prev, target_url: e.target.value }))}
                  placeholder="Where should the ad link to?"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Create Ad</Button>
                <Button type="button" variant="outline" onClick={() => setShowAdForm(false)}>
                  Cancel
                </Button>
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
            <div className="text-center py-12">
              <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No media files</h3>
              <p className="text-muted-foreground">
                Upload images to use in your product listings and advertisements.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {mediaFiles.map((file) => (
                <div key={file.id} className="group relative">
                  <img
                    src={file.file_url}
                    alt={file.alt_text || file.file_name}
                    className="w-full h-32 object-cover rounded-lg"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                    <Button variant="secondary" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.file_size / 1024).toFixed(1)} KB
                    </p>
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