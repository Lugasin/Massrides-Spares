import React, { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Trash2 } from "lucide-react";

const VendorMedia = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setSelectedFiles(Array.from(event.target.files));
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files) {
      setSelectedFiles(Array.from(event.dataTransfer.files));
    }
  };

  const handleRemoveFile = (fileName: string) => {
    setSelectedFiles(selectedFiles.filter(file => file.name !== fileName));
  };

  const handleUpload = () => {
    // TODO: Implement file upload logic (requires backend)
    console.log("Uploading files:", selectedFiles);
    // Clear selected files after simulated upload
    setSelectedFiles([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header /> {/* Assuming Header is suitable for this page */}

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Vendor Media Management</h1>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Upload Media Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()} // Prevent default drag behavior
            >
              <Input 
                type="file" 
                className="hidden"
                id="file-upload"
                multiple
                onChange={handleFileChange}
              />
              <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Drag and drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">(Up to 10 files, Max size 5MB each)</p>
              </Label>
            </div>

            {selectedFiles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Selected Files:</h3>
                <ul className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex items-center justify-between bg-secondary/10 p-3 rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-secondary-foreground" />
                        <span>{file.name} ({Math.round(file.size / 1024)} KB)</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(file.name)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button onClick={handleUpload} className="mt-4">Upload Files</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Existing Media Files Section (Placeholder) */}
         <Card>
          <CardHeader>
            <CardTitle>Existing Media Files</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder for displaying existing files */}
            <div className="text-muted-foreground italic">[List of existing uploaded files will be shown here]</div>
             {/* Example: Grid of image previews or list of file names */}
             {/* <div className="grid grid-cols-4 gap-4"> */}
               {/* <img src="..." alt="..." className="w-full h-24 object-cover rounded-md" /> */}
               {/* ... */}
             {/* </div> */}
          </CardContent>
        </Card>

      </main>

      <Footer /> {/* Assuming Footer is suitable */}
    </div>
  );
};

export default VendorMedia;
