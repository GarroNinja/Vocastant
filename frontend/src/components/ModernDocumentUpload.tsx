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

interface ModernDocumentUploadProps {
  onUploadComplete?: () => void
}

export const ModernDocumentUpload: React.FC<ModernDocumentUploadProps> = ({ onUploadComplete }) => {
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
        // Get current room name from API service
        const currentRoom = apiService.getCurrentRoomName();
        console.log('📤 Uploading to room:', currentRoom);
        
        // Upload file with explicit room name
        const response = await apiService.uploadDocument(file, currentRoom)
        
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
        
        // Call completion callback
        if (onUploadComplete) {
          onUploadComplete()
        }
        
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
    <Card className="w-full bg-gray-800/80 border-green-500/30 shadow-xl">
      <CardHeader className="border-b border-green-500/20 bg-green-500/10">
        <CardTitle className="flex items-center gap-3 text-lg font-bold text-green-400">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Drag & Drop Area */}
        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer ${
            isDragOver
              ? 'border-lime-400 bg-green-500/20 scale-105 shadow-lg'
              : 'border-green-500/40 hover:border-green-400 hover:bg-green-500/10'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div 
            className="w-full cursor-pointer"
            onClick={openFileDialog}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
              isDragOver ? 'bg-green-500/30 shadow-lg' : 'bg-green-500/20'
            }`}>
              <Upload className={`h-6 w-6 transition-all duration-300 text-green-400 ${
                isDragOver ? 'scale-110' : ''
              }`} />
            </div>
            
            <h3 className="text-base font-semibold mb-2 text-green-400">
              {isDragOver ? 'Drop files here!' : 'Upload Documents'}
            </h3>
            
            <p className="text-green-200 mb-3 text-sm">
              Drag and drop or click to browse
            </p>
            
            <div className="text-xs text-green-300">
              PDF, Word, Text • Max 10MB
            </div>
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
            <h4 className="font-medium text-sm text-green-300">Upload Progress</h4>
            {uploadStatuses.map((status) => (
              <div
                key={status.id}
                className="flex items-center gap-3 p-3 bg-gray-700/60 border border-green-500/30 rounded-lg"
              >
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {status.status === 'uploading' && (
                    <Loader2 className="h-5 w-5 text-lime-400 animate-spin" />
                  )}
                  {status.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  {status.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium truncate text-white">{status.name}</p>
                    <Badge 
                      className={`text-xs ${
                        status.status === 'success' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                        status.status === 'error' ? 'bg-red-500/20 text-red-400 border-red-500/50' : 
                        'bg-lime-500/20 text-lime-400 border-lime-500/50'
                      }`}
                    >
                      {status.status === 'uploading' ? 'Uploading...' :
                       status.status === 'success' ? 'Success' : 'Error'}
                    </Badge>
                  </div>
                  
                  {status.status === 'uploading' && (
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-lime-500 to-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {status.error && (
                    <p className="text-xs text-red-400 mt-1">{status.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-red-500/20 hover:text-red-400 text-gray-400"
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
