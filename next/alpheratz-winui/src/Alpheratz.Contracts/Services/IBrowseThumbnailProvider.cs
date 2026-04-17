using Alpheratz.Domain.ValueObjects;

namespace Alpheratz.Contracts.Services;

public interface IBrowseThumbnailProvider
{
    Task<object> GetThumbnailAsync(PhotoIdentity identity);
}
