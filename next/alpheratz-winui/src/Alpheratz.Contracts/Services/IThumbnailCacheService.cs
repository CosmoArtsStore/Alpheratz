using System.Threading.Tasks;

namespace Alpheratz.Contracts.Services;

public interface IThumbnailCacheService
{
    Task<string> GetOrCreateThumbnailAsync(string originalPath, int sourceSlot, int size, string version);
    Task<string> GetGridThumbnailAsync(string path, int sourceSlot);
    Task<string> GetDetailThumbnailAsync(string path, int sourceSlot);
    Task<string> GetThumbnailPathAsync(string photoPath);
}
