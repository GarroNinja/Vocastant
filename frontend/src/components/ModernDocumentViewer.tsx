import React from 'react'
import { FileText, File, FileImage, Download, Trash2, Eye, Calendar, HardDrive } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useAppStore } from '../store/useAppStore'

const getFileIcon = (type: string) => {
  switch (type) {
    case 'application/pdf':
      return <FileText className="h-5 w-5" />
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return <File className="h-5 w-5" />
    case 'text/plain':
      return <FileText className="h-5 w-5" />
    default:
      return <File className="h-5 w-5" />
  }
}

const getFileTypeLabel = (type: string) => {
  switch (type) {
    case 'application/pdf':
      return 'PDF'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'Word'
    case 'text/plain':
      return 'Text'
    default:
      return 'Document'
  }
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const ModernDocumentViewer: React.FC = () => {
  const { documents, removeDocument } = useAppStore()

  if (documents.length === 0) {
    return (
      <Card className="w-full h-full bg-gradient-to-br from-background to-muted/20 border-0 shadow-xl">
        <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Documents Yet</h3>
          <p className="text-muted-foreground mb-4">
            Upload your first document to get started with AI-powered analysis
          </p>
          <div className="text-xs text-muted-foreground">
            Supported formats: PDF, Word, Text
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full h-full bg-gradient-to-br from-background to-muted/20 border-0 shadow-xl">
      <CardHeader className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardTitle className="flex items-center gap-3 text-xl font-bold">
          <FileText className="h-6 w-6 text-primary" />
          Your Documents
          <Badge variant="secondary" className="ml-2">
            {documents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-y-auto h-full max-h-96">
          <div className="p-4 space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="group relative bg-card border border-border/50 rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  {/* File Icon */}
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getFileIcon(doc.type)}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-foreground truncate pr-2">
                        {doc.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {getFileTypeLabel(doc.type)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(doc.size)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {doc.uploadedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      title="View Document"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-primary/10"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                      title="Delete Document"
                      onClick={() => removeDocument(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <Badge 
                    variant={doc.status === 'ready' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {doc.status === 'ready' ? 'Ready' : 'Processing'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
