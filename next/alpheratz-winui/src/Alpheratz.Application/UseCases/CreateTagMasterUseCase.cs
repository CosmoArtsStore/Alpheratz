using Alpheratz.Contracts.Repositories;
using Alpheratz.Contracts.Infrastructure;
using Alpheratz.Domain.ValueObjects;
using System;
using System.Threading.Tasks;

namespace Alpheratz.Application.UseCases;

/// <summary>
/// Domain service for adding new categories to the global master dictionary.
/// Follows Design Doc Section 8.3 / 945.
/// </summary>
public class CreateTagMasterUseCase
{
    private readonly ITagRepository _tagRepository;
    private readonly ILoggingFacade _logger;

    public CreateTagMasterUseCase(ITagRepository tagRepository, ILoggingFacade logger)
    {
        _tagRepository = tagRepository;
        _logger = logger;
    }

    /// <summary>
    /// Creates a new entry in the TagMaster table.
    /// Includes uniqueness checks (handled by repository) and logging.
    /// </summary>
    public async Task ExecuteAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Tag name cannot be empty.");

        var tagName = new TagName(name.Trim());
        _logger.Info("TagMasterUseCase", "Create", $"Creating master tag: {tagName.Value}");

        try
        {
            await _tagRepository.CreateMasterTagAsync(tagName);
        }
        catch (Exception ex)
        {
            _logger.Error("TagMasterUseCase", "Create", $"Failed to create master tag '{tagName.Value}'.", ex);
            throw;
        }
    }
}
