using System;
using System.IO;
using System.Threading.Tasks;
using Alpheratz.Contracts.Services;
using Alpheratz.Infrastructure.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace Alpheratz.Infrastructure.Services;

public class ThumbnailCacheService
{
    private readonly IPathLayoutService _pathService;
    private readonly ILoggingFacade _logger;

    public ThumbnailCacheService(IPathLayoutService pathService, ILoggingFacade logger)
    {
        _pathService = pathService;
        _logger = logger;
    }

    public async Task<string> GetOrCreateThumbnailAsync(string originalPath, int sourceSlot, int size, string version)
    {
        var cacheDir = _pathService.GetImgCacheDir(sourceSlot);
        if (cacheDir == null) throw new InvalidOperationException("Could not resolve image cache directory.");

        var fileName = Path.GetFileName(originalPath);
        var thumbPath = Path.Combine(cacheDir, $"{fileName}.thumb.{version}.jpg");

        if (File.Exists(thumbPath)) return thumbPath;

        try
        {
            await Task.Run(() =>
            {
                using var image = Image.Load(originalPath);
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(size, size),
                    Mode = ResizeMode.Max
                }));
                image.SaveAsJpeg(thumbPath);
            });
            return thumbPath;
        }
        catch (Exception ex)
        {
            _logger.Error("ThumbnailCache", "GetOrCreate", $"Failed to create thumbnail for {originalPath}", ex);
            throw;
        }
    }

    public Task<string> GetGridThumbnailAsync(string path, int sourceSlot) 
        => GetOrCreateThumbnailAsync(path, sourceSlot, 384, "grid.v2");

    public Task<string> GetDetailThumbnailAsync(string path, int sourceSlot) 
        => GetOrCreateThumbnailAsync(path, sourceSlot, 514, "display.v2");

    public async Task<string> GetThumbnailPathAsync(string photoPath)
    {
        // Default to slot 1 and grid size for general prewarming
        return await GetGridThumbnailAsync(photoPath, 1);
    }
}
