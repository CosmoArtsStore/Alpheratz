using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain-centric service for applying multiple tags to multiple photos in bulk.
/// Follows Design Doc Section 8.3 / 891.
/// </summary>
public class BulkTagUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public BulkTagUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Adds a collection of tags to a collection of photos.
    /// Deduplicates tags before processing.
    /// </summary>
    public async Task ExecuteAsync(IEnumerable<PhotoIdentity> photos, IEnumerable<TagName> tags)
    {
        if (photos == null) throw new ArgumentNullException(nameof(photos));
        if (tags == null) throw new ArgumentNullException(nameof(tags));

        var uniqueTags = tags.Distinct().ToList();
        if (!uniqueTags.Any()) return;

        var photoList = photos.ToList();
        if (!photoList.Any()) return;

        _logger.Info("TagUseCase", "BulkTag", $"Applying {uniqueTags.Count} tags to {photoList.Count} photos.");

        try
        {
            await _tagRepository.BulkAddPhotoTagsAsync(photoList, uniqueTags);
        }
        catch (Exception ex)
        {
            _logger.Error("TagUseCase", "BulkTag", "Failed to complete bulk tagging operation.", ex);
            throw;
        }
    }
}
