using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for identifying and grouping redundant photos in the library.
/// Follows Design Doc Section 8.3 / 893.
/// </summary>
public class LoadDuplicateGroupsUseCase
{
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;

    public LoadDuplicateGroupsUseCase(IPhotoReadRepository photoRead, ILoggingFacade logger)
    {
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <summary>
    /// Executes the business logic to retrieve grouping of similar photos.
    /// </summary>
    public async Task<IEnumerable<DuplicateGroup>> ExecuteAsync()
    {
        _logger.Info("DuplicateUseCase", "Execute", "Searching for visual duplicates.");

        try
        {
            // Delegate high-performance query to the repository layer
            return await _photoRead.GetDuplicateGroupsAsync();
        }
        catch (Exception ex)
        {
            _logger.Error("DuplicateUseCase", "Execute", "Failed to load duplicate groups.", ex);
            return Array.Empty<DuplicateGroup>();
        }
    }
}
