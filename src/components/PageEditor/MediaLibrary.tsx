'use client';

import React, { useState, useEffect } from 'react';
import { Upload, Image, Video, File, X, Search, Grid, List } from 'lucide-react';

interface MediaItem {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
  created_at: string;
}

interface MediaLibraryProps {
  subcategoryId: string;
  onSelect?: (media: MediaItem) => void;
  allowMultiple?: boolean;
}

export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  subcategoryId,
  onSelect,
  allowMultiple = false
}) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchMedia();
  }, [subcategoryId, filterType]);

  const fetchMedia = async () => {
    try {
      const url = filterType === 'all'
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/media`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/media?type=${filterType}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setMedia(data);
    } catch (error) {
      console.error('Error fetching media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    setUploading(true);
    const token = localStorage.getItem('token');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        // Upload to your storage service (e.g., Supabase Storage, AWS S3, etc.)
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const uploadData = await uploadResponse.json();

        // Save media metadata to database
        const mediaData = {
          file_name: file.name,
          file_url: uploadData.url,
          file_type: file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file',
          file_size: file.size,
          mime_type: file.type,
          width: uploadData.width,
          height: uploadData.height
        };

        await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/page-content/${subcategoryId}/media`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(mediaData)
          }
        );
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    setUploading(false);
    fetchMedia();
  };

  const handleSelect = (mediaItem: MediaItem) => {
    if (allowMultiple) {
      const newSelected = new Set(selectedMedia);
      if (newSelected.has(mediaItem.id)) {
        newSelected.delete(mediaItem.id);
      } else {
        newSelected.add(mediaItem.id);
      }
      setSelectedMedia(newSelected);
    } else {
      if (onSelect) {
        onSelect(mediaItem);
      }
    }
  };

  const filteredMedia = media.filter(item =>
    item.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.alt_text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Media Library</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-2 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search media..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="file">Files</option>
          </select>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
          <input
            type="file"
            id="file-upload"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF, MP4, PDF up to 10MB
            </p>
          </label>
        </div>
      </div>

      {/* Media Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading media...</p>
          </div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No media found</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-4">
            {filteredMedia.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                selected={selectedMedia.has(item.id)}
                onSelect={() => handleSelect(item)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMedia.map((item) => (
              <MediaListItem
                key={item.id}
                item={item}
                selected={selectedMedia.has(item.id)}
                onSelect={() => handleSelect(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {allowMultiple && selectedMedia.size > 0 && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {selectedMedia.size} item{selectedMedia.size !== 1 ? 's' : ''} selected
          </p>
          <button
            onClick={() => {
              const selected = media.filter(m => selectedMedia.has(m.id));
              if (onSelect && selected.length > 0) {
                selected.forEach(onSelect);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Insert Selected
          </button>
        </div>
      )}
    </div>
  );
};

const MediaCard: React.FC<{
  item: MediaItem;
  selected: boolean;
  onSelect: () => void;
}> = ({ item, selected, onSelect }) => {
  const getIcon = () => {
    switch (item.file_type) {
      case 'image':
        return <Image className="w-8 h-8 text-blue-600" />;
      case 'video':
        return <Video className="w-8 h-8 text-purple-600" />;
      default:
        return <File className="w-8 h-8 text-gray-600" />;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
        selected ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-400'
      }`}
    >
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        {item.file_type === 'image' ? (
          <img
            src={item.file_url}
            alt={item.alt_text || item.file_name}
            className="w-full h-full object-cover"
          />
        ) : (
          getIcon()
        )}
      </div>
      <div className="p-2 bg-white">
        <p className="text-xs font-medium truncate">{item.file_name}</p>
        <p className="text-xs text-gray-500">
          {(item.file_size / 1024).toFixed(1)} KB
        </p>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

const MediaListItem: React.FC<{
  item: MediaItem;
  selected: boolean;
  onSelect: () => void;
}> = ({ item, selected, onSelect }) => {
  const getIcon = () => {
    switch (item.file_type) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-purple-600" />;
      default:
        return <File className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div
      onClick={onSelect}
      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
        selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-400'
      }`}
    >
      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded flex items-center justify-center mr-3">
        {item.file_type === 'image' ? (
          <img
            src={item.file_url}
            alt={item.alt_text || item.file_name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          getIcon()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.file_name}</p>
        <p className="text-xs text-gray-500">
          {item.file_type} • {(item.file_size / 1024).toFixed(1)} KB
          {item.width && item.height && ` • ${item.width}×${item.height}`}
        </p>
      </div>
      {selected && (
        <div className="flex-shrink-0 ml-3">
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};
