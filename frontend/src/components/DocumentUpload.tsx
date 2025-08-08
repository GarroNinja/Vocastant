import React, { useCallback, useState } from 'react'
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { useAppStore } from '../store/useAppStore'
import { Document } from '../types'
import { apiService } from '../services/api'

export const DocumentUpload: React.FC = () => {
  const { documents, addDocument, removeDocument, updateDocument } = useAppStore()
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    await processFiles(files)
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    await processFiles(files)
  }, [])

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      if (isValidFileType(file)) {
        const document: Document = {
          id: crypto.randomUUID(),
          name: file.name,
          type: getFileType(file.name),
          size: file.size,
          uploadedAt: new Date(),
          status: 'processing'
        }
        
        addDocument(document)
        
        try {
          // Upload document to backend
          const uploadedDoc = await apiService.uploadDocument(file)
          
          // Update document with backend response
          updateDocument(document.id, { 
            status: 'ready',
            id: uploadedDoc.id // Update with backend ID
          })
          
          console.log('Document uploaded and processed successfully:', uploadedDoc)
        } catch (error) {
          console.error('Failed to upload document:', error)
          
          // Update document status to error
          updateDocument(document.id, { 
            status: 'error'
          })
        }
      }
    }
  }

  const isValidFileType = (file: File): boolean => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown']
    return validTypes.includes(file.type) || file.name.endsWith('.md')
  }

  const getFileType = (filename: string): Document['type'] => {
    if (filename.endsWith('.pdf')) return 'pdf'
    if (filename.endsWith('.docx')) return 'docx'
    if (filename.endsWith('.md')) return 'md'
    return 'txt'
  }

  const getFileIcon = (type: Document['type']) => {
    switch (type) {
      case 'pdf': return '📄'
      case 'docx': return '📝'
      case 'md': return '📋'
      case 'txt': return '📄'
      default: return '📄'
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drag & Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">
            Drop your documents here
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports PDF, DOCX, TXT, and Markdown files
          </p>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <span className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              Choose Files
            </span>
          </label>
        </div>

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Uploaded Documents</h4>
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getFileIcon(doc.type)}</span>
                  <div>
                    <p className="font-medium text-sm">{doc.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {doc.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {doc.status === 'processing' && (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-xs text-muted-foreground">Processing...</span>
                    </div>
                  )}
                  {doc.status === 'ready' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {doc.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
