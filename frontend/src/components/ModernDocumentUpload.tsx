import React, { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { useAppStore } from '../store/useAppStore'
import { apiService } from '../services/api'

interface UploadStatus {
  id: string
  name: string
  status: 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export const ModernDocumentUpload: React.FC = () => {
  const { addDocument } = useAppStore()
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files)
    
    for (const file of fileArray) {
      const uploadId = crypto.randomUUID()
      
      // Add to upload status
      setUploadStatuses(prev => [...prev, {
        id: uploadId,
        name: file.name,
        status: 'uploading',
        progress: 0
      }])

      try {
        // Create FormData
        const formData = new FormData()
        formData.append('document', file)

        // Upload file
        const response = await apiService.uploadDocument(file)
        
        // Update status to success
        setUploadStatuses(prev => prev.map(status => 
          status.id === uploadId 
            ? { ...status, status: 'success', progress: 100 }
            : status
        ))

        // Add to documents store
        const newDoc = {
          id: response.id,
          name: response.originalName,
          type: response.type as 'pdf' | 'docx' | 'txt' | 'md',
          size: response.size,
          uploadedAt: new Date(response.uploadedAt),
          status: 'ready' as const
        }
        
        addDocument(newDoc)
        
        // Remove success status after 3 seconds
        setTimeout(() => {
          setUploadStatuses(prev => prev.filter(status => status.id !== uploadId))
        }, 3000)
        
      } catch (error) {
        console.error('Upload error:', error)
        
        // Update status to error
        setUploadStatuses(prev => prev.map(status => 
          status.id === uploadId 
            ? { 
                ...status, 
                status: 'error', 
                error: 'Upload failed. Please try again.' 
              }
            : status
        ))
      }
    }
  }, [addDocument])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    if (e.dataTransfer.files) {
      handleFileUpload(e.dataTransfer.files)
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileUpload(e.target.files)
    }
  }, [handleFileUpload])

  const removeUploadStatus = useCallback((id: string) => {
    setUploadStatuses(prev => prev.filter(status => status.id !== id))
  }, [])

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <Card className="w-full bg-gradient-to-br from-background to-muted/20 border-0 shadow-xl">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <Upload className="h-6 w-6 text-primary" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Drag & Drop Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-primary bg-primary/5 scale-105'
              : 'border-border/50 hover:border-primary/50 hover:bg-muted/20'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          
          <h3 className="text-lg font-semibold mb-2">
            {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
          </h3>
          
          <p className="text-muted-foreground mb-4">
            or click to browse your files
          </p>
          
          <Button 
            onClick={openFileDialog}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Choose Files
          </Button>
          
          <div className="mt-4 text-xs text-muted-foreground">
            Supports PDF, Word, and Text files up to 10MB
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Status */}
        {uploadStatuses.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-medium text-sm">Upload Progress</h4>
            {uploadStatuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {status.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  )}
                  {status.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                  {status.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate">{status.name}</p>
                    <Badge 
                      variant={
                        status.status === 'success' ? 'default' :
                        status.status === 'error' ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {status.status === 'uploading' ? 'Uploading...' :
                       status.status === 'success' ? 'Success' : 'Error'}
                    </Badge>
                  </div>
                  
                  {status.status === 'uploading' && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {status.error && (
                    <p className="text-xs text-destructive mt-1">{status.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeUploadStatus(status.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
