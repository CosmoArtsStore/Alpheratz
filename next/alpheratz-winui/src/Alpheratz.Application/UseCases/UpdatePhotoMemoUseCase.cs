using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for persisting user-provided notes on a photo.
/// Follows Design Doc Section 8.3 / 808.
/// </summary>
public class UpdatePhotoMemoUseCase
{
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly ILoggingFacade _logger;

    public UpdatePhotoMemoUseCase(IPhotoMutationRepository photoMutation, ILoggingFacade logger)
    {
        _photoMutation = photoMutation;
        _logger = logger;
    }

    /// <summary>
    /// Updates the memo for the identified photo.
    /// Includes validation and structured logging.
    /// </summary>
    public async Task ExecuteAsync(PhotoIdentity identity, string? memo)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));

        var cleanMemo = memo?.Trim() ?? string.Empty;
        
        _logger.Info("PhotoUseCase", "UpdateMemo", $"Updating memo for photo: {identity.Value}");

        try
        {
            await _photoMutation.UpdateMemoAsync(identity, cleanMemo);
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoUseCase", "UpdateMemo", $"Failed to update memo for {identity.Value}", ex);
            throw;
        }
    }
}
