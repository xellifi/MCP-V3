import React, { useState, useRef } from 'react';
import { Image, Link, Upload, X, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CollapsibleTips from './CollapsibleTips';

interface ImageNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        imageUrl?: string;
        imageSource?: 'url' | 'upload';
        caption?: string;
        delaySeconds?: number;
    };
    onChange: (config: any) => void;
}

const ImageNodeForm: React.FC<ImageNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    const [imageSource, setImageSource] = useState<'url' | 'upload'>(initialConfig?.imageSource || 'url');
    const [imageUrl, setImageUrl] = useState(initialConfig?.imageUrl || '');
    const [caption, setCaption] = useState(initialConfig?.caption || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [previewError, setPreviewError] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const notifyChange = (
        newImageUrl: string,
        newImageSource: 'url' | 'upload',
        newCaption: string,
        newDelay: number
    ) => {
        onChange({
            imageUrl: newImageUrl,
            imageSource: newImageSource,
            caption: newCaption,
            delaySeconds: newDelay
        });
    };

    const handleUrlChange = (url: string) => {
        setImageUrl(url);
        setPreviewError(false);
        notifyChange(url, 'url', caption, delaySeconds);
    };

    const handleCaptionChange = (text: string) => {
        setCaption(text);
        notifyChange(imageUrl, imageSource, text, delaySeconds);
    };

    const handleDelayChange = (value: number) => {
        setDelaySeconds(value);
        notifyChange(imageUrl, imageSource, caption, value);
    };

    const handleSourceChange = (source: 'url' | 'upload') => {
        setImageSource(source);
        // Clear current image when switching sources
        if (source !== imageSource) {
            setImageUrl('');
            setPreviewError(false);
            notifyChange('', source, caption, delaySeconds);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            setUploadError('Invalid file type. Please upload PNG, JPEG, or GIF.');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setUploadError('File too large. Maximum size is 5MB.');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            // Generate unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${workspaceId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('flow-images')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('flow-images')
                .getPublicUrl(fileName);

            const publicUrl = urlData.publicUrl;
            setImageUrl(publicUrl);
            setPreviewError(false);
            notifyChange(publicUrl, 'upload', caption, delaySeconds);
        } catch (error: any) {
            console.error('Upload error:', error);
            setUploadError(error.message || 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const clearImage = () => {
        setImageUrl('');
        setPreviewError(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        notifyChange('', imageSource, caption, delaySeconds);
    };

    return (
        <div className="space-y-6">
            {/* Image Source Toggle */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <Image className="w-4 h-4 inline mr-2" />
                    Image Source
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => handleSourceChange('url')}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${imageSource === 'url'
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <Link className="w-4 h-4" />
                        URL
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSourceChange('upload')}
                        className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${imageSource === 'upload'
                            ? 'bg-rose-500 text-white'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                    >
                        <Upload className="w-4 h-4" />
                        Upload
                    </button>
                </div>
            </div>

            {/* URL Input */}
            {imageSource === 'url' && (
                <div>
                    <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                        Image URL
                    </label>
                    <input
                        type="url"
                        value={imageUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500"
                    />
                    <p className="mt-2 text-xs text-slate-400">
                        Enter a direct link to an image (PNG, JPEG, JPG, or GIF)
                    </p>
                </div>
            )}

            {/* File Upload */}
            {imageSource === 'upload' && (
                <div>
                    <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                        Upload Image
                    </label>
                    <div className="relative">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".png,.jpeg,.jpg,.gif,image/png,image/jpeg,image/gif"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            className="hidden"
                            id="image-upload"
                        />
                        <label
                            htmlFor="image-upload"
                            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploading
                                ? 'border-slate-600 bg-slate-800/50'
                                : 'border-white/20 hover:border-rose-500/50 hover:bg-rose-500/5'
                                }`}
                        >
                            {uploading ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mb-2" />
                                    <span className="text-sm text-slate-400">Uploading...</span>
                                </div>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                    <span className="text-sm text-slate-400">Click to upload</span>
                                    <span className="text-xs text-slate-500 mt-1">PNG, JPEG, GIF (max 5MB)</span>
                                </>
                            )}
                        </label>
                    </div>
                    {uploadError && (
                        <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {uploadError}
                        </p>
                    )}
                </div>
            )}

            {/* Image Preview */}
            {imageUrl && (
                <div className="relative">
                    <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                        Preview
                    </label>
                    <div className="relative bg-black/20 border border-white/10 rounded-xl p-2 overflow-hidden">
                        {previewError ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
                                <span className="text-sm">Failed to load image</span>
                            </div>
                        ) : (
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="w-full h-auto max-h-48 object-contain rounded-lg"
                                onError={() => setPreviewError(true)}
                            />
                        )}
                        <button
                            type="button"
                            onClick={clearImage}
                            className="absolute top-4 right-4 w-8 h-8 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                            title="Remove image"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Caption */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    Caption (Optional)
                </label>
                <input
                    type="text"
                    value={caption}
                    onChange={(e) => handleCaptionChange(e.target.value)}
                    placeholder="Add a caption to send with the image..."
                    maxLength={200}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-rose-500/50 outline-none transition-all placeholder-slate-500"
                />
                <p className="mt-2 text-xs text-slate-400">
                    Optional text sent as a separate message after the image
                </p>
            </div>

            {/* Delay Before Sending */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Delay Before Sending
                </label>
                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min="0"
                        max="30"
                        value={delaySeconds}
                        onChange={(e) => handleDelayChange(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                    <span className="text-white font-medium min-w-[60px] text-right">
                        {delaySeconds}s
                    </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    Wait time before sending this image (shows typing indicator)
                </p>
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Info" color="purple">
                <p className="text-xs md:text-sm">
                    <strong>Use this node to:</strong>
                </p>
                <ul className="mt-2 text-xs md:text-sm space-y-1 list-disc list-inside opacity-90">
                    <li>Send an image via Messenger to users</li>
                    <li>Provide a URL to an existing image or upload one</li>
                    <li>Add an optional caption below the image</li>
                </ul>
                <p className="mt-2 text-xs md:text-sm opacity-90">
                    <strong>Supported formats:</strong> PNG, JPEG, JPG, GIF (max 5MB for uploads)
                </p>
            </CollapsibleTips>
        </div>
    );
};

export default ImageNodeForm;
