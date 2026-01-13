
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface ImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ value, onChange, disabled }) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(value || null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setUploading(true);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            setPreview(data.publicUrl);
            onChange(data.publicUrl); // Pass the URL up to the form
            toast.success('Image uploaded successfully');
        } catch (error: any) {
            console.error('Error uploading image:', error);
            toast.error('Error uploading image: ' + error.message);
        } finally {
            setUploading(false);
        }
    }, [onChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp']
        },
        maxFiles: 1,
        disabled: disabled || uploading
    });

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreview(null);
        onChange('');
    };

    return (
        <div className="w-full space-y-4">
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary'
                    } ${preview ? 'border-none p-0' : ''}`}
            >
                <input {...getInputProps()} />

                {uploading ? (
                    <div className="flex flex-col items-center py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                ) : preview ? (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                        <img
                            src={preview}
                            alt="Product preview"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={removeImage}
                                type="button"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Remove Image
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <div className="bg-muted rounded-full p-3 inline-flex mb-3">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium mb-1">
                            Drag & drop or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground">
                            JPEG, PNG, WebP (Max 5MB)
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
