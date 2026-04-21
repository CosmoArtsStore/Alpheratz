using System.Collections.Generic;
using System.Threading.Tasks;
using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;

namespace Alpheratz.Application.UseCases;

public class RefreshGalleryAfterScanUseCase
{
    private readonly LoadGalleryPageUseCase _loadGallery;

    public RefreshGalleryAfterScanUseCase(LoadGalleryPageUseCase loadGallery)
    {
        _loadGallery = loadGallery;
    }

    /// <summary>
    /// Logic to refresh the gallery state after a scan completes.
    /// Resets navigation to first page and fetches fresh data.
    /// </summary>
    public async Task<IEnumerable<Photo>> ExecuteAsync(Alpheratz.Domain.Queries.GalleryQuery query)
    {
        var result = await _loadGallery.ExecuteAsync(query, 0);
        return result.Items;
    }
}
