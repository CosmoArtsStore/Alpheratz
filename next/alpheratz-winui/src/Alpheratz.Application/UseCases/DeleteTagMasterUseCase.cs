using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for removing categories from the global master dictionary.
/// Follows Design Doc Section 8.3 / 958.
/// </summary>
public class DeleteTagMasterUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public DeleteTagMasterUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Removes a tag from the master list. 
    /// Note: This does NOT automatically remove the tag from photos (unless handled by DB cascade).
    /// </summary>
    public async Task ExecuteAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) return;

        var tagName = new TagName(name);
        _logger.Warn("TagMasterUseCase", "Delete", $"Permanently deleting master tag: {tagName.Value}");

        try
        {
            await _tagRepository.DeleteTagMasterAsync(tagName);
        }
        catch (Exception ex)
        {
            _logger.Error("TagMasterUseCase", "Delete", $"Failed to delete master tag '{tagName.Value}'.", ex);
            throw;
        }
    }
}
