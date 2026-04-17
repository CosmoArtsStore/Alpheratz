using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for batch updating the favorite status of multiple photos.
/// Follows Design Doc Section 8.3 / 852.
/// </summary>
public class BulkFavoriteUseCase
{
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly ILoggingFacade _logger;

    public BulkFavoriteUseCase(IPhotoMutationRepository photoMutation, ILoggingFacade logger)
    {
        _photoMutation = photoMutation;
        _logger = logger;
    }

    /// <summary>
    /// Updates the favorite status for a collection of photos.
    /// </summary>
    public async Task ExecuteAsync(IEnumerable<PhotoIdentity> identities, bool isFavorite)
    {
        if (identities == null) throw new ArgumentNullException(nameof(identities));

        _logger.Info("BulkFavoriteUseCase", "Execute", $"Setting favorite to {isFavorite} for batch operation.");

        try
        {
            await _photoMutation.BulkUpdateFavoriteAsync(identities, isFavorite);
        }
        catch (Exception ex)
        {
            _logger.Error("BulkFavoriteUseCase", "Execute", "Failed to complete batch favorite update", ex);
            throw;
        }
    }
}
