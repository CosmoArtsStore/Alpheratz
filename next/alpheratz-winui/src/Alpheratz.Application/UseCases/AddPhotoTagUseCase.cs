using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for associating a category/tag with a photo.
/// Follows Design Doc Section 8.3 / 828.
/// </summary>
public class AddPhotoTagUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public AddPhotoTagUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Attaches the specified tag to the photo.
    /// Automatically ensures the tag exists in the master list.
    /// </summary>
    public async Task ExecuteAsync(PhotoIdentity identity, TagName name)
    {
        if (identity == null) throw new ArgumentNullException(nameof(identity));
        if (name == null || string.IsNullOrWhiteSpace(name.Value)) throw new ArgumentException("Invalid tag name.");

        _logger.Info("TagUseCase", "AddTag", $"Adding tag '{name.Value}' to photo: {identity.Value}");

        try
        {
            // The repository handles the details of many-to-many association
            // and potential automatic master tag creation if configured.
            await _tagRepository.AddPhotoTagAsync(identity, name);
        }
        catch (Exception ex)
        {
            _logger.Error("TagUseCase", "AddTag", $"Failed to add tag '{name.Value}' to {identity.Value}", ex);
            throw;
        }
    }
}
