using Alpheratz.Contracts.Repositories;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.Queries;
using Alpheratz.Contracts.Infrastructure;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

public record GalleryPageResult(IReadOnlyList<Photo> Items, int TotalCount, int PageIndex, bool IsEmpty);

/// <summary>
/// Service for fetching a specific subset of photos for the gallery UI.
/// Follows Design Doc Section 8.3 / 759.
/// </summary>
public class LoadGalleryPageUseCase
{
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;

    public LoadGalleryPageUseCase(IPhotoReadRepository photoRead, ILoggingFacade logger)
    {
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <summary>
    /// Executes the paged fetch logic based on the UI query.
    /// </summary>
    /// <param name="query">The filter/sort criteria.</param>
    /// <param name="page">The 0-indexed page number.</param>
    /// <returns>A result containing photo items, total count, and layout info.</returns>
    public async Task<GalleryPageResult> ExecuteAsync(GalleryQuery query, int page = 0)
    {
        const int pageSize = 24; // Alpheratz standard page size as per design doc

        _logger.Info("GalleryUseCase", "Execute", $"Fetching gallery items. Page: {page}, Query: {query.SearchText}");

        try
        {
            var resultsEnumerable = await _photoRead.GetPhotosPageAsync(query, page, pageSize);
            var results = resultsEnumerable.ToList();
            var totalCount = await _photoRead.GetTotalCountAsync(query);

            return new GalleryPageResult(results, totalCount, page, results.Count == 0);
        }
        catch (Exception ex)
        {
            _logger.Error("GalleryUseCase", "Execute", "Database error while fetching gallery items.", ex);
            return new GalleryPageResult(Array.Empty<Photo>(), 0, page, true);
        }
    }
}
