using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for toggling the favorite status of a photo.
/// Follows Design Doc Section 8.3 / 817.
/// </summary>
public class UpdateFavoriteUseCase
{
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly ILoggingFacade _logger;

    public UpdateFavoriteUseCase(IPhotoMutationRepository photoMutation, ILoggingFacade logger)
    {
        _photoMutation = photoMutation;
        _logger = logger;
    }

    /// <summary>
    /// Updates the favorite status for the specified photo.
    /// Includes structured logging for auditing.
    /// </summary>
    public async Task ExecuteAsync(PhotoIdentity identity, bool isFavorite)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));

        _logger.Info("PhotoUseCase", "UpdateFavorite", $"Setting favorite to {isFavorite} for: {identity.Value}");

        try
        {
            await _photoMutation.UpdateFavoriteAsync(identity, isFavorite);
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoUseCase", "UpdateFavorite", $"Failed to update favorite for {identity.Value}", ex);
            throw;
        }
    }
}
