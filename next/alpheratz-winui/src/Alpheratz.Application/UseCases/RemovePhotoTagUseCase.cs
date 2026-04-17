using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for detaching a category/tag from a specific photo.
/// Follows Design Doc Section 8.3 / 842.
/// </summary>
public class RemovePhotoTagUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public RemovePhotoTagUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Removes the specified tag from the photo.
    /// Note: This only detaches the tag; it does not delete the tag from the master list.
    /// </summary>
    public async Task ExecuteAsync(PhotoIdentity identity, TagName name)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));
        if (name == null || string.IsNullOrWhiteSpace(name.Value)) return;

        _logger.Info("TagUseCase", "RemoveTag", $"Removing tag '{name.Value}' from photo: {identity.Value}");

        try
        {
            await _tagRepository.RemovePhotoTagAsync(identity, name);
        }
        catch (Exception ex)
        {
            _logger.Error("TagUseCase", "RemoveTag", $"Failed to remove tag '{name.Value}' from {identity.Value}", ex);
            throw;
        }
    }
}
