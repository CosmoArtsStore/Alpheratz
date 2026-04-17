using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.Entities;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for aggregating all metadata related to a specific photo.
/// Follows Design Doc Section 8.3 / 884.
/// </summary>
public class LoadPhotoDetailUseCase
{
    private readonly IPhotoReadRepository _photoRead;
    private readonly ILoggingFacade _logger;

    public LoadPhotoDetailUseCase(IPhotoReadRepository photoRead, ILoggingFacade logger)
    {
        _photoRead = photoRead;
        _logger = logger;
    }

    /// <summary>
    /// Retrieves the comprehensive PhotoDetail (Entity + Tags + Metadata).
    /// Includes structured logging and basic validation.
    /// </summary>
    public async Task<PhotoDetail?> ExecuteAsync(PhotoIdentity identity)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));

        _logger.Info("PhotoUseCase", "LoadDetail", $"Fetching composite detail for: {identity.Value}");

        try
        {
            var detail = await _photoRead.GetPhotoDetailAsync(identity);
            
            if (detail == null)
            {
                _logger.Warn("PhotoUseCase", "LoadDetail", $"Photo detail not found for: {identity.Value}");
                return null;
            }

            // Fetch candidates and return a new enriched detail object
            var candidates = await _photoRead.GetSimilarWorldCandidatesAsync(identity);
            
            return new PhotoDetail(detail.Photo, detail.Tags, candidates);
        }
        catch (Exception ex)
        {
            _logger.Error("PhotoUseCase", "LoadDetail", $"Database error while loading detail for {identity.Value}", ex);
            return null;
        }
    }
}
