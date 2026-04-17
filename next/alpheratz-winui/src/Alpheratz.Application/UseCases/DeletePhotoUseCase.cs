using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for permanent removal of a photo from both the file system and database.
/// Follows Design Doc Section 8.3 / 909.
/// </summary>
public class DeletePhotoUseCase
{
    private readonly IPhotoMutationRepository _photoMutation;
    private readonly ILoggingFacade _logger;

    public DeletePhotoUseCase(IPhotoMutationRepository photoMutation, ILoggingFacade logger)
    {
        _photoMutation = photoMutation;
        _logger = logger;
    }

    /// <summary>
    /// Executes the deletion logic. 
    /// Safety Note: This is an irreversible operation.
    /// </summary>
    public async Task ExecuteAsync(PhotoIdentity identity)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));

        _logger.Warn("PhotoUseCase", "Delete", $"DELETING photo from system: {identity.Value}");

        try
        {
            // 1. Delete from Database first (maintains logical consistency)
            await _photoMutation.DeletePhotoAsync(identity);

            // 2. Delete from File System
            if (File.Exists(identity.PhotoPath))
            {
                File.Delete(identity.PhotoPath);
                _logger.Info("PhotoUseCase", "Delete", $"Physical file deleted: {identity.PhotoPath}");
            }
            else
            {
                _logger.Warn("PhotoUseCase", "Delete", $"Physical file not found, but DB record removed: {identity.PhotoPath}");
            }
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoUseCase", "Delete", $"Failed to delete photo {identity.Value}", ex);
            throw;
        }
    }
}
