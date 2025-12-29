import React, { useState } from 'react';
import { Video, Link, AlertCircle, Clock } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface VideoNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        videoUrl?: string;
        caption?: string;
        delaySeconds?: number;
    };
    onChange: (config: any) => void;
}

const VideoNodeForm: React.FC<VideoNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    const [videoUrl, setVideoUrl] = useState(initialConfig?.videoUrl || '');
    const [caption, setCaption] = useState(initialConfig?.caption || '');
    const [delaySeconds, setDelaySeconds] = useState(initialConfig?.delaySeconds || 0);
    const [previewError, setPreviewError] = useState(false);

    const notifyChange = (newVideoUrl: string, newCaption: string, newDelay: number) => {
        onChange({
            videoUrl: newVideoUrl,
            caption: newCaption,
            delaySeconds: newDelay
        });
    };

    const handleUrlChange = (url: string) => {
        setVideoUrl(url);
        setPreviewError(false);
        notifyChange(url, caption, delaySeconds);
    };

    const handleCaptionChange = (text: string) => {
        setCaption(text);
        notifyChange(videoUrl, text, delaySeconds);
    };

    const handleDelayChange = (value: number) => {
        setDelaySeconds(value);
        notifyChange(videoUrl, caption, value);
    };

    const isValidVideoUrl = (url: string) => {
        return url.startsWith('http://') || url.startsWith('https://');
    };

    return (
        <div className="space-y-6">
            {/* Video URL Input */}
            <div>
                <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                    <Video className="w-4 h-4 inline mr-2" />
                    Video URL
                </label>
                <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder-slate-500"
                />
                <p className="mt-2 text-xs text-slate-400">
                    Enter a direct link to a video file (MP4 recommended) or Facebook video URL
                </p>
            </div>

            {/* URL Validation Feedback */}
            {videoUrl && !isValidVideoUrl(videoUrl) && (
                <div className="flex items-center gap-2 text-red-400 text-xs">
                    <AlertCircle className="w-4 h-4" />
                    URL must start with http:// or https://
                </div>
            )}

            {/* Video Preview */}
            {videoUrl && isValidVideoUrl(videoUrl) && (
                <div>
                    <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2">
                        Preview
                    </label>
                    <div className="bg-black/20 border border-white/10 rounded-xl p-4 overflow-hidden">
                        {previewError ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                <AlertCircle className="w-8 h-8 mb-2 text-amber-400" />
                                <span className="text-sm">Preview not available</span>
                                <span className="text-xs mt-1 text-slate-500">Video will still be sent</span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch') ? (
                                    (() => {
                                        // Extract video ID from Facebook URL
                                        const videoIdMatch = videoUrl.match(/\/videos\/(\d+)/);
                                        const videoId = videoIdMatch ? videoIdMatch[1] : null;

                                        if (videoId) {
                                            // Facebook video thumbnail URL
                                            const thumbnailUrl = `https://graph.facebook.com/${videoId}/picture`;

                                            return (
                                                <div className="relative">
                                                    <img
                                                        src={thumbnailUrl}
                                                        alt="Facebook Video Thumbnail"
                                                        className="w-full h-auto max-h-48 object-cover rounded-lg"
                                                        onError={() => setPreviewError(true)}
                                                    />
                                                    {/* Play button overlay */}
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-16 h-16 bg-blue-500/80 rounded-full flex items-center justify-center shadow-lg">
                                                            <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
                                                        </div>
                                                    </div>
                                                    <div className="absolute bottom-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                                                        <Video className="w-3 h-3" />
                                                        Facebook Video
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Fallback if no video ID found
                                        return (
                                            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                                <Video className="w-8 h-8 text-blue-400" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-blue-200 font-medium">Facebook Video</p>
                                                    <p className="text-xs text-blue-300/60 truncate">{videoUrl}</p>
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <video
                                        src={videoUrl}
                                        controls
                                        className="w-full max-h-48 rounded-lg"
                                        onError={() => setPreviewError(true)}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                )}
                            </div>
                        )}
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
                    placeholder="Add a caption to send with the video..."
                    maxLength={200}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/50 outline-none transition-all placeholder-slate-500"
                />
                <p className="mt-2 text-xs text-slate-400">
                    Optional text sent as a separate message after the video
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
                        className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-white font-medium min-w-[60px] text-right">
                        {delaySeconds}s
                    </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                    Wait time before sending this video (shows typing indicator)
                </p>
            </div>

            {/* Tips */}
            <CollapsibleTips title="Tips & Info" color="blue">
                <p className="text-xs md:text-sm">
                    <strong>Use this node to:</strong>
                </p>
                <ul className="mt-2 text-xs md:text-sm space-y-1 list-disc list-inside opacity-90">
                    <li>Send a video via Messenger to users</li>
                    <li>Use direct video URLs (MP4 format works best)</li>
                    <li>Add an optional caption below the video</li>
                </ul>
                <p className="mt-2 text-xs md:text-sm opacity-90">
                    <strong>Supported formats:</strong> MP4, MOV (max 25MB via Facebook)
                </p>
                <p className="mt-2 text-xs md:text-sm opacity-90">
                    <strong>Note:</strong> The video URL must be publicly accessible for Facebook to fetch it
                </p>
            </CollapsibleTips>
        </div>
    );
};

export default VideoNodeForm;
